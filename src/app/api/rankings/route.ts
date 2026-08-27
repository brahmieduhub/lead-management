import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, isSuperAdmin, isCenterAdmin, getCampusScope } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await getSession(req);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (isSuperAdmin(session)) {
    const rankings = await prisma.campusRankSummary.findMany({
      include: {
        assessment: {
          include: {
            batch: {
              include: {
                campus: true,
              },
            },
          },
        },
        campus: true,
      },
      orderBy: { assessment: { examDate: "desc" } },
      take: 20,
    });

    const transformed = rankings.map((cr: any) => ({
      assessmentId: cr.assessmentId,
      assessmentTitle: cr.assessment.title,
      examDate: cr.assessment.examDate,
      campusName: (cr.campus as any)?.name,
      top15: ((cr.top15Json as any) || []).map((s: any) => ({
        name: s.name,
        percentile: s.percentile,
        totalMarks: s.totalMarks,
        campusRank: s.rank,
        overallRank: s.overallRank || s.rank,
      })),
      campusId: cr.campusId,
      generatedAt: cr.generatedAt,
    }));

    return NextResponse.json({ rankings: transformed });
  }

  if (isCenterAdmin(session)) {
    const scope = getCampusScope(session);
    if (!scope?.campusId) {
      return NextResponse.json({ error: "Center admin has no campus scope" }, { status: 403 });
    }

    const rankings = await prisma.campusRankSummary.findMany({
      where: { campusId: scope.campusId },
      include: {
        assessment: {
          include: {
            batch: {
              include: {
                campus: true,
              },
            },
          },
        },
      },
      orderBy: { assessment: { examDate: "desc" } },
      take: 20,
    });

    const transformed = rankings.map((cr: any) => ({
      assessmentId: cr.assessmentId,
      assessmentTitle: cr.assessment.title,
      examDate: cr.assessment.examDate,
      campusName: (cr.campus as any)?.name,
      top15: ((cr.top15Json as any) || []).map((s: any) => ({
        name: s.name,
        percentile: s.percentile,
        totalMarks: s.totalMarks,
        campusRank: s.rank,
        overallRank: s.overallRank || s.rank,
      })),
      campusId: cr.campusId,
      generatedAt: cr.generatedAt,
    }));

    return NextResponse.json({ rankings: transformed });
  }

  return NextResponse.json({ rankings: [] });
}

export async function POST(req: Request) {
  const session = await getSession(req);

  if (!isSuperAdmin(session) && !isCenterAdmin(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { assessmentId } = body;

    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: { batch: { include: { campus: true } } },
    });

    if (!assessment) {
      return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
    }

    const campusId = assessment.batch.campusId;

    const top15Results = await prisma.testResult.findMany({
      where: { assessmentId },
      orderBy: { percentile: "desc" },
      take: 15,
      include: { student: true },
    });

    const top15Json = top15Results.map((r: any) => ({
      studentId: r.studentId,
      name: r.student.name,
      percentile: r.percentile,
      totalMarks: r.totalMarks,
      rank: r.campusRank,
    }));

    await prisma.campusRankSummary.upsert({
      where: {
        assessmentId_campusId: {
          assessmentId,
          campusId,
        },
      },
      update: { top15Json },
      create: {
        assessmentId,
        campusId,
        top15Json,
      },
    });

    return NextResponse.json({ success: true, assessmentId });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to generate rankings" },
      { status: 500 }
    );
  }
}