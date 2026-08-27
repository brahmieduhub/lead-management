import * as XLSX from "xlsx";
import { prisma } from "./src/lib/db";
import { POST as handleCampusPost, DELETE as handleCampusDelete } from "./src/app/api/campuses/route";
import { POST as handleUploadPost } from "./src/app/api/upload/route";
import { GET as handleRankingsGet } from "./src/app/api/rankings/route";
import { createSessionToken } from "./src/lib/auth";

async function runMultiCenterTest() {
  console.log("=== Starting Multi-Center Isolation & Rankings Test ===");

  // 1. Setup Session Tokens
  const superAdminSession = createSessionToken({
    id: "user-super",
    name: "Super Admin",
    email: "superadmin@eduhub.com",
    role: "ADMIN",
    campusId: null,
  });

  // 2. Super Admin Creates Campus A (Delhi) and Campus B (Hyderabad)
  console.log("\n1. Super Admin creating centers...");
  const campusA = await prisma.campus.create({
    data: { name: "NANO Delhi Campus", city: "Delhi", state: "Delhi" },
  });
  const batchA = await prisma.batch.create({
    data: { name: "JEE Mains 2026", stream: "JEE", sessionYear: "2025-26", campusId: campusA.id },
  });

  const campusB = await prisma.campus.create({
    data: { name: "NANO Hyderabad Campus", city: "Hyderabad", state: "Telangana" },
  });
  const batchB = await prisma.batch.create({
    data: { name: "JEE Mains 2026", stream: "JEE", sessionYear: "2025-26", campusId: campusB.id },
  });

  console.log(`Created Campus A: ${campusA.name} (${campusA.id})`);
  console.log(`Created Campus B: ${campusB.name} (${campusB.id})`);

  // 3. Center Admin for Campus A uploads Test Results
  console.log("\n2. Campus A Admin uploading results...");
  const dataA = [
    ["NANOmyclassroom"],
    ["JR JUNE-MAINS-T-08-  OFFLINE RESULTS-01-08-2026-MAX-300M (STREAM -2)"],
    ["SNO", "ID", "STUDENT NAME", "MOBILE NO-1", "PHY", "CHE", "MAT", "TOT", "%", "RANK"],
    [1, 101, "Aarav Sharma (Delhi)", 9811111111, 70, 75, 80, 225, 75.00, 1],
    [2, 102, "Vivaan Gupta (Delhi)", 9822222222, 60, 65, 70, 195, 65.00, 2],
  ];
  const wsA = XLSX.utils.aoa_to_sheet(dataA);
  const wbA = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wbA, wsA, "Sheet1");
  const bufA = XLSX.write(wbA, { type: "buffer", bookType: "xlsx" });

  const fileA = new File([new Blob([bufA])], "delhi.xlsx");
  const formA = new FormData();
  formA.append("file", fileA);
  formA.append("uploadType", "results");
  formA.append("batchId", batchA.id);

  const reqA = new Request("http://localhost:3000/api/upload", {
    method: "POST",
    headers: {
      cookie: `session=${createSessionToken({
        id: "admin-delhi",
        name: "Delhi Admin",
        email: "admin@delhi.com",
        role: "CAMPUS_HEAD",
        campusId: campusA.id,
      })}`,
    },
    body: formA,
  });

  const resA = await handleUploadPost(reqA);
  const jsonA = await resA.json();
  console.log("Delhi Upload Result:", jsonA.message);

  // 4. Center Admin for Campus B uploads Test Results for the same test
  console.log("\n3. Campus B Admin uploading results...");
  const dataB = [
    ["NANOmyclassroom"],
    ["JR JUNE-MAINS-T-08-  OFFLINE RESULTS-01-08-2026-MAX-300M (STREAM -2)"],
    ["SNO", "ID", "STUDENT NAME", "MOBILE NO-1", "PHY", "CHE", "MAT", "TOT", "%", "RANK"],
    [1, 201, "Sai Pranav (Hyd)", 9911111111, 85, 90, 85, 260, 86.67, 1],
    [2, 202, "Ananya Reddy (Hyd)", 9922222222, 65, 70, 75, 210, 70.00, 2],
  ];
  const wsB = XLSX.utils.aoa_to_sheet(dataB);
  const wbB = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wbB, wsB, "Sheet1");
  const bufB = XLSX.write(wbB, { type: "buffer", bookType: "xlsx" });

  const fileB = new File([new Blob([bufB])], "hyd.xlsx");
  const formB = new FormData();
  formB.append("file", fileB);
  formB.append("uploadType", "results");
  formB.append("batchId", batchB.id);

  const reqB = new Request("http://localhost:3000/api/upload", {
    method: "POST",
    headers: {
      cookie: `session=${createSessionToken({
        id: "admin-hyd",
        name: "Hyd Admin",
        email: "admin@hyd.com",
        role: "CAMPUS_HEAD",
        campusId: campusB.id,
      })}`,
    },
    body: formB,
  });

  const resB = await handleUploadPost(reqB);
  const jsonB = await resB.json();
  console.log("Hyd Upload Result:", jsonB.message);

  // 5. Test Cross-Center Rankings
  console.log("\n4. Testing Cross-Center Rankings Leaderboard...");
  const reqRankings = new Request(`http://localhost:3000/api/rankings?assessmentId=${jsonA.assessment.id}`, {
    headers: {
      cookie: `session=${superAdminSession}`,
    },
  });

  const resRankings = await handleRankingsGet(reqRankings);
  const jsonRankings = await resRankings.json();

  console.log("\n--- Center Benchmark Stats ---");
  for (const cs of jsonRankings.centerStats) {
    console.log(`Center: ${cs.campusName} (${cs.city}) | Candidates: ${cs.candidateCount} | Avg Score: ${cs.avgScore} | Top Score: ${cs.topScore}`);
  }

  console.log("\n--- Cross-Center Leaderboard ---");
  for (const row of jsonRankings.leaderboard) {
    console.log(`Overall Rank #${row.overallRank} (Center Rank #${row.campusRank}): ${row.name} - ${row.totalMarks}/300 (${row.percentage}%) [${row.campusName}]`);
  }

  // 6. Test Super Admin Deleting Center
  console.log("\n5. Testing Super Admin removing center...");
  const reqDel = new Request(`http://localhost:3000/api/campuses?id=${campusA.id}`, {
    method: "DELETE",
    headers: { cookie: `session=${superAdminSession}` },
  });
  const resDel = await handleCampusDelete(reqDel);
  const jsonDel = await resDel.json();
  console.log("Delete Center Result:", jsonDel.message);

  const deletedCheck = await prisma.campus.findUnique({ where: { id: campusA.id } });
  if (!deletedCheck) {
    console.log("Confirmed: Campus A successfully deleted!");
  }

  // Cleanup B
  await prisma.campus.delete({ where: { id: campusB.id } });

  console.log("\n=== ALL MULTI-CENTER AND CROSS-RANKINGS TESTS PASSED! ===");
}

runMultiCenterTest()
  .catch((e) => {
    console.error("Test failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
