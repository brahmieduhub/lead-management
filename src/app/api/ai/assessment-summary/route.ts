import { NextResponse } from "next/server";
import { getSession, isCenterAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateAssessmentSummary } from "@/lib/assessmentAI";

export async function POST(req: Request) {
  const session = await getSession(req);
  const { assessmentId } = await req.json().catch(() => ({}));

  if (!assessmentId) {
    return NextResponse.json({ error: "assessmentId required" }, { status: 400 });
  }

  // Campus isolation
  if (isCenterAdmin(session)) {
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: { batch: true },
    });
    if (!assessment) return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
    if (session?.campusId && assessment.batch.campusId !== session.campusId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  try {
    const summary = await generateAssessmentSummary(assessmentId);
    return NextResponse.json({ summary });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to generate assessment summary" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const assessmentId = searchParams.get("assessmentId");
  if (!assessmentId) return NextResponse.json({ error: "assessmentId required" }, { status: 400 });

  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    select: { aiSummary: true, title: true, examDate: true },
  });
  if (!assessment) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ summary: assessment.aiSummary, title: assessment.title });
}