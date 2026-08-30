import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hash } from "bcryptjs";
import { ExamType, Role } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    console.log("Seeding Student Management & Diagnostics database...");

    // 1. Campuses
    const campusHyd = await prisma.campus.upsert({
      where: { id: "hyd-main" },
      update: { name: "Hyderabad - Madhapur Center" },
      create: { id: "hyd-main", name: "Hyderabad - Madhapur Center", city: "Hyderabad", state: "Telangana" },
    });

    const campusDelhi = await prisma.campus.upsert({
      where: { id: "delhi-ncr" },
      update: { name: "Delhi - South Extension Center" },
      create: { id: "delhi-ncr", name: "Delhi - South Extension Center", city: "Delhi", state: "Delhi" },
    });

    // 2. Staff & Faculty Accounts
    const passwordHash = await hash("password123", 10);

    await prisma.user.upsert({
      where: { email: "admin@brahmieduhub.in" },
      update: { passwordHash, role: Role.ADMIN },
      create: {
        email: "admin@brahmieduhub.in",
        name: "Academic Director",
        passwordHash,
        role: Role.ADMIN,
        campusId: null,
      },
    });

    await prisma.user.upsert({
      where: { email: "superadmin@eduhub.com" },
      update: { passwordHash, role: Role.ADMIN },
      create: {
        email: "superadmin@eduhub.com",
        name: "Super Administrator",
        passwordHash,
        role: Role.ADMIN,
        campusId: null,
      },
    });

    await prisma.user.upsert({
      where: { email: "faculty@brahmieduhub.in" },
      update: { passwordHash, role: Role.FACULTY },
      create: {
        email: "faculty@brahmieduhub.in",
        name: "Dr. Ramesh (Physics Faculty)",
        passwordHash,
        role: Role.FACULTY,
        campusId: campusHyd.id,
      },
    });

    // 3. Batches
    let batchNeet = await prisma.batch.findFirst({ where: { name: "NEET Elite 2026", campusId: campusHyd.id } });
    if (!batchNeet) {
      batchNeet = await prisma.batch.create({
        data: {
          name: "NEET Elite 2026",
          stream: ExamType.NEET,
          sessionYear: "2025-26",
          campusId: campusHyd.id,
        },
      });
    }

    let batchJee = await prisma.batch.findFirst({ where: { name: "JEE Mains 2026", campusId: campusDelhi.id } });
    if (!batchJee) {
      batchJee = await prisma.batch.create({
        data: {
          name: "JEE Mains 2026",
          stream: ExamType.JEE,
          sessionYear: "2025-26",
          campusId: campusDelhi.id,
        },
      });
    }

    // 4. Students
    const studentProfiles = [
      { rollNo: "NEET-36104", name: "Aarav Sharma", phone: "9876543210", batchId: batchNeet.id },
      { rollNo: "NEET-36105", name: "Ananya Verma", phone: "9876543211", batchId: batchNeet.id },
      { rollNo: "NEET-36106", name: "Rahul Gupta", phone: "9876543212", batchId: batchNeet.id },
      { rollNo: "NEET-36107", name: "Diya Pillai", phone: "9876543213", batchId: batchNeet.id },
      { rollNo: "NEET-36108", name: "Kavya Reddy", phone: "9876543214", batchId: batchNeet.id },
    ];

    const createdStudents: any[] = [];
    for (const s of studentProfiles) {
      const student = await prisma.student.upsert({
        where: { rollNo: s.rollNo },
        update: { name: s.name, phone: s.phone },
        create: s,
      });
      createdStudents.push(student);
    }

    // 5. Sample Mock Assessment & Test Results
    let assessment = await prisma.assessment.findFirst({ where: { title: "NEET Grand Mock Test - 01" } });
    if (!assessment) {
      assessment = await prisma.assessment.create({
        data: {
          title: "NEET Grand Mock Test - 01",
          stream: ExamType.NEET,
          batchId: batchNeet.id,
          campusId: campusHyd.id,
          totalMarks: 720,
          examDate: new Date(),
        },
      });
    }

    // Add Test Results & Subject Scores for students
    const scores = [
      { studentId: createdStudents[0].id, total: 615, pct: 85.4, rank: 1, phy: 155, che: 160, bot: 150, zoo: 150 },
      { studentId: createdStudents[1].id, total: 580, pct: 80.5, rank: 2, phy: 140, che: 150, bot: 145, zoo: 145 },
      { studentId: createdStudents[2].id, total: 530, pct: 73.6, rank: 3, phy: 125, che: 135, bot: 135, zoo: 135 },
      { studentId: createdStudents[3].id, total: 490, pct: 68.0, rank: 4, phy: 110, che: 125, bot: 130, zoo: 125 },
      { studentId: createdStudents[4].id, total: 440, pct: 61.1, rank: 5, phy: 95,  che: 115, bot: 115, zoo: 115 },
    ];

    for (const sc of scores) {
      const tr = await prisma.testResult.upsert({
        where: { studentId_assessmentId: { studentId: sc.studentId, assessmentId: assessment.id } },
        update: { totalMarks: sc.total, percentage: sc.pct, campusRank: sc.rank, batchRank: sc.rank },
        create: {
          studentId: sc.studentId,
          assessmentId: assessment.id,
          totalMarks: sc.total,
          percentage: sc.pct,
          campusRank: sc.rank,
          batchRank: sc.rank,
        },
      });

      // Add Subject Scores
      const subjects = [
        { subject: "PHYSICS", score: sc.phy, max: 180 },
        { subject: "CHEMISTRY", score: sc.che, max: 180 },
        { subject: "BOTANY", score: sc.bot, max: 180 },
        { subject: "ZOOLOGY", score: sc.zoo, max: 180 },
      ];

      for (const sub of subjects) {
        await prisma.subjectScore.upsert({
          where: { testResultId_subject: { testResultId: tr.id, subject: sub.subject } },
          update: { score: sub.score },
          create: { testResultId: tr.id, subject: sub.subject, score: sub.score, maxMarks: sub.max },
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Student Management database seeded with full NEET/JEE classes, students, and test results!",
      logins: {
        admin: { email: "admin@brahmieduhub.in", password: "password123", role: "Academic Director / Admin" },
        superadmin: { email: "superadmin@eduhub.com", password: "password123", role: "Super Admin" },
        faculty: { email: "faculty@brahmieduhub.in", password: "password123", role: "Faculty" },
      },
      studentsEnrolled: createdStudents.length,
      sampleAssessment: "NEET Grand Mock Test - 01",
    });
  } catch (error: any) {
    console.error("Seed error:", error);
    return NextResponse.json({ error: error.message || "Failed to seed" }, { status: 500 });
  }
}
