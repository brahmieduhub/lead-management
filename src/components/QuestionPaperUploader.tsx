"use client";

import { useState } from "react";
import { CANONICAL_TAXONOMY, normalizeSubjectName } from "@/lib/subtopicTaxonomy";

interface QuestionItem {
  questionNo: number;
  subject: string;
  chapter: string;
  subtopic: string;
  correctKey: string | null;
  maxMarks: number;
  snippet?: string;
}

interface QuestionPaperUploaderProps {
  assessmentId: string;
  assessmentTitle: string;
  stream: string;
  onSaved?: () => void;
}

export default function QuestionPaperUploader({
  assessmentId,
  assessmentTitle,
  stream,
  onSaved,
}: QuestionPaperUploaderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [rawText, setRawText] = useState("");
  const [defaultSubject, setDefaultSubject] = useState(stream === "NEET" ? "Botany" : "Physics");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [parsedQuestions, setParsedQuestions] = useState<QuestionItem[]>([]);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const subjects = stream === "NEET"
    ? ["Physics", "Chemistry", "Botany", "Zoology"]
    : stream === "JEE"
    ? ["Physics", "Chemistry", "Mathematics"]
    : Object.keys(CANONICAL_TAXONOMY);

  async function handleAutoTag() {
    if (!rawText.trim()) {
      setStatusMessage({ type: "error", text: "Please paste or enter the question paper text first." });
      return;
    }

    setLoading(true);
    setStatusMessage(null);

    try {
      const res = await fetch("/api/ai/tag-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: rawText,
          stream,
          defaultSubject,
        }),
      });

      const data = await res.json();
      setLoading(false);

      if (res.ok && data.questions) {
        setParsedQuestions(data.questions);
        setStatusMessage({
          type: "success",
          text: `Auto-tagged ${data.questions.length} questions into topics and subtopics using ${data.engine}!`,
        });
      } else {
        setStatusMessage({ type: "error", text: data.error || "Failed to decompose questions." });
      }
    } catch (err: any) {
      setLoading(false);
      setStatusMessage({ type: "error", text: "Network error during question tagging." });
    }
  }

  async function handleSaveQuestions() {
    if (parsedQuestions.length === 0) return;

    setSaving(true);
    setStatusMessage(null);

    try {
      const res = await fetch(`/api/assessments/${assessmentId}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions: parsedQuestions }),
      });

      const data = await res.json();
      setSaving(false);

      if (res.ok) {
        setStatusMessage({ type: "success", text: data.message || "Questions saved and diagnostics refreshed!" });
        setTimeout(() => {
          setIsOpen(false);
          if (onSaved) onSaved();
          window.location.reload();
        }, 1200);
      } else {
        setStatusMessage({ type: "error", text: data.error || "Failed to save questions." });
      }
    } catch (err: any) {
      setSaving(false);
      setStatusMessage({ type: "error", text: "Network error saving questions." });
    }
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setRawText(content);
    };
    reader.readAsText(file);
  }

  return (
    <div>
      <button
        onClick={() => setIsOpen(true)}
        className="btn-primary text-xs flex items-center gap-1.5 shadow-sm"
      >
        <span>📄</span>
        <span>Upload / Paste Question Paper (AI Auto-Tag)</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-slate-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 rounded-t-2xl">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <span>📄</span>
                  <span>Decompose Question Paper into Standard Topics & Subtopics</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Target Assessment: <strong className="text-slate-800">{assessmentTitle}</strong>
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {statusMessage && (
                <div
                  className={`p-3 rounded-xl text-xs font-medium ${
                    statusMessage.type === "success"
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : "bg-red-50 text-red-800 border border-red-200"
                  }`}
                >
                  {statusMessage.text}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Primary / Default Subject
                  </label>
                  <select
                    value={defaultSubject}
                    onChange={(e) => setDefaultSubject(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-white"
                  >
                    {subjects.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Upload Text / Markdown / CSV File
                  </label>
                  <input
                    type="file"
                    accept=".txt,.csv,.json,.md"
                    onChange={handleFileUpload}
                    className="w-full text-xs p-1.5 border border-slate-300 rounded-xl file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary-50 file:text-primary-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Paste Question Paper Text (Numbered questions Q1..N with options or answer keys)
                </label>
                <textarea
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder={`Example:
Q1. A body of mass 2kg is moving with uniform velocity along a straight line. What is the net force? (Ans: A)
Q2. What is the hybridization of PCl5 in gas phase? (Ans: B)
Q3. In C3 pathway, the primary CO2 acceptor molecule is? (Ans: C)`}
                  rows={7}
                  className="w-full text-xs font-mono p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:outline-none bg-slate-50/50"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleAutoTag}
                  disabled={loading || !rawText.trim()}
                  className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      <span>Decomposing & Mapping with AI...</span>
                    </>
                  ) : (
                    <>
                      <span>✨</span>
                      <span>Auto-Tag Topics & Subtopics with AI</span>
                    </>
                  )}
                </button>
              </div>

              {/* Preview Table of Decomposed Questions */}
              {parsedQuestions.length > 0 && (
                <div className="border border-slate-200 rounded-xl overflow-hidden mt-4">
                  <div className="bg-slate-100 px-4 py-2.5 flex items-center justify-between border-b border-slate-200">
                    <span className="text-xs font-bold text-slate-800">
                      Decomposed Questions ({parsedQuestions.length} Questions Tagged)
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Standardized to Canonical Repository
                    </span>
                  </div>

                  <div className="max-h-72 overflow-y-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-xs">
                      <thead className="bg-slate-50 text-slate-600 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-center w-12">Q#</th>
                          <th className="px-3 py-2 text-left">Subject</th>
                          <th className="px-3 py-2 text-left">Chapter / Topic</th>
                          <th className="px-3 py-2 text-left">Standard Subtopic</th>
                          <th className="px-3 py-2 text-center w-16">Key</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {parsedQuestions.map((q, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="px-3 py-2 text-center font-mono font-bold text-slate-700">
                              {q.questionNo}
                            </td>
                            <td className="px-3 py-2 font-semibold text-slate-800">
                              {q.subject}
                            </td>
                            <td className="px-3 py-2 text-slate-600">{q.chapter}</td>
                            <td className="px-3 py-2 text-primary-700 font-medium">
                              {q.subtopic}
                            </td>
                            <td className="px-3 py-2 text-center font-mono font-bold text-slate-800">
                              {q.correctKey || "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between rounded-b-2xl">
              <span className="text-xs text-slate-500">
                {parsedQuestions.length > 0 ? `${parsedQuestions.length} questions ready to save` : "No questions parsed yet"}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="btn-secondary text-xs px-3.5 py-1.5"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveQuestions}
                  disabled={saving || parsedQuestions.length === 0}
                  className="btn-primary text-xs px-4 py-1.5 disabled:opacity-50 shadow-xs"
                >
                  {saving ? "Saving to Database..." : "Save Questions & Refresh Diagnostics"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
