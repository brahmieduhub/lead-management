"use client";

import { useState } from "react";

interface ExistingReport {
  id: string;
  summary: string;
  strongSubjects: unknown;
  weakSubjects: unknown;
  revisionPlan: string;
  fallbackUsed: boolean;
  createdAt: Date;
}

export default function DiagnosticReport({
  studentId,
  existing,
}: {
  studentId: string;
  existing?: ExistingReport | null;
}) {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<ExistingReport | null>(existing ?? null);
  const [error, setError] = useState("");

  async function generate() {
    setLoading(true);
    setError("");
    const res = await fetch("/api/ai/diagnose", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Failed to generate report");
      return;
    }
    setReport(data.report);
  }

  const strong: string[] = Array.isArray(report?.strongSubjects)
    ? (report.strongSubjects as string[])
    : [];
  const weak: string[] = Array.isArray(report?.weakSubjects)
    ? (report.weakSubjects as string[])
    : [];

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="font-semibold">AI Diagnostic Report</h2>
        <button onClick={generate} disabled={loading} className="btn-primary">
          {loading ? "Generating..." : report ? "Regenerate" : "Generate with Gemini"}
        </button>
      </div>
      {error && <p className="px-5 pt-4 text-sm text-red-600">{error}</p>}
      {!report && !loading && (
        <p className="px-5 py-6 text-sm text-slate-500">
          Generate a personalized diagnostic summary, strong/weak subject insights, and a 7-day
          revision plan using Gemini 1.5 Flash.
        </p>
      )}
      {report && (
        <div className="space-y-4 px-5 py-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-700">Summary</h3>
            <p className="mt-1 text-sm text-slate-600">{report.summary}</p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold text-green-700">Strong Subjects</h3>
              <ul className="mt-1 space-y-1">
                {strong.map((s) => (
                  <li key={s} className="text-sm text-slate-600">
                    ✓ {s}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-red-700">Weak Subjects</h3>
              <ul className="mt-1 space-y-1">
                {weak.map((s) => (
                  <li key={s} className="text-sm text-slate-600">
                    ✗ {s}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-700">7-Day Revision Plan</h3>
            <pre className="mt-1 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
              {report.revisionPlan}
            </pre>
          </div>
          <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-400">
            <span>{report.fallbackUsed ? "Template fallback (no API key)" : "Gemini 1.5 Flash"}</span>
<span>{new Date(report.createdAt).toISOString().split("T")[0]}</span>
          </div>
        </div>
      )}
    </div>
  );
}