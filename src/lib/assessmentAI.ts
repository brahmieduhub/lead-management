import { prisma } from "./db";

export interface AssessmentAISummary {
  overallSummary: string;
  weakSubtopics: { subject: string; chapter: string; subtopic: string; accuracy: number }[];
  strongSubtopics: { subject: string; chapter: string; subtopic: string; accuracy: number }[];
  weeklyNarrative: string;
  recommendations: string[];
  model: string;
  fallbackUsed: boolean;
  generatedAt: string;
}

export async function buildAssessmentPayload(assessmentId: string) {
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    include: {
      batch: { include: { campus: true } },
      testResults: { select: { percentage: true, percentile: true, totalMarks: true } },
    },
  });
  if (!assessment) throw new Error("Assessment not found");

  // Class subtopic accuracy — aggregate from StudentSubtopicSummary
  const subtopicRows = await prisma.studentSubtopicSummary.findMany({
    where: { assessmentId },
    orderBy: [{ subject: "asc" }, { chapter: "asc" }, { subtopic: "asc" }],
  });

  const subtopicMap = new Map<string, { subject: string; chapter: string; subtopic: string; accuracies: number[] }>();
  for (const s of subtopicRows) {
    if (!s.chapter || !s.subtopic) continue;
    const key = `${s.subject}||${s.chapter}||${s.subtopic}`;
    const entry = subtopicMap.get(key) ?? { subject: s.subject, chapter: s.chapter, subtopic: s.subtopic, accuracies: [] };
    entry.accuracies.push(s.accuracy);
    subtopicMap.set(key, entry);
  }

  const classSubtopics = Array.from(subtopicMap.values())
    .map((g) => ({
      subject: g.subject,
      chapter: g.chapter,
      subtopic: g.subtopic,
      accuracy: Math.round((g.accuracies.reduce((a, b) => a + b, 0) / g.accuracies.length) * 10) / 10,
    }))
    .sort((a, b) => a.accuracy - b.accuracy);

  const weakSubtopics = classSubtopics.filter((s) => s.accuracy < 50).slice(0, 5);
  const strongSubtopics = classSubtopics.filter((s) => s.accuracy >= 70).slice(-3).reverse();

  // Overall class stats
  const n = assessment.testResults.length;
  const avgPct = n > 0 ? assessment.testResults.reduce((s, r) => s + r.percentage, 0) / n : 0;
  const avgPercentile = n > 0 ? assessment.testResults.reduce((s, r) => s + (r.percentile ?? 0), 0) / n : 0;

  // Previous assessment for comparison
  const prevAssessment = await prisma.assessment.findFirst({
    where: { batchId: assessment.batchId, examDate: { lt: assessment.examDate } },
    orderBy: { examDate: "desc" },
    include: { testResults: { select: { percentage: true } } },
  });
  const prevAvgPct =
    prevAssessment && prevAssessment.testResults.length > 0
      ? prevAssessment.testResults.reduce((s, r) => s + r.percentage, 0) / prevAssessment.testResults.length
      : null;

  return {
    assessmentTitle: assessment.title,
    batchName: assessment.batch.name,
    campusName: assessment.batch.campus.name,
    examDate: assessment.examDate.toISOString().slice(0, 10),
    totalStudents: n,
    avgPercentage: Math.round(avgPct * 10) / 10,
    avgPercentile: Math.round(avgPercentile * 10) / 10,
    prevAvgPercentage: prevAvgPct !== null ? Math.round(prevAvgPct * 10) / 10 : null,
    prevAssessmentTitle: prevAssessment?.title ?? null,
    weakSubtopics,
    strongSubtopics,
    hasSubtopicData: classSubtopics.length > 0,
  };
}

function buildAssessmentPrompt(payload: Awaited<ReturnType<typeof buildAssessmentPayload>>): string {
  const deltaStr =
    payload.prevAvgPercentage !== null
      ? `Previous test (${payload.prevAssessmentTitle}) avg: ${payload.prevAvgPercentage}%. Change: ${(payload.avgPercentage - payload.prevAvgPercentage).toFixed(1)}%.`
      : "This is the first recorded assessment.";

  return `You are an academic analytics assistant for JEE/NEET coaching institutes.
Analyze the following assessment data and provide a concise weekly report for faculty.

Assessment: ${payload.assessmentTitle}
Date: ${payload.examDate}
Center: ${payload.campusName} | Class: ${payload.batchName}
Students: ${payload.totalStudents} | Avg Score: ${payload.avgPercentage}% | Avg Percentile: ${payload.avgPercentile}
${deltaStr}

Class subtopic accuracy (lowest first):
${payload.weakSubtopics.map((s) => `- ${s.subject} / ${s.chapter} / ${s.subtopic}: ${s.accuracy}%`).join("\n") || "No subtopic data yet."}

Strongest subtopics:
${payload.strongSubtopics.map((s) => `- ${s.subject} / ${s.chapter} / ${s.subtopic}: ${s.accuracy}%`).join("\n") || "No subtopic data yet."}

Respond in this exact format:
SUMMARY: <2-3 sentence overview of class performance this week>
WEEKLY_CHANGE: <1 sentence on what changed vs last week>
RECOMMENDATIONS:
1. <action item for faculty>
2. <action item for faculty>
3. <action item for faculty>`;
}

function buildFallbackSummary(
  payload: Awaited<ReturnType<typeof buildAssessmentPayload>>
): AssessmentAISummary {
  const delta =
    payload.prevAvgPercentage !== null ? payload.avgPercentage - payload.prevAvgPercentage : null;
  const deltaStr =
    delta !== null ? `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}% vs last assessment.` : "";

  const overallSummary = `${payload.batchName} at ${payload.campusName} scored an average of ${payload.avgPercentage}% on ${payload.assessmentTitle}. ${deltaStr} ${
    payload.weakSubtopics.length > 0
      ? `Top areas of concern: ${payload.weakSubtopics
          .slice(0, 2)
          .map((s) => s.subtopic)
          .join(", ")}.`
      : "No subtopic data available yet."
  }`;

  const weeklyNarrative =
    delta !== null
      ? `Class average ${delta >= 0 ? "improved" : "declined"} by ${Math.abs(delta).toFixed(1)}% compared to ${payload.prevAssessmentTitle ?? "the previous test"}.`
      : "First assessment recorded — baseline established.";

  const recommendations =
    payload.weakSubtopics.length > 0
      ? [
          `Schedule a remedial session on ${payload.weakSubtopics[0]?.subtopic ?? "the weakest subtopic"} (${payload.weakSubtopics[0]?.accuracy ?? 0}% class accuracy).`,
          `Assign targeted practice sets on ${payload.weakSubtopics
            .slice(0, 3)
            .map((s) => s.subtopic)
            .join(", ")}.`,
          "Review question-level accuracy to identify the most commonly missed questions.",
        ]
      : [
          "Upload a question mapping CSV to enable subtopic-level analysis.",
          "Upload the QuestionWiseAnalysis XLS to see per-student subtopic weaknesses.",
          "Review subject-level scores to identify class-wide improvement areas.",
        ];

  return {
    overallSummary,
    weakSubtopics: payload.weakSubtopics,
    strongSubtopics: payload.strongSubtopics,
    weeklyNarrative,
    recommendations,
    model: "template-fallback",
    fallbackUsed: true,
    generatedAt: new Date().toISOString(),
  };
}

export async function generateAssessmentSummary(assessmentId: string): Promise<AssessmentAISummary> {
  const payload = await buildAssessmentPayload(assessmentId);
  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey) {
    try {
      const { GoogleGenerativeAI } = await import("@google/generative-ai");
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = buildAssessmentPrompt(payload);
      const result = await model.generateContent(prompt);
      const text = result.response.text();

      const overallSummary =
        text.match(/SUMMARY:\s*(.+)/i)?.[1]?.trim() ?? text.split("\n")[0] ?? "Summary not generated.";
      const weeklyNarrative = text.match(/WEEKLY_CHANGE:\s*(.+)/i)?.[1]?.trim() ?? "";
      const recMatch = text.match(/RECOMMENDATIONS:[\s\S]*/i)?.[0] ?? "";
      const recommendations = recMatch
        .split("\n")
        .filter((l) => /^\d+\./.test(l.trim()))
        .map((l) => l.replace(/^\d+\.\s*/, "").trim())
        .filter(Boolean)
        .slice(0, 3);

      const summary: AssessmentAISummary = {
        overallSummary,
        weeklyNarrative,
        weakSubtopics: payload.weakSubtopics,
        strongSubtopics: payload.strongSubtopics,
        recommendations:
          recommendations.length > 0 ? recommendations : buildFallbackSummary(payload).recommendations,
        model: "gemini-1.5-flash",
        fallbackUsed: false,
        generatedAt: new Date().toISOString(),
      };

      await prisma.assessment.update({ where: { id: assessmentId }, data: { aiSummary: summary as object } });
      return summary;
    } catch (e) {
      console.error("Gemini assessment summary error, using fallback:", e);
    }
  }

  const fb = buildFallbackSummary(payload);
  await prisma.assessment.update({ where: { id: assessmentId }, data: { aiSummary: fb as object } });
  return fb;
}