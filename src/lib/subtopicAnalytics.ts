import { prisma } from "@/lib/db";

export interface SubtopicSummary {
  subject: string;
  chapter: string;
  subtopic: string;
  totalQs: number;
  correctQs: number;
  wrongQs: number;
  unattemptedQs: number;
  accuracy: number;
  isWeak: boolean;
}

export interface ClassSubtopicRow {
  subject: string;
  chapter: string;
  subtopic: string;
  avgAccuracy: number;
  studentsWeak: number;
  totalStudents: number;
}

/**
 * Returns subtopic accuracy for a student on a given test result.
 * Marks subtopics as weak where accuracy < threshold (default 50%).
 */
export async function getStudentSubtopicSummary(
  testResultId: string,
  weakThreshold = 50
): Promise<SubtopicSummary[]> {
  const rows = await prisma.studentSubtopicSummary.findMany({
    where: { testResultId },
    orderBy: [{ subject: "asc" }, { chapter: "asc" }, { subtopic: "asc" }],
  });

  return rows.map((r) => ({
    subject: r.subject,
    chapter: r.chapter,
    subtopic: r.subtopic,
    totalQs: r.totalQs,
    correctQs: r.correctQs,
    wrongQs: r.wrongQs,
    unattemptedQs: r.unattemptedQs,
    accuracy: r.accuracy,
    isWeak: r.accuracy < weakThreshold,
  }));
}

/**
 * Returns only the weak subtopics for a student on a given test result.
 */
export async function getWeakSubtopics(
  testResultId: string,
  weakThreshold = 50
): Promise<SubtopicSummary[]> {
  const all = await getStudentSubtopicSummary(testResultId, weakThreshold);
  return all.filter((r) => r.isWeak);
}

/**
 * Returns aggregated subtopic accuracy across ALL test results for a student.
 */
export async function getStudentSubtopicTrend(studentId: string) {
  const results = await prisma.testResult.findMany({
    where: { studentId },
    select: { id: true, assessmentId: true, assessment: { select: { title: true, examDate: true } } },
    orderBy: { assessment: { examDate: "asc" } },
  });

  const trend: Record<
    string,
    { subject: string; chapter: string; subtopic: string; history: { assessmentTitle: string; examDate: Date; accuracy: number }[] }
  > = {};

  for (const result of results) {
    const summaries = await prisma.studentSubtopicSummary.findMany({
      where: { testResultId: result.id },
    });
    for (const s of summaries) {
      const key = `${s.subject}||${s.chapter}||${s.subtopic}`;
      if (!trend[key]) {
        trend[key] = { subject: s.subject, chapter: s.chapter, subtopic: s.subtopic, history: [] };
      }
      trend[key].history.push({
        assessmentTitle: result.assessment.title,
        examDate: result.assessment.examDate,
        accuracy: s.accuracy,
      });
    }
  }

  return Object.values(trend);
}

/**
 * Returns class-level subtopic accuracy for an assessment.
 */
export async function getClassSubtopicAccuracy(
  assessmentId: string,
  weakThreshold = 50
): Promise<ClassSubtopicRow[]> {
  const summaries = await prisma.studentSubtopicSummary.findMany({
    where: { assessmentId },
    orderBy: [{ subject: "asc" }, { chapter: "asc" }, { subtopic: "asc" }],
  });

  const grouped: Record<string, { subject: string; chapter: string; subtopic: string; accuracies: number[] }> = {};
  for (const s of summaries) {
    const key = `${s.subject}||${s.chapter}||${s.subtopic}`;
    if (!grouped[key]) grouped[key] = { subject: s.subject, chapter: s.chapter, subtopic: s.subtopic, accuracies: [] };
    grouped[key].accuracies.push(s.accuracy);
  }

  return Object.values(grouped).map((g) => {
    const avgAccuracy = g.accuracies.reduce((a, b) => a + b, 0) / g.accuracies.length;
    const studentsWeak = g.accuracies.filter((a) => a < weakThreshold).length;
    return {
      subject: g.subject,
      chapter: g.chapter,
      subtopic: g.subtopic,
      avgAccuracy: Math.round(avgAccuracy * 10) / 10,
      studentsWeak,
      totalStudents: g.accuracies.length,
    };
  });
}

/**
 * Computes and upserts StudentSubtopicSummary rows for a given testResultId.
 * Called after importing StudentQuestionResponse rows for a student.
 */
export async function computeSubtopicSummary(
  testResultId: string,
  assessmentId: string
): Promise<void> {
  const responses = await prisma.studentQuestionResponse.findMany({
    where: { testResultId },
    include: { assessmentQuestion: true },
  });

  type Bucket = { totalQs: number; correctQs: number; wrongQs: number; unattemptedQs: number };
  const buckets: Record<string, Bucket> = {};

  for (const r of responses) {
    const q = r.assessmentQuestion;
    if (!q.chapter || !q.subtopic) continue;
    const key = `${q.subject}||${q.chapter}||${q.subtopic}`;
    if (!buckets[key]) buckets[key] = { totalQs: 0, correctQs: 0, wrongQs: 0, unattemptedQs: 0 };
    buckets[key].totalQs++;
    if (r.result === "CORRECT") buckets[key].correctQs++;
    else if (r.result === "WRONG") buckets[key].wrongQs++;
    else buckets[key].unattemptedQs++;
  }

  for (const [key, bucket] of Object.entries(buckets)) {
    const [subject, chapter, subtopic] = key.split("||");
    const accuracy =
      bucket.totalQs > 0 ? Math.round((bucket.correctQs / bucket.totalQs) * 1000) / 10 : 0;

    await prisma.studentSubtopicSummary.upsert({
      where: { testResultId_subject_chapter_subtopic: { testResultId, subject, chapter, subtopic } },
      update: { totalQs: bucket.totalQs, correctQs: bucket.correctQs, wrongQs: bucket.wrongQs, unattemptedQs: bucket.unattemptedQs, accuracy },
      create: { testResultId, assessmentId, subject, chapter, subtopic, totalQs: bucket.totalQs, correctQs: bucket.correctQs, wrongQs: bucket.wrongQs, unattemptedQs: bucket.unattemptedQs, accuracy },
    });
  }
}
