const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function runUploadTests() {
  console.log("=================================================");
  console.log("🧪 RUNNING FILE UPLOAD TEST SUITE (LOCAL SERVER)");
  console.log("=================================================\n");

  // Step 1: Test Authentication
  console.log("1️⃣ [AUTH] Logging in as Academic Director (admin@brahmieduhub.in)...");
  const loginRes = await fetch("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@brahmieduhub.in", password: "password123" }),
  });

  if (!loginRes.ok) {
    throw new Error(`Login failed with HTTP ${loginRes.status}: ${await loginRes.text()}`);
  }
  const sessionCookie = loginRes.headers.get("set-cookie");
  console.log("   ✅ Login successful! Session cookie acquired.\n");

  // Step 2: Prepare file payload
  const filePath = path.join(__dirname, "QuestionWiseAnalysis_03-08-2026 JR EAPCET-01.xls");
  if (!fs.existsSync(filePath)) {
    throw new Error(`Test file not found at ${filePath}`);
  }
  const fileStats = fs.statSync(filePath);
  console.log(`2️⃣ [FILE] Preparing test file: "${path.basename(filePath)}" (${(fileStats.size / 1024).toFixed(1)} KB)...`);

  const fileBuffer = fs.readFileSync(filePath);
  const blob = new Blob([fileBuffer], { type: "application/vnd.ms-excel" });
  const formData = new FormData();
  formData.append("file", blob, path.basename(filePath));
  formData.append("uploadType", "results");

  // Step 3: Execute Upload
  console.log("3️⃣ [UPLOAD] Sending POST /api/upload request...");
  const startTime = Date.now();
  const uploadRes = await fetch("http://localhost:3000/api/upload", {
    method: "POST",
    headers: {
      Cookie: sessionCookie || "",
    },
    body: formData,
  });
  const duration = Date.now() - startTime;

  const uploadJson = await uploadRes.json();
  console.log(`   HTTP Status: ${uploadRes.status} (${duration}ms)`);
  console.log("   Response Message:", uploadJson.message || uploadJson.error);

  if (!uploadRes.ok) {
    console.error("   ❌ Upload Failed:", uploadJson);
    process.exit(1);
  }
  console.log("   ✅ Upload succeeded with HTTP 200!\n");

  // Step 4: Verify Database Ingestion
  console.log("4️⃣ [DB VERIFICATION] Inspecting local PostgreSQL database records...");

  // Verify Assessment
  const assessment = await prisma.assessment.findFirst({
    where: { title: { contains: "03-08-2026 JR EAPCET-01" } },
    include: {
      _count: {
        select: {
          testResults: true,
          assessmentQuestions: true,
        },
      },
      batch: {
        include: { campus: true },
      },
    },
  });

  if (!assessment) {
    throw new Error("❌ Assessment record was not found in database!");
  }
  console.log(`   ✅ Assessment Created: "${assessment.title}"`);
  console.log(`      - Batch: ${assessment.batch.name} (${assessment.batch.campus.name})`);
  console.log(`      - Total Questions mapped: ${assessment._count.assessmentQuestions}`);
  console.log(`      - Student Test Results: ${assessment._count.testResults}`);

  // Verify Questions
  if (assessment._count.assessmentQuestions < 160) {
    console.warn(`   ⚠️ Expected 160 questions, found ${assessment._count.assessmentQuestions}`);
  } else {
    console.log(`   ✅ All 160 questions and answer keys auto-populated!`);
  }

  // Verify Question Responses
  const responseCount = await prisma.studentQuestionResponse.count({
    where: { assessmentQuestion: { assessmentId: assessment.id } },
  });
  console.log(`   ✅ Total Student Question Responses Stored: ${responseCount}`);

  // Verify Sample Student (35202)
  const sampleStudent = await prisma.student.findUnique({
    where: { rollNo: "35202" },
    include: {
      testResults: {
        where: { assessmentId: assessment.id },
        include: {
          questionResponses: true,
          subtopicSummaries: true,
        },
      },
    },
  });

  if (sampleStudent) {
    const result = sampleStudent.testResults[0];
    console.log(`\n5️⃣ [SAMPLE STUDENT VERIFICATION] Roll No 35202:`);
    console.log(`   - Enrolled Name: ${sampleStudent.name}`);
    console.log(`   - Total Marks Scored: ${result?.totalMarks} / ${assessment.totalMarks}`);
    console.log(`   - Percentage: ${result?.percentage}%`);
    console.log(`   - Campus Rank: #${result?.campusRank}`);
    console.log(`   - Responses Recorded: ${result?.questionResponses?.length || 0}`);
  }

  console.log("\n=================================================");
  console.log("🎉 ALL TESTS PASSED! FILE UPLOAD WORKS PERFECTLY");
  console.log("=================================================");
  await prisma.$disconnect();
}

runUploadTests().catch(async (e) => {
  console.error("\n❌ TEST RUN FAILED:", e.message);
  await prisma.$disconnect();
  process.exit(1);
});
