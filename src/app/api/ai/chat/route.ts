import { NextResponse } from "next/server";
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { buildStudentPayload } from "@/lib/ai";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { message, studentId, assessmentId, batchId, history = [] } = await req.json().catch(() => ({}));

  if (!message || typeof message !== "string" || !message.trim()) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  try {
    let contextData: any = {};

    // 1. Fetch Student Context if studentId is provided
    if (studentId) {
      try {
        const studentPayload = await buildStudentPayload(studentId);
        contextData.student = studentPayload;
      } catch (err) {
        console.warn("Could not load student payload:", err);
      }
    }

    // 2. Fetch Assessment / Batch Context if assessmentId is provided
    if (assessmentId) {
      const assessment = await prisma.assessment.findUnique({
        where: { id: assessmentId },
        include: {
          batch: { include: { campus: true } },
          _count: { select: { testResults: true, assessmentQuestions: true } },
        },
      });
      if (assessment) {
        const topResults = await prisma.testResult.findMany({
          where: { assessmentId },
          orderBy: { totalMarks: "desc" },
          take: 5,
          include: { student: true },
        });
        contextData.assessment = {
          title: assessment.title,
          batchName: assessment.batch.name,
          campus: assessment.batch.campus.name,
          totalMarks: assessment.totalMarks,
          totalStudents: assessment._count.testResults,
          totalQuestions: assessment._count.assessmentQuestions,
          topStudents: topResults.map((r) => ({
            name: r.student.name,
            rollNo: r.student.rollNo,
            marks: r.totalMarks,
            rank: r.campusRank,
          })),
        };
      }
    }

    // 3. Construct System Prompt with Data Context
    const systemPrompt = `You are "EduTestPro AI Coach", an expert academic AI analytics assistant for JEE and NEET coaching centers.
You assist faculty, academic directors, and mentors by analyzing student exam scores, subtopic error logs, subject drifts, and question attempts.

Current User: ${session.name} (${session.role})
Academic Context:
${JSON.stringify(contextData, null, 2)}

Guidelines:
1. Answer plain-text questions accurately based on the provided student & test data.
2. If asked to draft messages for parents (e.g. WhatsApp / SMS), write clear, encouraging, and specific updates mentioning exact marks, strengths, and areas needing attention.
3. If asked about weak chapters or remedial plans, recommend specific topics and practice strategies (e.g., 20 MCQs on specific subtopic).
4. Use concise formatting with bullet points, bold highlights, and clean tables where appropriate.
5. If data is missing or not yet uploaded, state it politely and suggest uploading the corresponding assessment or question-wise analysis sheet.`;

    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
          model: "gemini-1.5-flash",
          safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          ],
        });

        // Format conversational history
        const formattedHistory = history.map((h: any) => ({
          role: h.role === "user" ? "user" : "model",
          parts: [{ text: h.text }],
        }));

        const chat = model.startChat({
          history: [
            { role: "user", parts: [{ text: systemPrompt }] },
            { role: "model", parts: [{ text: "Understood. I am EduTestPro AI Coach. How can I assist you with this student or assessment data?" }] },
            ...formattedHistory,
          ],
        });

        const result = await chat.sendMessage(message);
        const reply = result.response.text();

        return NextResponse.json({
          reply,
          modelUsed: "gemini-1.5-flash",
        });
      } catch (geminiError: any) {
        console.error("Gemini Chat Error, using fallback:", geminiError);
      }
    }

    // Fallback response generator if Gemini key is missing or errored
    const fallbackReply = generateChatFallback(message, contextData);
    return NextResponse.json({
      reply: fallbackReply,
      modelUsed: "local-rule-engine",
    });
  } catch (error: any) {
    console.error("Chat API error:", error);
    return NextResponse.json({ error: error.message || "Failed to process chat query" }, { status: 500 });
  }
}

function generateChatFallback(query: string, context: any): string {
  const q = query.toLowerCase();
  const student = context.student?.student;
  const last3 = context.student?.last3Results || [];
  const weakSubs = context.student?.subjectBreakdown?.weakSubjects || [];
  const strongSubs = context.student?.subjectBreakdown?.strongSubjects || [];
  const weakSubtopics = context.student?.subtopicInsights?.persistentWeakSubtopics || [];

  if (q.includes("whatsapp") || q.includes("parent") || q.includes("message")) {
    const latestTest = last3[last3.length - 1];
    return `📱 **Draft WhatsApp Message for Parent:**
---
*Dear Parent,*
Here is the academic performance update for **${student?.name || "your child"}** (Roll No: ${student?.rollNo || "N/A"}):

📊 **Latest Assessment:** ${latestTest?.assessment || "Recent Mock"}
• **Score:** ${latestTest?.percentage?.toFixed(1) || "N/A"}% (Percentile: ${latestTest?.percentile?.toFixed(1) || "N/A"})
• **Strong Subject(s):** ${strongSubs.join(", ") || "General"}
• **Focus Area(s):** ${weakSubs.join(", ") || "Practice required"}

💡 *Faculty Recommendation:* Dedicated practice on ${weakSubtopics[0]?.subtopic || weakSubs[0] || "core concepts"} this week will help boost upcoming test rankings.

Best regards,
*Academic Director, EduTestPro*`;
  }

  if (q.includes("weak") || q.includes("subtopic") || q.includes("chapter")) {
    if (weakSubtopics.length > 0) {
      return `🔍 **Weak Subtopics Identified for ${student?.name || "Student"}:**
${weakSubtopics.map((s: any, idx: number) => `${idx + 1}. **${s.subject}** - ${s.chapter} (*${s.subtopic}*): ${s.latestAccuracy}% accuracy`).join("\n")}

🎯 **Actionable Advice:** Assign 20-30 level-1 and level-2 MCQs focusing on ${weakSubtopics[0]?.subtopic || "these areas"} before the next weekend mock test.`;
    }
    return `🔍 **Subject Analysis for ${student?.name || "Student"}:**
• **Weakest Subjects:** ${weakSubs.join(", ") || "None flagged"}
• **Strongest Subjects:** ${strongSubs.join(", ") || "Consistent across subjects"}
• **Latest Score:** ${last3[last3.length - 1]?.percentage || "N/A"}%`;
  }

  if (q.includes("top") || q.includes("rank") || q.includes("compare")) {
    if (context.assessment?.topStudents) {
      return `🏆 **Top Performers in ${context.assessment.title}:**
${context.assessment.topStudents.map((s: any) => `• **#${s.rank}** ${s.name} (${s.rollNo}) — **${s.marks}/${context.assessment.totalMarks} Marks**`).join("\n")}`;
    }
    return `📈 **Performance Summary for ${student?.name || "Student"}:**
• **Class:** ${student?.batch || "N/A"}
• **Tests Recorded:** ${last3.length}
• **Trajectory:** ${context.student?.latestTrend?.driftStatus || "Stable"}`;
  }

  return `📊 **Academic Insight for ${student?.name || "Student"}:**
• **Student:** ${student?.name || "Selected Student"} (${student?.rollNo || ""})
• **Strongest Subject(s):** ${strongSubs.join(", ") || "N/A"}
• **Areas for Improvement:** ${weakSubs.join(", ") || "N/A"}
• **Last Recorded Mock:** ${last3[last3.length - 1]?.assessment || "N/A"} (${last3[last3.length - 1]?.percentage || 0}%)

*You can ask me to draft a parent update, analyze weak subtopics, or generate a 7-day study plan!*`;
}
