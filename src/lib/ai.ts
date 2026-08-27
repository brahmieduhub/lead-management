import { prisma } from "./db";

/** Build analytics payload for a student, reused by Gemini and fallback. */
export async function buildStudentPayload(studentId: string) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      batch: true,
      testResults: {
        include: { assessment: true, subjectScores: true },
        orderBy: { assessment: { examDate: "asc" } },
      },
      performanceTrends: {
        include: { assessment: true },
        orderBy: { assessment: { examDate: "asc" } },
      },
    },
  });
  if (!student) throw new Error("Student not found");

  const results = student.testResults;
  const last3 = results.slice(-3);

  interface SubjectStat {
    totalMarks: number;
    count: number;
    percentiles: number[];
  }
  const subjectMap = new Map<string, SubjectStat>();

  for (const r of results) {
    for (const s of r.subjectScores) {
      const entry = subjectMap.get(s.subject) ?? { totalMarks: 0, count: 0, percentiles: [] };
      entry.totalMarks += s.marks;
      entry.count++;
      if (s.percentile != null) entry.percentiles.push(s.percentile);
      subjectMap.set(s.subject, entry);
    }
  }

  // Convert Map to array without spread of MapIterator
  const subjectArray = Array.from(subjectMap.entries());
  const subjectStats = subjectArray.map(([subject, v]) => {
    const avgMarks = v.totalMarks / v.count;
    const avgPercentile = v.percentiles.length
      ? v.percentiles.reduce((a, b) => a + b, 0) / v.percentiles.length
      : 0;
    // Trend per subject: compare last result vs first in window
    const subs = results.flatMap((r) => r.subjectScores).filter((x) => x.subject === subject);
    const trend =
      subs.length >= 2 && subs[0].marks !== 0
        ? Number((((subs[subs.length - 1].marks - subs[0].marks) / subs[0].marks) * 100).toFixed(2))
        : 0;
    return {
      subject,
      avgMarks: Number(avgMarks.toFixed(1)),
      avgPercentile: Number(avgPercentile.toFixed(2)),
      trend,
    };
  });

  subjectStats.sort((a, b) => a.avgPercentile - b.avgPercentile);
  const weakSubjects = subjectStats.slice(0, 2).map((s) => s.subject);
  const strongSubjects = subjectStats.slice(-2).reverse().map((s) => s.subject);

  // ── Subtopic trend across all assessments ──────────────────────────────
  // Gather subtopic summaries for the last 3 results that have subtopic data
  const subtopicHistory: {
    subject: string;
    chapter: string;
    subtopic: string;
    history: { assessmentTitle: string; accuracy: number }[];
  }[] = [];

  const resultsWithSubtopics = await prisma.testResult.findMany({
    where: { studentId: student.id },
    orderBy: { assessment: { examDate: "asc" } },
    include: {
      assessment: { select: { title: true } },
      subtopicSummaries: true,
    },
  });

  const subtopicMap = new Map<string, typeof subtopicHistory[0]>();
  for (const r of resultsWithSubtopics) {
    for (const s of r.subtopicSummaries) {
      if (!s.chapter || !s.subtopic) continue;
      const key = `${s.subject}||${s.chapter}||${s.subtopic}`;
      if (!subtopicMap.has(key)) {
        subtopicMap.set(key, { subject: s.subject, chapter: s.chapter, subtopic: s.subtopic, history: [] });
      }
      subtopicMap.get(key)!.history.push({ assessmentTitle: r.assessment.title, accuracy: s.accuracy });
    }
  }

  // Persistent weak subtopics: weak (< 50%) in last 2+ assessments
  const persistentWeakSubtopics = Array.from(subtopicMap.values())
    .filter(st => {
      const last2 = st.history.slice(-2);
      return last2.length >= 2 && last2.every(h => h.accuracy < 50);
    })
    .map(st => ({
      subject: st.subject,
      chapter: st.chapter,
      subtopic: st.subtopic,
      latestAccuracy: st.history[st.history.length - 1]?.accuracy ?? 0,
    }))
    .sort((a, b) => a.latestAccuracy - b.latestAccuracy)
    .slice(0, 5);

  subtopicHistory.push(...Array.from(subtopicMap.values()).slice(0, 20));

  return {
    student: {
      id: student.id,
      name: student.name,
      rollNo: student.rollNo,
      batch: student.batch.name,
    },
    last3Results: last3.map((r) => ({
      assessment: r.assessment.title,
      date: r.assessment.examDate.toISOString().slice(0, 10),
      percentage: r.percentage,
      percentile: r.percentile,
      zScore: r.zScore,
    })),
    subjectBreakdown: {
      strongSubjects,
      weakSubjects,
      subjectStats,
    },
    latestTrend: student.performanceTrends[student.performanceTrends.length - 1] ?? null,
    subtopicInsights: {
      persistentWeakSubtopics,
      hasSubtopicData: subtopicMap.size > 0,
    },
  };
}

export type StudentPayload = Awaited<ReturnType<typeof buildStudentPayload>>;

/** Build a structured prompt for Gemini — now subtopic-aware. */
export function buildPrompt(payload: StudentPayload): string {
  const subtopicSection = payload.subtopicInsights?.hasSubtopicData
    ? `\nPersistent Weak Subtopics (weak in 2+ consecutive tests):\n${
        payload.subtopicInsights.persistentWeakSubtopics.length > 0
          ? payload.subtopicInsights.persistentWeakSubtopics
              .map((s) => `- ${s.subject} / ${s.chapter} / ${s.subtopic}: ${s.latestAccuracy}% accuracy`)
              .join("\n")
          : "None identified yet."
      }`
    : "";

  return `You are an academic coach for JEE/NEET students. Based on the student's performance data, write:
1) A 2-3 sentence diagnostic summary mentioning specific weak subtopics if available.
2) Strong subjects (list).
3) Weak subjects (list).
4) An actionable 7-day revision plan (day by day). If subtopic data is available, reference specific subtopics by name (e.g. "Practice 20 MCQs on Quadratic Equations"). Otherwise use subject-level guidance.

Student Data:
${JSON.stringify(payload, null, 2)}
${subtopicSection}

Return plain text in this format:
SUMMARY: ...
STRONG: subject1, subject2
WEAK: subject1, subject2
REVISION_PLAN:
Day 1: ...
Day 2: ...
...`;
}

/** Deterministic fallback when no API key / API failure. */
export function generateFallbackReport(payload: StudentPayload): {
  summary: string;
  strongSubjects: string[];
  weakSubjects: string[];
  revisionPlan: string;
  fallbackUsed: boolean;
} {
  const { student, last3Results, subjectBreakdown, subtopicInsights } = payload;
  const last = last3Results[last3Results.length - 1];
  const prev = last3Results.length >= 2 ? last3Results[last3Results.length - 2] : null;

  let delta = 0;
  if (prev && last?.percentile != null && prev.percentile != null) {
    delta = Number((last.percentile - prev.percentile).toFixed(1));
  }
  const trendWord = delta > 5 ? "improving" : delta < -5 ? "declining" : "stable";
  const pct = last?.percentage ?? 0;

  const persistentWeak = subtopicInsights?.persistentWeakSubtopics ?? [];
  const subtopicStr = persistentWeak.length > 0
    ? ` Persistent weak subtopics: ${persistentWeak.slice(0, 3).map((s) => s.subtopic).join(", ")}.`
    : "";

  const summary =
    `${student.name} (${student.rollNo}) is currently performing at ${pct.toFixed(1)}% with a percentile of ` +
    `${last?.percentile?.toFixed(1) ?? "N/A"}. Performance trajectory is ${trendWord} ` +
    `(${delta >= 0 ? "+" : ""}${delta} percentile pts).${subtopicStr}`;

  const weak = subjectBreakdown.weakSubjects;
  const strong = subjectBreakdown.strongSubjects;

  // If we have subtopic data, make the revision plan subtopic-specific
  const day1 = persistentWeak[0]
    ? `Day 1: Focused practice on ${persistentWeak[0].subtopic} (${persistentWeak[0].subject}) — 30 MCQs + theory review.`
    : `Day 1: Revise core theory in ${weak[0] ?? "weak subject"} (2 hrs), practice 20 MCQs.`;
  const day2 = persistentWeak[1]
    ? `Day 2: Targeted drill on ${persistentWeak[1].subtopic} (${persistentWeak[1].subject}) — 20 MCQs.`
    : `Day 2: ${weak[1] ? `${weak[1]} conceptual clarity + 20 MCQs.` : "Re-attempt previous weak mock sections."}`;
  const day5 = persistentWeak[0]
    ? `Day 5: Revisit ${persistentWeak[0].subtopic} — formula sheet + 20 speed MCQs.`
    : `Day 5: Revisit ${weak[0] ?? "weak subject"} — formula sheet + speed drills.`;

  const revisionPlan = [
    day1,
    day2,
    `Day 3: Full syllabus mixed quiz (60 Qs) covering ${weak.join(", ") || "weak topics"}.`,
    `Day 4: Strengthen ${strong[0] ?? "strong subject"} — advanced problems.`,
    day5,
    `Day 6: Full mock (timed, 180 min) + error log review.`,
    `Day 7: Rest + light revision + analysis of error log; set next week targets.`,
  ].join("\n");

  return {
    summary,
    strongSubjects: strong,
    weakSubjects: weak,
    revisionPlan,
    fallbackUsed: true,
  };
}