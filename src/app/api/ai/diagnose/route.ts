import { NextResponse } from "next/server";
import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";
import { prisma } from "@/lib/db";
import { getSession, isSuperAdmin, isCenterAdmin, canAccessCampus } from "@/lib/auth";
import { buildStudentPayload, buildPrompt, generateFallbackReport } from "@/lib/ai";

export async function POST(req: Request) {
  const session = await getSession(req);
  const { studentId } = await req.json().catch(() => ({}));
  
  if (!studentId) {
    return NextResponse.json({ error: "studentId required" }, { status: 400 });
  }

  // Check authorization: Super Admins can view any student
  // Center Admins can only view students in their own campus
  if (isCenterAdmin(session)) {
    // Get the student's batch and check campus scope
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { batch: true },
    });
    
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }
    
    if (!canAccessCampus(session, student.batch.campusId)) {
      return NextResponse.json(
        { error: "Forbidden. You can only generate diagnostic reports for students in your center." },
        { status: 403 }
      );
    }
  }

  try {
    const payload = await buildStudentPayload(studentId);
    const apiKey = process.env.GEMINI_API_KEY;

    // Try Gemini if key available
    if (apiKey) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
          model: "gemini-1.5-flash",
          safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          ],
        });
        const prompt = buildPrompt(payload);
        const result = await model.generateContent(prompt);
        const text = result.response.text();

        const summary =
          text.match(/SUMMARY:\s*(.+)/i)?.[1]?.trim() ?? text.split("\n")[0] ?? "No summary generated.";
        const strongMatch = text.match(/STRONG:\s*(.+)/i)?.[1]?.trim();
        const weakMatch = text.match(/WEAK:\s*(.+)/i)?.[1]?.trim();
        const planMatch = text.match(/REVISION_PLAN:\s*([\s\S]*)/i)?.[1]?.trim();

        const strongSubjects = strongMatch
          ? strongMatch.split(",").map((s) => s.trim())
          : payload.subjectBreakdown.strongSubjects;
        const weakSubjects = weakMatch
          ? weakMatch.split(",").map((s) => s.trim())
          : payload.subjectBreakdown.weakSubjects;
        const revisionPlan = planMatch ?? "See recommended subjects and focus areas above.";

        const report = await prisma.diagnosticReport.create({
          data: {
            studentId,
            summary,
            strongSubjects: strongSubjects,
            weakSubjects: weakSubjects,
            revisionPlan,
            model: "gemini-1.5-flash",
            fallbackUsed: false,
          },
        });
        return NextResponse.json({ report });
      } catch (geminiError) {
        console.error("Gemini error, falling back:", geminiError);
        // Fall through to fallback
      }
    }

    // Fallback path
    const fb = generateFallbackReport(payload);
    const report = await prisma.diagnosticReport.create({
      data: {
        studentId,
        summary: fb.summary,
        strongSubjects: fb.strongSubjects,
        weakSubjects: fb.weakSubjects,
        revisionPlan: fb.revisionPlan,
        model: "template-fallback",
        fallbackUsed: true,
      },
    });
    return NextResponse.json({
      report: { ...report, strongSubjects: fb.strongSubjects, weakSubjects: fb.weakSubjects },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
  }
}