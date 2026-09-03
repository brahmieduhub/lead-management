import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/db";
import {
  standardizeAssessment,
  classifyDrift,
  rollingAverage,
  computeVelocity,
} from "@/lib/analytics";
import { getSession, isReadOnly, isSuperAdmin } from "@/lib/auth";
import { computeSubtopicSummary } from "@/lib/subtopicAnalytics";
import { generateAssessmentSummary } from "@/lib/assessmentAI";
import type { AttemptResult } from "@prisma/client";

interface ColumnMapping {
  snoCol: number;
  idCol: number;
  nameCol: number;
  phoneCol: number;
  totalCol: number;
  percentCol: number;
  rankCol: number;
  subjectCols: { name: string; index: number }[];
}

interface ParsedRowData {
  rollNo: string;
  name: string;
  phone: string | null;
  subjectScores: { subject: string; marks: number }[];
  totalMarks: number;
  percentage?: number;
  rank?: number;
}

interface ParsedSheetData {
  sheetName: string;
  title: string;
  examDate: Date;
  maxMarks: number | null;
  inferredStream: "JEE" | "NEET";
  parsedData: ParsedRowData[];
  detectedSubjects: string[];
}

function parseDateString(dateStr: string): Date | null {
  // 1. Matches DD-MM-YYYY, DD/MM/YYYY, YYYY-MM-DD, D-M-YYYY
  const match = dateStr.match(/\b(\d{1,4})[-/.](\d{1,2})[-/.](\d{1,4})\b/);
  if (match) {
    const [, part1, part2, part3] = match;
    let day: number;
    let month: number;
    let year: number;

    if (part1.length === 4) {
      year = parseInt(part1, 10);
      month = parseInt(part2, 10);
      day = parseInt(part3, 10);
    } else {
      day = parseInt(part1, 10);
      month = parseInt(part2, 10);
      year = parseInt(part3.length === 2 ? `20${part3}` : part3, 10);
    }

    if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 2000) {
      return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    }
  }

  // 2. Matches text months like 17-Aug-2026, 01-August-2026
  const textMonthMatch = dateStr.match(
    /\b(\d{1,2})[-/\s]+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[-/\s]+(\d{2,4})\b/i
  );
  if (textMonthMatch) {
    const months: Record<string, number> = {
      jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
    };
    const day = parseInt(textMonthMatch[1], 10);
    const mStr = textMonthMatch[2].slice(0, 3).toLowerCase();
    const month = months[mStr];
    let year = parseInt(textMonthMatch[3], 10);
    if (year < 100) year += 2000;
    if (month && day >= 1 && day <= 31 && year >= 2000) {
      return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    }
  }

  return null;
}

function mapSubjectName(header: string): string | null {
  const h = header.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (/^(PHY|PHYSICS)$/.test(h)) return "Physics";
  if (/^(CHE|CHEM|CHEMISTRY)$/.test(h)) return "Chemistry";
  if (/^(MAT|MATH|MATHS|MATHEMATICS)$/.test(h)) return "Mathematics";
  if (/^(BIO|BIOLOGY)$/.test(h)) return "Biology";
  if (/^(BOT|BOTANY)$/.test(h)) return "Botany";
  if (/^(ZOO|ZOOLOGY)$/.test(h)) return "Zoology";
  return null;
}

function parseWorksheet(sheetName: string, sheet: XLSX.WorkSheet): ParsedSheetData | null {
  const rawRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });
  if (!rawRows || rawRows.length === 0) return null;

  let headerRowIndex = -1;
  for (let r = 0; r < Math.min(rawRows.length, 12); r++) {
    const row = rawRows[r];
    if (!Array.isArray(row)) continue;

    const rowStrings = row.map((c) => String(c ?? "").trim().toUpperCase());
    const hasId = rowStrings.some((c) =>
      /^(ID|STUDENT\s*ID|ROLL|ROLL\s*NO|ROLLNO|ADM\s*NO|HT\s*NO|HALL\s*TICKET)$/i.test(c)
    );
    const hasName = rowStrings.some((c) =>
      /^(STUDENT\s*NAME|NAME|CANDIDATE\s*NAME|STUDENT)$/i.test(c)
    );
    const hasSubjectOrTot = rowStrings.some((c) =>
      /^(PHY|PHYSICS|CHE|CHEMISTRY|MAT|MATHS|BIO|TOT|TOTAL|MARKS|%|RANK)$/i.test(c)
    );

    if (hasId || (hasName && hasSubjectOrTot)) {
      headerRowIndex = r;
      break;
    }
  }

  if (headerRowIndex === -1) headerRowIndex = 0;

  const bannerTexts: string[] = [];
  for (let r = 0; r < headerRowIndex; r++) {
    const row = rawRows[r];
    if (!Array.isArray(row)) continue;
    for (const cell of row) {
      const val = String(cell ?? "").trim();
      if (val && !bannerTexts.includes(val)) bannerTexts.push(val);
    }
  }

  const combinedBanner = `${sheetName} ${bannerTexts.join(" ")}`;
  let extractedTitle = sheetName.trim();

  if (!extractedTitle && headerRowIndex > 0) {
    const rowAbove = (rawRows[headerRowIndex - 1] as unknown[])
      .map((c) => String(c ?? "").trim())
      .filter(Boolean)
      .join(" - ");
    if (rowAbove) extractedTitle = rowAbove;
  }
  if (!extractedTitle && bannerTexts.length > 0) {
    extractedTitle = bannerTexts.reduce((a, b) => (a.length > b.length ? a : b));
  }
  if (!extractedTitle) {
    extractedTitle = `Offline Assessment ${new Date().toLocaleDateString("en-IN")}`;
  }

  const extractedDate = parseDateString(combinedBanner) || new Date();
  const maxMarksMatch =
    combinedBanner.match(/MAX[-:\s]*(\d+)\s*M?\b/i) ||
    combinedBanner.match(/\b(\d{2,4})\s*M(?:ARKS)?\b/i);
  const extractedMaxMarks = maxMarksMatch ? parseInt(maxMarksMatch[1], 10) : null;
  const inferredStream: "JEE" | "NEET" = /NEET|BIOLOGY|BOTANY|ZOOLOGY|MEDICAL/i.test(combinedBanner)
    ? "NEET"
    : "JEE";

  const headerRow = (rawRows[headerRowIndex] as unknown[]).map((c) => String(c ?? "").trim());
  const mapping: ColumnMapping = {
    snoCol: -1,
    idCol: -1,
    nameCol: -1,
    phoneCol: -1,
    totalCol: -1,
    percentCol: -1,
    rankCol: -1,
    subjectCols: [],
  };

  headerRow.forEach((h, idx) => {
    const cleanH = h.toUpperCase().replace(/\s+/g, " ");
    if (/^(SNO|S\.NO|SL\.?NO|SR\.?NO|SERIAL)$/i.test(cleanH)) {
      mapping.snoCol = idx;
    } else if (/^(ID|STUDENT\s*ID|ROLL|ROLL\s*NO|ROLLNO|ADM\s*NO|HT\s*NO)$/i.test(cleanH)) {
      mapping.idCol = idx;
    } else if (/^(STUDENT\s*NAME|NAME|CANDIDATE\s*NAME|STUDENT)$/i.test(cleanH)) {
      mapping.nameCol = idx;
    } else if (/^(MOBILE\s*NO-?\d*|MOBILE|MOBILE\s*NO|PHONE|PHONE\s*NO|CONTACT)$/i.test(cleanH)) {
      mapping.phoneCol = idx;
    } else if (/^(TOT|TOTAL|TOTAL\s*MARKS|MARKS)$/i.test(cleanH)) {
      mapping.totalCol = idx;
    } else if (/^(\%|PCT|PERCENT|PERCENTAGE)$/i.test(cleanH)) {
      mapping.percentCol = idx;
    } else if (/^(RANK|C\.?RANK|CAMPUS\s*RANK|OVERALL\s*RANK|AIR)$/i.test(cleanH)) {
      mapping.rankCol = idx;
    } else {
      const subject = mapSubjectName(cleanH);
      if (subject) mapping.subjectCols.push({ name: subject, index: idx });
    }
  });

  if (mapping.idCol === -1) {
    mapping.idCol = mapping.snoCol === 0 && headerRow.length > 1 ? 1 : 0;
  }
  if (mapping.nameCol === -1 && headerRow.length > 2) {
    mapping.nameCol = mapping.idCol === 0 ? 1 : 2;
  }

  const parsedData: ParsedRowData[] = [];
  for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
    const row = rawRows[r] as unknown[];
    if (!Array.isArray(row) || row.length === 0) continue;

    const idVal = mapping.idCol >= 0 ? String(row[mapping.idCol] ?? "").trim() : "";
    const nameVal = mapping.nameCol >= 0 ? String(row[mapping.nameCol] ?? "").trim() : "";
    if (!idVal && !nameVal) continue;

    const rollNo = idVal || `STU-${sheetName}-${r}`;
    const name = nameVal || `Student ${rollNo}`;
    const phone =
      mapping.phoneCol >= 0 && row[mapping.phoneCol]
        ? String(row[mapping.phoneCol]).replace(/[^0-9+]/g, "")
        : null;

    const subjectScores: { subject: string; marks: number }[] = [];
    let sumOfSubjects = 0;
    let hasSubjectMarks = false;

    for (const sub of mapping.subjectCols) {
      const rawScore = row[sub.index];
      if (rawScore !== undefined && rawScore !== null && rawScore !== "") {
        const num = Number(rawScore);
        if (!isNaN(num)) {
          subjectScores.push({ subject: sub.name, marks: num });
          sumOfSubjects += num;
          hasSubjectMarks = true;
        }
      }
    }

    let totalMarks = 0;
    if (mapping.totalCol >= 0 && row[mapping.totalCol] !== undefined && row[mapping.totalCol] !== "") {
      const parsedTotal = Number(row[mapping.totalCol]);
      totalMarks = !isNaN(parsedTotal) ? parsedTotal : sumOfSubjects;
    } else if (hasSubjectMarks) {
      totalMarks = sumOfSubjects;
    } else if (mapping.subjectCols.length === 0) {
      const numbers = row.map(Number).filter((n) => !isNaN(n) && n > 0);
      totalMarks = numbers.length ? numbers[0] : 0;
    }

    let percentage: number | undefined;
    if (mapping.percentCol >= 0 && row[mapping.percentCol] !== undefined && row[mapping.percentCol] !== "") {
      const parsedPct = Number(row[mapping.percentCol]);
      if (!isNaN(parsedPct)) percentage = parsedPct;
    }

    let rank: number | undefined;
    if (mapping.rankCol >= 0 && row[mapping.rankCol] !== undefined && row[mapping.rankCol] !== "") {
      const parsedRank = parseInt(String(row[mapping.rankCol]), 10);
      if (!isNaN(parsedRank)) rank = parsedRank;
    }

    parsedData.push({ rollNo, name, phone, subjectScores, totalMarks, percentage, rank });
  }

  if (parsedData.length === 0) return null;

  return {
    sheetName,
    title: extractedTitle,
    examDate: extractedDate,
    maxMarks: extractedMaxMarks,
    inferredStream,
    parsedData,
    detectedSubjects: Array.from(
      new Set(parsedData.flatMap((p) => p.subjectScores.map((s) => s.subject)))
    ),
  };
}

async function resolveTargetBatch(
  requestedBatchId: string | null,
  inferredStream: "JEE" | "NEET",
  isSuper: boolean,
  userCampusId: string | null | undefined
) {
  let targetBatch = null;

  if (requestedBatchId) {
    targetBatch = await prisma.batch.findUnique({
      where: { id: requestedBatchId },
      include: { campus: true },
    });
    if (targetBatch && !isSuper && userCampusId && targetBatch.campusId !== userCampusId) {
      throw new Error("FORBIDDEN_BATCH");
    }
  }

  if (!targetBatch) {
    targetBatch = await prisma.batch.findFirst({
      where: { campusId: userCampusId || undefined, stream: inferredStream },
      include: { campus: true },
    });
  }

  if (!targetBatch) {
    targetBatch = await prisma.batch.findFirst({
      where: { campusId: userCampusId || undefined },
      include: { campus: true },
    });
  }

  if (!targetBatch) {
    let campus = userCampusId
      ? await prisma.campus.findUnique({ where: { id: userCampusId } })
      : await prisma.campus.findFirst();

    if (!campus) {
      campus = await prisma.campus.create({
        data: { name: "Main Campus", city: "Hyderabad", state: "Telangana" },
      });
    }

    targetBatch = await prisma.batch.create({
      data: {
        name: inferredStream === "JEE" ? "JEE Class 2026" : "NEET Class 2026",
        stream: inferredStream,
        sessionYear: "2025-26",
        campusId: campus.id,
      },
      include: { campus: true },
    });
  }

  return targetBatch;
}

export async function POST(req: Request) {
  const session = await getSession(req);

  if (isReadOnly(session)) {
    return NextResponse.json(
      { error: "Forbidden. Read-only center users cannot upload or modify data." },
      { status: 403 }
    );
  }

  const isSuper = isSuperAdmin(session);
  const userCampusId = session?.campusId;
  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });

  const file = form.get("file") as File | null;
  const uploadType = String(form.get("uploadType") ?? "results");
  const requestedBatchId = form.get("batchId") ? String(form.get("batchId")) : null;
  const weekNumber = String(form.get("weekNumber") ?? "").trim();

  if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });

    // ─── QUESTION MAPPING UPLOAD ─────────────────────────────────────────────
    // uploadType = "question-mapping"
    // Expected columns: QuestionNo, Subject, Chapter, Subtopic, MaxMarks (opt), CorrectKey (opt), PlatformQId (opt)
    if (uploadType === "question-mapping") {
      const assessmentId = form.get("assessmentId") ? String(form.get("assessmentId")) : null;
      if (!assessmentId) {
        return NextResponse.json({ error: "assessmentId is required for question-mapping upload" }, { status: 400 });
      }
      const wb = XLSX.read(buffer, { type: "buffer" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
      let created = 0; let updated = 0;
      for (const row of rows) {
        const questionNo = parseInt(String(row["QuestionNo"] ?? row["questionno"] ?? row["Question No"] ?? ""), 10);
        if (isNaN(questionNo)) continue;
        const subject = String(row["Subject"] ?? row["subject"] ?? "").trim().toUpperCase();
        const chapter = String(row["Chapter"] ?? row["chapter"] ?? "").trim() || null;
        const subtopic = String(row["Subtopic"] ?? row["subtopic"] ?? row["Sub Topic"] ?? "").trim() || null;
        const maxMarks = parseFloat(String(row["MaxMarks"] ?? row["Max Marks"] ?? "1")) || 1;
        const correctKey = String(row["CorrectKey"] ?? row["Correct Key"] ?? row["Key"] ?? "").trim().toUpperCase() || null;
        const platformQId = String(row["PlatformQId"] ?? row["Platform Q Id"] ?? row["QId"] ?? "").trim() || null;
        const existing = await prisma.assessmentQuestion.findUnique({
          where: { assessmentId_questionNo: { assessmentId, questionNo } },
        });
        if (existing) {
          await prisma.assessmentQuestion.update({
            where: { id: existing.id },
            data: { subject, chapter, subtopic, maxMarks, correctKey, platformQId },
          });
          updated++;
        } else {
          await prisma.assessmentQuestion.create({
            data: { assessmentId, questionNo, subject, chapter, subtopic, maxMarks, correctKey, platformQId },
          });
          created++;
        }
      }
      return NextResponse.json({
        imported: created + updated,
        created,
        updated,
        message: `Question mapping saved: ${created} new, ${updated} updated for assessment ${assessmentId}.`,
      });
    }

    // ─── QUESTION-WISE RESULTS UPLOAD ────────────────────────────────────────
    // uploadType = "question-results" OR auto-detected QuestionWiseAnalysis workbook
    const isQuestionWiseWorkbook =
      uploadType === "question-results" ||
      workbook.SheetNames[0] === "Document map" ||
      workbook.SheetNames.some((n) => n.toLowerCase().includes("sheet"));

    if (uploadType === "question-results" || (isQuestionWiseWorkbook && workbook.SheetNames[0] === "Document map")) {
      const dataSheets = workbook.SheetNames.filter((n) => n !== workbook.SheetNames[0]);
      if (dataSheets.length === 0) {
        return NextResponse.json({ error: "No student data sheets found in QuestionWise workbook" }, { status: 400 });
      }

      // Read sample sheet to extract assessment metadata
      const firstWs = workbook.Sheets[dataSheets[0]];
      const firstRawRows = XLSX.utils.sheet_to_json<unknown[]>(firstWs, { header: 1, defval: "" }) as unknown[][];
      
      const titleBanner = String(firstRawRows[4]?.[1] ?? firstRawRows[2]?.[1] ?? "QuestionWise Assessment").trim();
      const extractedTitle = titleBanner.split("\n")[0] || "QuestionWise Assessment";
      const extractedDate = parseDateString(titleBanner) || new Date();
      const inferredStream: "JEE" | "NEET" = /NEET|BIO|BOT|ZOO/i.test(titleBanner) ? "NEET" : "JEE";

      // 1. Resolve Target Batch
      const targetBatch = await resolveTargetBatch(
        requestedBatchId,
        inferredStream,
        isSuper,
        userCampusId
      );

      // 2. Resolve Assessment
      let effectiveAssessmentId = form.get("assessmentId") ? String(form.get("assessmentId")) : null;
      let assessment = effectiveAssessmentId
        ? await prisma.assessment.findUnique({ where: { id: effectiveAssessmentId } })
        : null;

      if (!assessment) {
        assessment = await prisma.assessment.findFirst({
          where: { title: extractedTitle, batchId: targetBatch.id },
        });
      }

      if (!assessment) {
        assessment = await prisma.assessment.create({
          data: {
            title: extractedTitle,
            batchId: targetBatch.id,
            examDate: extractedDate,
            totalMarks: 160,
            status: "PUBLISHED",
          },
        });
      }
      effectiveAssessmentId = assessment.id;

      // 3. Auto-populate Assessment Questions if missing
      let assessmentQuestions = await prisma.assessmentQuestion.findMany({
        where: { assessmentId: effectiveAssessmentId },
      });

      if (assessmentQuestions.length === 0) {
        const questionRowsSample = firstRawRows.filter((r) => typeof (r as unknown[])[2] === "number");
        const questionsToCreate = [];

        for (const row of questionRowsSample) {
          const r = row as unknown[];
          const questionNo = r[2] as number;
          const subjectRaw = String(r[4] ?? "").trim();
          const subject = mapSubjectName(subjectRaw) || subjectRaw.toUpperCase() || "General";
          const correctKey = String(r[9] ?? "").trim().toUpperCase() || null;
          const marks = parseFloat(String(r[13] ?? "1")) || 1;

          questionsToCreate.push({
            assessmentId: effectiveAssessmentId,
            questionNo,
            subject,
            maxMarks: marks > 0 ? marks : 1,
            correctKey,
          });
        }

        if (questionsToCreate.length > 0) {
          for (const q of questionsToCreate) {
            await prisma.assessmentQuestion.upsert({
              where: { assessmentId_questionNo: { assessmentId: effectiveAssessmentId, questionNo: q.questionNo } },
              update: { subject: q.subject, correctKey: q.correctKey, maxMarks: q.maxMarks },
              create: q,
            });
          }
          assessmentQuestions = await prisma.assessmentQuestion.findMany({
            where: { assessmentId: effectiveAssessmentId },
          });
        }
      }

      const qMap = new Map(assessmentQuestions.map((q) => [q.questionNo, q]));
      let studentsProcessed = 0;
      let responsesCreated = 0;
      let skipped = 0;
      const errors: string[] = [];

      for (const sheetName of dataSheets) {
        const ws = workbook.Sheets[sheetName];
        if (!ws) continue;
        const rawRows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "" }) as unknown[][];

        // Extract roll number from row index 7, col 3 (or scan top 10 rows for "Roll No")
        let rollNo = String(rawRows[7]?.[3] ?? "").trim();
        let studentName = String(rawRows[6]?.[3] ?? "").trim();

        if (!rollNo) {
          for (let r = 0; r < Math.min(rawRows.length, 12); r++) {
            const row = rawRows[r];
            if (!Array.isArray(row)) continue;
            const idx = row.findIndex((c) => /roll\s*no/i.test(String(c ?? "")));
            if (idx >= 0 && row[idx + 1] !== undefined && String(row[idx + 1]).trim() !== "") {
              rollNo = String(row[idx + 1]).trim();
              break;
            } else if (idx >= 0 && row[idx + 2] !== undefined && String(row[idx + 2]).trim() !== "") {
              rollNo = String(row[idx + 2]).trim();
              break;
            }
          }
        }

        if (!rollNo) { skipped++; continue; }

        // Find or auto-create student
        let student = await prisma.student.findUnique({ where: { rollNo } });
        if (!student) {
          student = await prisma.student.create({
            data: {
              rollNo,
              name: studentName || `Student ${rollNo}`,
              batchId: targetBatch.id,
            },
          });
        } else if (studentName && (student.name.startsWith("Student ") || student.name !== studentName)) {
          student = await prisma.student.update({
            where: { id: student.id },
            data: { name: studentName },
          });
        }

        // Extract score, percent, rank
        const scoreStr = String(rawRows[9]?.[3] ?? "0").trim();
        const totalMarksScored = parseFloat(scoreStr.split("/")[0]) || 0;
        const percent = parseFloat(String(rawRows[10]?.[3] ?? "0")) || Number(((totalMarksScored / (assessment.totalMarks || 160)) * 100).toFixed(2));
        const rank = parseInt(String(rawRows[11]?.[3] ?? "1"), 10) || 1;

        // Find or auto-create testResult
        let testResult = await prisma.testResult.findUnique({
          where: { assessmentId_studentId: { assessmentId: effectiveAssessmentId, studentId: student.id } },
        });

        if (!testResult) {
          testResult = await prisma.testResult.create({
            data: {
              assessmentId: effectiveAssessmentId,
              studentId: student.id,
              totalMarks: totalMarksScored,
              percentage: percent,
              percentile: Math.max(1, 100 - (rank * 2)),
              campusRank: rank,
              overallRank: rank,
              present: true,
            },
          });
        }

        // Delete existing responses for idempotency
        await prisma.studentQuestionResponse.deleteMany({ where: { testResultId: testResult.id } });

        // Parse question rows: question number is a number in col 2
        const questionRows = rawRows.filter((r) => typeof (r as unknown[])[2] === "number");
        const responseData: {
          testResultId: string;
          assessmentQuestionId: string;
          studentAnswer: string | null;
          result: AttemptResult;
          marksScored: number;
        }[] = [];

        for (const row of questionRows) {
          const r = row as unknown[];
          const questionNo = r[2] as number;
          const studentAnswer = String(r[7] ?? "").trim().toUpperCase() || null;
          const resultCode = String(r[11] ?? "").trim().toUpperCase();
          const marksScored = parseFloat(String(r[13] ?? "0")) || 0;
          const q = qMap.get(questionNo);
          if (!q) continue;

          const result: AttemptResult =
            resultCode === "P"
              ? "CORRECT"
              : studentAnswer === null || studentAnswer === ""
              ? "UNATTEMPTED"
              : "WRONG";

          responseData.push({
            testResultId: testResult.id,
            assessmentQuestionId: q.id,
            studentAnswer,
            result,
            marksScored,
          });
        }

        if (responseData.length > 0) {
          await prisma.studentQuestionResponse.createMany({ data: responseData });
          responsesCreated += responseData.length;
          await computeSubtopicSummary(testResult.id, effectiveAssessmentId);
        }
        studentsProcessed++;
      }

      // Background AI summary
      generateAssessmentSummary(effectiveAssessmentId).catch((err) => {
        console.error("Failed to generate AI summary in background:", err);
      });

      return NextResponse.json({
        imported: responsesCreated,
        studentsProcessed,
        skipped,
        assessmentTitle: assessment.title,
        batchName: targetBatch.name,
        errors: errors.slice(0, 10),
        message: `Imported ${responsesCreated} question responses across ${studentsProcessed} students for "${assessment.title}".`,
      });
    }

    // ─── STANDARD RESULTS / STUDENTS UPLOAD ──────────────────────────────────
    const parsedSheets = workbook.SheetNames
      .map((sheetName) => parseWorksheet(sheetName, workbook.Sheets[sheetName]))
      .filter((sheet): sheet is ParsedSheetData => Boolean(sheet));

    if (parsedSheets.length === 0) {
      return NextResponse.json(
        { error: "No valid student data found in any spreadsheet sheet" },
        { status: 400 }
      );
    }

    const targetBatch = await resolveTargetBatch(
      requestedBatchId,
      parsedSheets[0].inferredStream,
      isSuper,
      userCampusId
    );

    let studentsCreated = 0;
    let studentsUpdated = 0;
    let skipped = 0;
    let resultsImported = 0;
    const studentMap = new Map<string, string>();
    const allRowsByRoll = new Map<string, ParsedRowData>();

    for (const sheet of parsedSheets) {
      for (const item of sheet.parsedData) allRowsByRoll.set(item.rollNo, item);
    }

    const uniqueStudentRows = Array.from(allRowsByRoll.values());
    const rollNos = uniqueStudentRows.map((r) => r.rollNo);

    // Bulk-fetch all existing students in 1 single database query
    const existingStudentsList = await prisma.student.findMany({
      where: { rollNo: { in: rollNos } },
      include: { batch: true },
    });
    const existingMap = new Map(existingStudentsList.map((s) => [s.rollNo, s]));

    // Parallelize student upserts in controlled chunks of 10 to protect connection pool
    const studentChunks = [];
    for (let i = 0; i < uniqueStudentRows.length; i += 10) {
      studentChunks.push(uniqueStudentRows.slice(i, i + 10));
    }

    for (const chunk of studentChunks) {
      await Promise.all(
        chunk.map(async (item) => {
          const existing = existingMap.get(item.rollNo);
          if (existing) {
            if (!isSuper && userCampusId && existing.batch.campusId !== userCampusId) {
              skipped++;
              return;
            }
            studentMap.set(item.rollNo, existing.id);
            const updateData: { name?: string; phone?: string; batchId?: string } = {};
            if (item.name && item.name !== existing.name) updateData.name = item.name;
            if (item.phone && item.phone !== existing.phone) updateData.phone = item.phone;
            if (requestedBatchId && targetBatch.id && existing.batchId !== targetBatch.id) {
              updateData.batchId = targetBatch.id;
            }

            if (Object.keys(updateData).length > 0) {
              await prisma.student.update({
                where: { id: existing.id },
                data: updateData,
              });
              studentsUpdated++;
            }
          } else {
            const created = await prisma.student.create({
              data: {
                rollNo: item.rollNo,
                name: item.name,
                phone: item.phone,
                batchId: targetBatch.id,
              },
            });
            studentMap.set(item.rollNo, created.id);
            studentsCreated++;
          }
        })
      );
    }

    if (uploadType === "students") {
      return NextResponse.json({
        imported: uniqueStudentRows.length,
        skipped,
        studentsCreated,
        studentsUpdated,
        sheetsProcessed: parsedSheets.length,
        assessments: [],
        message: `Processed ${uniqueStudentRows.length} students from ${parsedSheets.length} sheet(s) into class "${targetBatch.name}" (${targetBatch.campus.name}).`,
      });
    }

    const importedAssessments = [];
    let assessmentsOverwritten = 0;

    for (const sheet of parsedSheets) {
      const finalMaxMarks = sheet.maxMarks ?? (targetBatch.stream === "NEET" ? 720 : 300);
      const assessmentTitle = weekNumber ? `${sheet.title} - Week ${weekNumber}` : sheet.title;
      const existingAssessments = await prisma.assessment.findMany({
        where: {
          batchId: targetBatch.id,
          title: assessmentTitle,
        },
        select: { id: true },
      });

      for (const existingAssessment of existingAssessments) {
        await prisma.assessment.delete({ where: { id: existingAssessment.id } });
        assessmentsOverwritten++;
      }

      const assessment = await prisma.assessment.create({
        data: {
          title: assessmentTitle,
          batchId: targetBatch.id,
          examDate: sheet.examDate,
          totalMarks: finalMaxMarks,
          status: "PUBLISHED",
        },
      });

      for (const sub of sheet.detectedSubjects) {
        await prisma.assessmentSubjectDifficulty.create({
          data: { assessmentId: assessment.id, subject: sub, difficulty: "MODERATE" },
        });
      }

      const cohortRows = sheet.parsedData
        .filter((item) => studentMap.has(item.rollNo))
        .map((item) => ({
          studentId: studentMap.get(item.rollNo)!,
          totalMarks: item.totalMarks,
          maxMarks: finalMaxMarks,
        }));

      const standardized = standardizeAssessment(cohortRows);
      const subjectCount = sheet.detectedSubjects.length || 3;
      const maxMarksPerSubject = finalMaxMarks / subjectCount;
      let sheetImported = 0;

      // Parallelize test result creations in chunks of 10
      const parsedDataChunks = [];
      for (let i = 0; i < sheet.parsedData.length; i += 10) {
        parsedDataChunks.push(sheet.parsedData.slice(i, i + 10));
      }

      for (const chunk of parsedDataChunks) {
        await Promise.all(
          chunk.map(async (item) => {
            const studentId = studentMap.get(item.rollNo);
            if (!studentId) {
              skipped++;
              return;
            }

            const std = standardized.get(studentId);
            const computedPercentage =
              item.percentage !== undefined
                ? item.percentage
                : std?.percentage ?? Number(((item.totalMarks / finalMaxMarks) * 100).toFixed(2));
            const computedCampusRank = item.rank || std?.campusRank || 1;

            const explicitSubjectScores = item.subjectScores.map((s) => ({
              subject: s.subject,
              marks: s.marks,
              maxMarks: maxMarksPerSubject,
            }));
            const fallbackSubjectScores = sheet.detectedSubjects.map((sub) => ({
              subject: sub,
              marks: Number((item.totalMarks / sheet.detectedSubjects.length).toFixed(1)),
              maxMarks: maxMarksPerSubject,
            }));

            await prisma.testResult.create({
              data: {
                assessmentId: assessment.id,
                studentId,
                totalMarks: item.totalMarks,
                percentage: computedPercentage,
                percentile: std?.percentile ?? 100,
                zScore: std?.zScore ?? 0,
                campusRank: computedCampusRank,
                overallRank: computedCampusRank,
                present: true,
                subjectScores: {
                  create: explicitSubjectScores.length > 0 ? explicitSubjectScores : fallbackSubjectScores,
                },
              },
            });

            sheetImported++;
            resultsImported++;
          })
        );
      }

      // Parallelize performance trends computation in chunks of 10
      for (const chunk of parsedDataChunks) {
        await Promise.all(
          chunk.map(async (item) => {
            const studentId = studentMap.get(item.rollNo);
            if (!studentId) return;

            const studentResults = await prisma.testResult.findMany({
              where: { studentId },
              orderBy: { assessment: { examDate: "asc" } },
              include: { assessment: true },
            });

            const percentiles = studentResults.map((r) => r.percentile ?? 0);
            const percentages = studentResults.map((r) => r.percentage);
            const latestIdx = studentResults.findIndex((r) => r.assessmentId === assessment.id);

            if (latestIdx >= 0) {
              const recent = percentiles.slice(0, latestIdx + 1);
              const prevPercentile = latestIdx > 0 ? percentiles[latestIdx - 1] : percentiles[latestIdx];
              const drift = classifyDrift(prevPercentile, percentiles[latestIdx], recent);

              await prisma.performanceTrend.upsert({
                where: { studentId_assessmentId: { studentId, assessmentId: assessment.id } },
                update: {
                  rollingAvg3: rollingAverage(percentages.slice(0, latestIdx + 1), 3),
                  rollingAvg5: rollingAverage(percentages.slice(0, latestIdx + 1), 5),
                  velocity: computeVelocity(percentages.slice(0, latestIdx + 1)),
                  driftStatus: drift,
                  statusFrom: latestIdx > 0 ? percentiles[latestIdx - 1] : null,
                  statusTo: percentiles[latestIdx],
                },
                create: {
                  studentId,
                  assessmentId: assessment.id,
                  rollingAvg3: rollingAverage(percentages.slice(0, latestIdx + 1), 3),
                  rollingAvg5: rollingAverage(percentages.slice(0, latestIdx + 1), 5),
                  velocity: computeVelocity(percentages.slice(0, latestIdx + 1)),
                  driftStatus: drift,
                  statusFrom: latestIdx > 0 ? percentiles[latestIdx - 1] : null,
                  statusTo: percentiles[latestIdx],
                },
              });
            }
          })
        );
      }

      const top15Results = await prisma.testResult.findMany({
        where: { assessmentId: assessment.id },
        orderBy: { percentile: "desc" },
        take: 15,
        include: { student: true },
      });

      const top15Json = top15Results.map((r) => ({
        studentId: r.studentId,
        name: r.student.name,
        percentile: r.percentile,
        totalMarks: r.totalMarks,
        rank: r.campusRank,
      }));

      await prisma.campusRankSummary.upsert({
        where: {
          assessmentId_campusId: {
            assessmentId: assessment.id,
            campusId: targetBatch.campusId,
          },
        },
        update: { top15Json },
        create: { assessmentId: assessment.id, campusId: targetBatch.campusId, top15Json },
      });

      importedAssessments.push({
        id: assessment.id,
        title: assessment.title,
        sheetName: sheet.sheetName,
        examDate: assessment.examDate,
        totalMarks: assessment.totalMarks,
        imported: sheetImported,
        batchName: targetBatch.name,
        campusName: targetBatch.campus.name,
      });
    }

    return NextResponse.json({
      imported: resultsImported,
      skipped,
      studentsCreated,
      studentsUpdated,
      assessmentsOverwritten,
      weekNumber: weekNumber || null,
      sheetsProcessed: parsedSheets.length,
      assessment: importedAssessments[0],
      assessments: importedAssessments,
      subjects: Array.from(new Set(parsedSheets.flatMap((s) => s.detectedSubjects))),
      message: `Imported ${importedAssessments.length} assessment(s) from ${parsedSheets.length} sheet(s) into class "${targetBatch.name}" with ${resultsImported} results.${assessmentsOverwritten ? ` Replaced ${assessmentsOverwritten} existing assessment(s) for Week ${weekNumber || "same title"}.` : ""}`,
    });
  } catch (e) {
    console.error("Upload error:", e);
    if (e instanceof Error && e.message === "FORBIDDEN_BATCH") {
      return NextResponse.json(
        { error: "Forbidden. You cannot upload to a class belonging to another center." },
        { status: 403 }
      );
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to process upload" },
      { status: 500 }
    );
  }
}
