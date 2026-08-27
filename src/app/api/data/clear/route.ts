import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hash } from "bcryptjs";
import { getSession, isSuperAdmin, isReadOnly } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = await getSession(req);

    if (isReadOnly(session)) {
      return NextResponse.json(
        { error: "Forbidden. Read-only accounts cannot delete or clear data." },
        { status: 403 }
      );
    }

    const isSuper = isSuperAdmin(session);
    const userCampusId = session?.campusId;
    const body = await req.json().catch(() => ({}));
    const scope = body.scope || "student_data"; // "student_data" | "full_reset"

    if (userCampusId && !isSuper) {
      // Center Admin: can only delete records belonging to their center
      const campusBatches = await prisma.batch.findMany({
        where: { campusId: userCampusId },
        select: { id: true },
      });
      const batchIds = campusBatches.map((b) => b.id);

      const campusStudents = await prisma.student.findMany({
        where: { batchId: { in: batchIds } },
        select: { id: true },
      });
      const studentIds = campusStudents.map((s) => s.id);

      const campusAssessments = await prisma.assessment.findMany({
        where: { batchId: { in: batchIds } },
        select: { id: true },
      });
      const assessmentIds = campusAssessments.map((a) => a.id);

      await prisma.diagnosticReport.deleteMany({ where: { studentId: { in: studentIds } } });
      await prisma.campusRankSummary.deleteMany({ where: { campusId: userCampusId } });
      await prisma.performanceTrend.deleteMany({ where: { studentId: { in: studentIds } } });
      await prisma.subjectScore.deleteMany({ where: { testResult: { studentId: { in: studentIds } } } });
      await prisma.testResult.deleteMany({ where: { studentId: { in: studentIds } } });
      await prisma.assessmentSubjectDifficulty.deleteMany({ where: { assessmentId: { in: assessmentIds } } });
      await prisma.assessment.deleteMany({ where: { id: { in: assessmentIds } } });
      await prisma.student.deleteMany({ where: { id: { in: studentIds } } });

      return NextResponse.json({
        success: true,
        message: `All student records and assessment data for your center have been cleared.`,
      });
    }

    // Super Admin: Global clear
    await prisma.diagnosticReport.deleteMany();
    await prisma.campusRankSummary.deleteMany();
    await prisma.performanceTrend.deleteMany();
    await prisma.subjectScore.deleteMany();
    await prisma.testResult.deleteMany();
    await prisma.assessmentSubjectDifficulty.deleteMany();
    await prisma.assessment.deleteMany();
    await prisma.student.deleteMany();

    if (scope === "full_reset" && isSuper) {
      await prisma.batch.deleteMany();
      await prisma.user.deleteMany();
      await prisma.campus.deleteMany();

      const campus = await prisma.campus.create({
        data: {
          name: "Main Campus (Hyderabad)",
          city: "Hyderabad",
          state: "Telangana",
        },
      });

      const passwordHash = await hash("password123", 10);
      await prisma.user.create({
        data: {
          email: "superadmin@eduhub.com",
          name: "Super Admin",
          passwordHash,
          role: "ADMIN",
          campusId: null,
        },
      });

      await prisma.batch.createMany({
        data: [
          {
            name: "JEE Mains 2026",
            stream: "JEE",
            sessionYear: "2025-26",
            campusId: campus.id,
          },
          {
            name: "JEE Advanced 2026",
            stream: "JEE",
            sessionYear: "2025-26",
            campusId: campus.id,
          },
          {
            name: "NEET 2026",
            stream: "NEET",
            sessionYear: "2025-26",
            campusId: campus.id,
          },
        ],
      });
    }

    return NextResponse.json({
      success: true,
      message:
        scope === "full_reset"
          ? "All database records have been reset to clean default setup."
          : "All student records, test results, assessments, and trends have been cleared.",
    });
  } catch (e) {
    console.error("Failed to clear data:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to clear data" },
      { status: 500 }
    );
  }
}
