import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { standardizeAssessment, classifyDrift, rollingAverage, computeVelocity, SUBJECTS_BY_STREAM } from "../src/lib/analytics";

const Role = { ADMIN: "ADMIN", FACULTY: "FACULTY", CAMPUS_HEAD: "CAMPUS_HEAD", TELE_CALLER: "TELE_CALLER" } as const;
const ExamType = { JEE: "JEE", NEET: "NEET" } as const;
const Difficulty = { EASY: "EASY", MODERATE: "MODERATE", DIFFICULT: "DIFFICULT", JUST_RIGHT: "JUST_RIGHT" } as const;
const AssessmentStatus = { DRAFT: "DRAFT", PUBLISHED: "PUBLISHED", RESULTS_LOCKED: "RESULTS_LOCKED" } as const;

const prisma = new PrismaClient();

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {
  console.log("Seeding database...");

  // Clean existing
  await prisma.diagnosticReport.deleteMany();
  await prisma.campusRankSummary.deleteMany();
  await prisma.performanceTrend.deleteMany();
  await prisma.subjectScore.deleteMany();
  await prisma.testResult.deleteMany();
  await prisma.assessmentSubjectDifficulty.deleteMany();
  await prisma.assessment.deleteMany();
  await prisma.student.deleteMany();
  await prisma.batch.deleteMany();
  await prisma.user.deleteMany();
  await prisma.campus.deleteMany();

  // Campuses
  const campusA = await prisma.campus.create({ data: { name: "Delhi NCR", city: "Delhi", state: "Delhi" } });
  const campusB = await prisma.campus.create({ data: { name: "Hyderabad", city: "Hyderabad", state: "Telangana" } });
  const campusC = await prisma.campus.create({ data: { name: "Pune", city: "Pune", state: "Maharashtra" } });
  const campuses = [campusA, campusB, campusC];

  // Users
  const passwordHash = await hash("password123", 10);
  const users = [];
  for (const campus of campuses) {
    users.push(
      await prisma.user.create({ data: { email: `admin@${campus.name.toLowerCase().replace(/\s+/g, "")}.com`, name: `Admin ${campus.name}`, passwordHash, role: Role.ADMIN, campusId: campus.id } }),
      await prisma.user.create({ data: { email: `faculty@${campus.name.toLowerCase().replace(/\s+/g, "")}.com`, name: `Faculty ${campus.name}`, passwordHash, role: Role.FACULTY, campusId: campus.id } }),
      await prisma.user.create({ data: { email: `tele@${campus.name.toLowerCase().replace(/\s+/g, "")}.com`, name: `Telecaller ${campus.name}`, passwordHash, role: Role.TELE_CALLER, campusId: campus.id } })
    );
  }
  // Super admin
  await prisma.user.create({ data: { email: "superadmin@eduhub.com", name: "Super Admin", passwordHash, role: Role.ADMIN } });

  // Batches
  const batchDefs = [
    { name: "JEE Mains 2026", stream: ExamType.JEE, sessionYear: "2025-26" },
    { name: "JEE Advanced 2026", stream: ExamType.JEE, sessionYear: "2025-26" },
    { name: "NEET 2026", stream: ExamType.NEET, sessionYear: "2025-26" },
    { name: "NEET 2027", stream: ExamType.NEET, sessionYear: "2026-27" },
  ];
  const batches = [];
  for (const campus of campuses) {
    for (const def of batchDefs) {
      batches.push(await prisma.batch.create({ data: { ...def, campusId: campus.id } }));
    }
  }

  // Students (30 per batch)
  const firstNames = ["Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Sai", "Rohan", "Karthik", "Ishaan", "Rahul", "Ananya", "Diya", "Ira", "Saanvi", "Anika", "Myra", "Riya", "Aadhya", "Kavya", "Nisha", "Ravi", "Suresh", "Priya", "Neha", "Amit", "Vikram", "Pooja", "Rakesh", "Sunita", "Manoj"];
  const lastNames = ["Sharma", "Verma", "Patel", "Reddy", "Kumar", "Singh", "Gupta", "Iyer", "Nair", "Rao", "Das", "Bose", "Mehta", "Joshi", "Chopra", "Malhotra", "Kapoor", "Agarwal", "Bhat", "Pillai"];

  const students = [];
  let studentCounter = 0;
  for (const batch of batches) {
    for (let i = 0; i < 30; i++) {
      studentCounter++;
      const name = `${pick(firstNames)} ${pick(lastNames)}`;
      students.push(await prisma.student.create({
        data: {
          rollNo: `STU-${String(studentCounter).padStart(5, "0")}`,
          name,
          email: `${name.toLowerCase().replace(/\s+/g, ".")}${studentCounter}@example.com`,
          phone: `+91${Math.floor(9000000000 + Math.random() * 999999999)}`,
          batchId: batch.id,
        },
      }));
    }
  }

  // Assessments (6 per batch, spaced 2 weeks apart)
  const assessments = [];
  for (const batch of batches) {
    const subjects = SUBJECTS_BY_STREAM[batch.stream];
    for (let a = 0; a < 6; a++) {
      const examDate = new Date(2025, 6 + a, 15);
      const assessment = await prisma.assessment.create({
        data: {
          title: `${batch.name} - Mock Test ${a + 1}`,
          batchId: batch.id,
          examDate,
          totalMarks: 300,
          status: a < 5 ? AssessmentStatus.RESULTS_LOCKED : AssessmentStatus.PUBLISHED,
        },
      });
      assessments.push({ assessment, subjects });

      // Subject difficulty tags
      for (const subject of subjects) {
        await prisma.assessmentSubjectDifficulty.create({
          data: {
            assessmentId: assessment.id,
            subject,
            difficulty: pick([Difficulty.EASY, Difficulty.MODERATE, Difficulty.DIFFICULT, Difficulty.JUST_RIGHT]),
            taggedByUserId: pick(users).id,
          },
        });
      }
    }
  }

  // Generate test results with realistic progression
  for (const { assessment, subjects } of assessments) {
    const batchStudents = students.filter((s) => s.batchId === assessment.batchId);
    const rows = batchStudents.map((s) => {
      // Base ability + progression + noise
      const base = rand(35, 75);
      const progress = assessment.examDate.getMonth() * 1.5;
      const totalMarks = Math.max(0, Math.min(assessment.totalMarks, base + progress + rand(-15, 15)));
      return { studentId: s.id, totalMarks, maxMarks: assessment.totalMarks };
    });

    const standardized = standardizeAssessment(rows);

    for (const row of rows) {
      const std = standardized.get(row.studentId)!;
      const subjectScores = subjects.map((subject) => {
        const maxMarks = assessment.totalMarks / subjects.length;
        const marks = Math.max(0, Math.min(maxMarks, row.totalMarks / subjects.length + rand(-10, 10)));
        return { subject, marks, maxMarks };
      });

      await prisma.testResult.create({
        data: {
          assessmentId: assessment.id,
          studentId: row.studentId,
          totalMarks: std.totalMarks,
          percentage: std.percentage,
          percentile: std.percentile,
          zScore: std.zScore,
          campusRank: std.campusRank,
          overallRank: std.campusRank,
          present: true,
          subjectScores: { create: subjectScores },
        },
      });
    }
  }

  // Compute performance trends & drift
  for (const student of students) {
    const results = await prisma.testResult.findMany({
      where: { studentId: student.id },
      orderBy: { assessment: { examDate: "asc" } },
      include: { assessment: true },
    });

    const percentiles = results.map((r) => r.percentile ?? 0);
    const percentages = results.map((r) => r.percentage);

    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      const recent = percentiles.slice(0, i + 1);
      const prevPercentile = i > 0 ? percentiles[i - 1] : percentiles[i];
      const drift = classifyDrift(prevPercentile, percentiles[i], recent);

      await prisma.performanceTrend.create({
        data: {
          studentId: student.id,
          assessmentId: r.assessmentId,
          rollingAvg3: rollingAverage(percentages, 3),
          rollingAvg5: rollingAverage(percentages, 5),
          velocity: computeVelocity(percentages.slice(0, i + 1)),
          driftStatus: drift,
          statusFrom: i > 0 ? percentiles[i - 1] : null,
          statusTo: percentiles[i],
        },
      });
    }
  }

  // Campus rank summaries (top 15 per assessment)
  for (const { assessment } of assessments) {
    const fullAssessment = await prisma.assessment.findUnique({
      where: { id: assessment.id },
      include: { batch: true },
    });
    const results = await prisma.testResult.findMany({
      where: { assessmentId: assessment.id },
      orderBy: { percentile: "desc" },
      take: 15,
      include: { student: true },
    });
    const top15 = results.map((r) => ({
      studentId: r.studentId,
      name: r.student.name,
      percentile: r.percentile,
      totalMarks: r.totalMarks,
      rank: r.campusRank,
    }));
    await prisma.campusRankSummary.create({
      data: {
        assessmentId: assessment.id,
        campusId: fullAssessment!.batch.campusId,
        top15Json: top15,
      },
    });
  }

  console.log(`Seeded: ${campuses.length} campuses, ${batches.length} batches, ${students.length} students, ${assessments.length} assessments`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });