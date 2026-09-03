import { NextResponse } from "next/server";
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { getSession } from "@/lib/auth";
import { CANONICAL_TAXONOMY, findBestMatchingSubtopic, normalizeSubjectName } from "@/lib/subtopicTaxonomy";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { text, stream = "BOTH", defaultSubject, questions = [] } = await req.json().catch(() => ({}));

  if ((!text || !text.trim()) && (!Array.isArray(questions) || questions.length === 0)) {
    return NextResponse.json({ error: "Question paper text or questions array is required" }, { status: 400 });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;

    // Build the taxonomy prompt guide for the AI
    const taxonomySummary = Object.entries(CANONICAL_TAXONOMY).map(([subj, data]) => ({
      subject: subj,
      chapters: data.chapters.map((c) => ({
        chapter: c.name,
        subtopics: c.subtopics.map((s) => s.name),
      })),
    }));

    if (apiKey) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
          model: "gemini-1.5-flash",
          generationConfig: { responseMimeType: "application/json" },
          safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
          ],
        });

        const prompt = `You are an expert JEE & NEET examination parser.
Analyze the following Question Paper text and decompose each question into a structured JSON array.
Every single question MUST be categorized into one of the canonical subjects, chapters, and subtopics from the repository below.

Canonical Repository:
${JSON.stringify(taxonomySummary, null, 2)}

Requirements:
1. Extract question number, subject (Physics, Chemistry, Mathematics, Botany, or Zoology), chapter, and subtopic (MUST match an exact subtopic from the taxonomy above).
2. If answer key (A, B, C, D) is indicated in the text, extract correctKey.
3. If max marks is indicated or standard (JEE=4, NEET=4, EAPCET=1), set maxMarks.
4. Extract a short 10-15 word snippet of the question text.

Return a JSON array of objects with the exact schema:
[
  {
    "questionNo": 1,
    "subject": "Physics",
    "chapter": "Kinematics",
    "subtopic": "Motion in a Straight Line (1D)",
    "correctKey": "A",
    "maxMarks": 1,
    "snippet": "A particle moves with uniform acceleration..."
  }
]

Question Paper Content:
${text || JSON.stringify(questions)}
`;

        const result = await model.generateContent(prompt);
        const jsonText = result.response.text();
        const parsed = JSON.parse(jsonText);

        if (Array.isArray(parsed) && parsed.length > 0) {
          // Normalize and validate parsed results
          const validated = parsed.map((q, idx) => ({
            questionNo: q.questionNo || idx + 1,
            subject: normalizeSubjectName(q.subject || defaultSubject || "Physics"),
            chapter: q.chapter || "General",
            subtopic: q.subtopic || "Core Principles",
            correctKey: q.correctKey ? String(q.correctKey).toUpperCase().trim() : null,
            maxMarks: typeof q.maxMarks === "number" ? q.maxMarks : 1,
            snippet: q.snippet || "",
          }));

          return NextResponse.json({
            success: true,
            count: validated.length,
            questions: validated,
            engine: "gemini-1.5-flash",
          });
        }
      } catch (geminiErr) {
        console.warn("Gemini question tagging error, falling back to rule engine:", geminiErr);
      }
    }

    // Deterministic Fallback Parser: Split by question patterns (e.g. Q1., 1., Question 1)
    const fallbackQuestions = parseQuestionsFallback(text || "", defaultSubject || "Physics");

    return NextResponse.json({
      success: true,
      count: fallbackQuestions.length,
      questions: fallbackQuestions,
      engine: "rule-matcher",
    });
  } catch (error: any) {
    console.error("Tag questions API error:", error);
    return NextResponse.json({ error: error.message || "Failed to decompose question paper" }, { status: 500 });
  }
}

function parseQuestionsFallback(rawText: string, defaultSubj: string) {
  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const questions: any[] = [];
  let currentQ: any = null;
  let currentSubject = defaultSubj;

  const subjectRegex = /^(PHYSICS|CHEMISTRY|MATHEMATICS|MATHS|BOTANY|ZOOLOGY|BIOLOGY)/i;
  const qNumRegex = /^(?:Q(?:uestion)?\s*(\d+)[\.\):]|\b(\d+)[\.\):])/i;
  const keyRegex = /(?:Ans(?:wer)?|Key)[\s:=]+([A-D])/i;

  for (const line of lines) {
    const subjMatch = line.match(subjectRegex);
    if (subjMatch) {
      currentSubject = normalizeSubjectName(subjMatch[1]);
      continue;
    }

    const qMatch = line.match(qNumRegex);
    if (qMatch) {
      if (currentQ) {
        const match = findBestMatchingSubtopic(currentQ.subject, currentQ.fullText);
        currentQ.chapter = match?.chapter || "General";
        currentQ.subtopic = match?.subtopic || "Core Principles";
        delete currentQ.fullText;
        questions.push(currentQ);
      }

      const qNo = parseInt(qMatch[1] || qMatch[2], 10);
      const keyMatch = line.match(keyRegex);

      currentQ = {
        questionNo: qNo,
        subject: currentSubject,
        chapter: "",
        subtopic: "",
        correctKey: keyMatch ? keyMatch[1].toUpperCase() : null,
        maxMarks: 1,
        snippet: line.slice(0, 100),
        fullText: line,
      };
    } else if (currentQ) {
      currentQ.fullText += " " + line;
      if (!currentQ.correctKey) {
        const keyMatch = line.match(keyRegex);
        if (keyMatch) currentQ.correctKey = keyMatch[1].toUpperCase();
      }
    }
  }

  if (currentQ) {
    const match = findBestMatchingSubtopic(currentQ.subject, currentQ.fullText);
    currentQ.chapter = match?.chapter || "General";
    currentQ.subtopic = match?.subtopic || "Core Principles";
    delete currentQ.fullText;
    questions.push(currentQ);
  }

  // If no numbered lines found, create at least 1 sample question from the text
  if (questions.length === 0 && rawText.trim().length > 0) {
    const match = findBestMatchingSubtopic(currentSubject, rawText);
    questions.push({
      questionNo: 1,
      subject: currentSubject,
      chapter: match?.chapter || "General",
      subtopic: match?.subtopic || "Core Principles",
      correctKey: null,
      maxMarks: 1,
      snippet: rawText.slice(0, 120),
    });
  }

  return questions;
}
