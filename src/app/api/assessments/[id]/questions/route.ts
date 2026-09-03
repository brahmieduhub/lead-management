import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { normalizeSubjectName } from "@/lib/subtopicTaxonomy";
import { recalculateSubtopicsForAssessment } from "@/lib/subtopicAnalytics";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const assessment = await prisma.assessment.findUnique({
    where: { id: params.id },
    include: {
      batch: { include: { campus: true } },
      assessmentQuestions: { orderBy: { questionNo: "asc" } },
    },
  });

  if (!assessment) {
    return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
  }

  return NextResponse.json({
    assessment: {
      id: assessment.id,
      title: assessment.title,
      stream: assessment.batch.stream,
      batchName: assessment.batch.name,
      campusName: assessment.batch.campus.name,
    },
    questions: assessment.assessmentQuestions,
  });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const assessment = await prisma.assessment.findUnique({
    where: { id: params.id },
  });

  if (!assessment) {
    return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
  }

  const { questions = [] } = await req.json().catch(() => ({}));

  if (!Array.isArray(questions) || questions.length === 0) {
    return NextResponse.json({ error: "Questions array is required" }, { status: 400 });
  }

  try {
    let upsertedCount = 0;

    for (const q of questions) {
      if (!q.questionNo) continue;

      const normSubject = normalizeSubjectName(q.subject || "Physics");
      const qNo = parseInt(String(q.questionNo), 10);

      await prisma.assessmentQuestion.upsert({
        where: {
          assessmentId_questionNo: {
            assessmentId: assessment.id,
            questionNo: qNo,
          },
        },
        update: {
          subject: normSubject,
          chapter: q.chapter || null,
          subtopic: q.subtopic || null,
          correctKey: q.correctKey ? String(q.correctKey).toUpperCase().trim() : null,
          maxMarks: typeof q.maxMarks === "number" ? q.maxMarks : 1,
        },
        create: {
          assessmentId: assessment.id,
          questionNo: qNo,
          subject: normSubject,
          chapter: q.chapter || null,
          subtopic: q.subtopic || null,
          correctKey: q.correctKey ? String(q.correctKey).toUpperCase().trim() : null,
          maxMarks: typeof q.maxMarks === "number" ? q.maxMarks : 1,
        },
      });
      upsertedCount++;
    }

    // Recalculate subtopic performance summaries for all students in this assessment
    try {
      await recalculateSubtopicsForAssessment(assessment.id);
    } catch (recalcErr) {
      console.warn("Subtopic recalculation warning:", recalcErr);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully mapped and updated ${upsertedCount} questions for "${assessment.title}".`,
      upsertedCount,
    });
  } catch (error: any) {
    console.error("Save questions error:", error);
    return NextResponse.json({ error: error.message || "Failed to save questions" }, { status: 500 });
  }
}
