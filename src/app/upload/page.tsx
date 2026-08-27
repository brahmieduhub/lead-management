"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import ClearDataButton from "@/components/ClearDataButton";

interface BatchItem {
  id: string;
  name: string;
  stream: string;
  campus: { name: string };
  _count: { students: number };
}

interface UploadResponse {
  imported: number;
  skipped: number;
  sheetsProcessed?: number;
  assessmentsOverwritten?: number;
  weekNumber?: string | null;
  studentsCreated?: number;
  studentsUpdated?: number;
  assessment?: {
    id: string;
    title: string;
    examDate: string;
    totalMarks: number;
    batchName: string;
    campusName: string;
  };
  assessments?: {
    id: string;
    title: string;
    sheetName: string;
    examDate: string;
    totalMarks: number;
    imported: number;
    batchName: string;
    campusName: string;
  }[];
  subjects?: string[];
  message: string;
}

export default function UploadPage() {
  const [uploadType, setUploadType] = useState<"results" | "students" | "question-mapping" | "question-results">("results");
  const [batchId, setBatchId] = useState<string>("");
  const [assessmentId, setAssessmentId] = useState<string>("");
  const [weekNumber, setWeekNumber] = useState<string>("");
  const [batches, setBatches] = useState<BatchItem[]>([]);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<UploadResponse | null>(null);
  const [error, setError] = useState("");

  function loadData() {
    fetch("/api/batches")
      .then((res) => res.json())
      .then((data) => {
        if (data.batches) setBatches(data.batches);
      })
      .catch(() => {});
      
    fetch("/api/assessments")
      .then((res) => res.json())
      .then((data) => {
        if (data.assessments) setAssessments(data.assessments);
      })
      .catch(() => {});
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Please select an Excel (.xlsx, .xls) or CSV file.");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("uploadType", uploadType);
    if (uploadType === "results" && weekNumber.trim()) {
      formData.append("weekNumber", weekNumber.trim());
    }
    if (batchId) {
      formData.append("batchId", batchId);
    }
    if ((uploadType === "question-mapping" || uploadType === "question-results") && assessmentId) {
      formData.append("assessmentId", assessmentId);
    }

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      setLoading(false);
      if (!res.ok) {
        setError(data.error || "Upload failed. Please check the file format.");
        return;
      }
      setResult(data);
    } catch {
      setLoading(false);
      setError("Network error while uploading file.");
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Upload & Ingest Spreadsheet</h1>
          <p className="text-sm text-slate-500">
            Import all workbook sheets as separate assessments and group students into classes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ClearDataButton onCleared={() => { setResult(null); loadData(); }} />
          <a
            href="/api/upload/sample"
            download="nanomyclassroom_results_sample.xlsx"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <svg className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download Sample (.xlsx)
          </a>
        </div>
      </div>

      {/* Format Visual Guide */}
      <div className="card overflow-hidden border border-slate-200">
        <div className="card-header bg-slate-50 border-b border-slate-200 px-5 py-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-800 text-sm">Supported Spreadsheet Format (NANOmyclassroom)</h2>
            <span className="badge bg-emerald-100 text-emerald-800 text-xs">Multi-Header Auto-Detected</span>
          </div>
        </div>

        <div className="p-5 space-y-3">
          <p className="text-xs text-slate-600">
            The parser automatically extracts the <strong>Institute banner</strong>, <strong>Assessment Title</strong>, <strong>Exam Date</strong>, and <strong>Max Marks</strong> from the top banners, along with subject scores for each student.
          </p>

          <div className="overflow-x-auto rounded-lg border border-slate-300 shadow-sm text-xs font-mono">
            <div className="bg-[#003366] text-white font-bold text-center py-1.5 tracking-wide">
              NANOmyclassroom
            </div>
            <div className="bg-[#E65100] text-white font-bold text-center py-1.5 border-t border-b border-orange-700">
              JR JUNE-MAINS-T-08-  OFFLINE RESULTS-01-08-2026-MAX-300M (STREAM -2)
            </div>
            <table className="w-full text-left divide-y divide-slate-300 bg-white">
              <thead className="bg-slate-100 text-slate-700 font-semibold">
                <tr>
                  <th className="px-2.5 py-1.5 border-r border-slate-200">SNO</th>
                  <th className="px-2.5 py-1.5 border-r border-slate-200">ID</th>
                  <th className="px-2.5 py-1.5 border-r border-slate-200">STUDENT NAME</th>
                  <th className="px-2.5 py-1.5 border-r border-slate-200">MOBILE NO-1</th>
                  <th className="px-2.5 py-1.5 border-r border-slate-200 text-center">PHY</th>
                  <th className="px-2.5 py-1.5 border-r border-slate-200 text-center">CHE</th>
                  <th className="px-2.5 py-1.5 border-r border-slate-200 text-center">MAT</th>
                  <th className="px-2.5 py-1.5 border-r border-slate-200 text-center">TOT</th>
                  <th className="px-2.5 py-1.5 border-r border-slate-200 text-center">%</th>
                  <th className="px-2.5 py-1.5 text-center">RANK</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-sans text-slate-600">
                <tr className="hover:bg-slate-50">
                  <td className="px-2.5 py-1.5 border-r border-slate-200 font-mono">1</td>
                  <td className="px-2.5 py-1.5 border-r border-slate-200 font-mono font-medium text-slate-900">37601</td>
                  <td className="px-2.5 py-1.5 border-r border-slate-200 font-medium text-slate-800">MOHAMMED AYAAZ KHAN</td>
                  <td className="px-2.5 py-1.5 border-r border-slate-200 font-mono text-slate-500">8310684033</td>
                  <td className="px-2.5 py-1.5 border-r border-slate-200 text-center font-mono">56</td>
                  <td className="px-2.5 py-1.5 border-r border-slate-200 text-center font-mono">69</td>
                  <td className="px-2.5 py-1.5 border-r border-slate-200 text-center font-mono">60</td>
                  <td className="px-2.5 py-1.5 border-r border-slate-200 text-center font-mono font-bold text-slate-900">185</td>
                  <td className="px-2.5 py-1.5 border-r border-slate-200 text-center font-mono">61.67</td>
                  <td className="px-2.5 py-1.5 text-center font-mono font-bold text-emerald-600">1</td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="px-2.5 py-1.5 border-r border-slate-200 font-mono">2</td>
                  <td className="px-2.5 py-1.5 border-r border-slate-200 font-mono font-medium text-slate-900">35658</td>
                  <td className="px-2.5 py-1.5 border-r border-slate-200 font-medium text-slate-800">CHALLA AKSHAYA SPHOORTHI</td>
                  <td className="px-2.5 py-1.5 border-r border-slate-200 font-mono text-slate-500">9849439535</td>
                  <td className="px-2.5 py-1.5 border-r border-slate-200 text-center font-mono">45</td>
                  <td className="px-2.5 py-1.5 border-r border-slate-200 text-center font-mono">66</td>
                  <td className="px-2.5 py-1.5 border-r border-slate-200 text-center font-mono">63</td>
                  <td className="px-2.5 py-1.5 border-r border-slate-200 text-center font-mono font-bold text-slate-900">174</td>
                  <td className="px-2.5 py-1.5 border-r border-slate-200 text-center font-mono">58.00</td>
                  <td className="px-2.5 py-1.5 text-center font-mono font-bold text-emerald-600">2</td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="px-2.5 py-1.5 border-r border-slate-200 font-mono">3</td>
                  <td className="px-2.5 py-1.5 border-r border-slate-200 font-mono font-medium text-slate-900">37299</td>
                  <td className="px-2.5 py-1.5 border-r border-slate-200 font-medium text-slate-800">MOHAMMED ALI YASEEN</td>
                  <td className="px-2.5 py-1.5 border-r border-slate-200 font-mono text-slate-500">9885036366</td>
                  <td className="px-2.5 py-1.5 border-r border-slate-200 text-center font-mono">55</td>
                  <td className="px-2.5 py-1.5 border-r border-slate-200 text-center font-mono">65</td>
                  <td className="px-2.5 py-1.5 border-r border-slate-200 text-center font-mono">53</td>
                  <td className="px-2.5 py-1.5 border-r border-slate-200 text-center font-mono font-bold text-slate-900">173</td>
                  <td className="px-2.5 py-1.5 border-r border-slate-200 text-center font-mono">57.67</td>
                  <td className="px-2.5 py-1.5 text-center font-mono font-bold text-emerald-600">3</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Upload Form */}
      <form onSubmit={handleSubmit} className="card p-6 space-y-5 border border-slate-200">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="label text-slate-700 font-medium">Upload Mode</label>
            <select
              className="input text-sm"
              value={uploadType}
              onChange={(e) => setUploadType(e.target.value as "results" | "students" | "question-mapping" | "question-results")}
            >
              <option value="results">Assessment Results & Subject Scores</option>
              <option value="students">Student Enrolment Directory Only</option>
              <option value="question-mapping">Question Mapping (CSV)</option>
              <option value="question-results">Question-wise Analysis (XLS)</option>
            </select>
          </div>

          {uploadType === "question-mapping" || uploadType === "question-results" ? (
            <div>
              <label className="label text-slate-700 font-medium">Target Assessment</label>
              <select
                className="input text-sm"
                value={assessmentId}
                onChange={(e) => setAssessmentId(e.target.value)}
              >
                <option value="">Select Assessment...</option>
                {assessments.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title} · {a.batch.campus.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="label text-slate-700 font-medium">Target Class</label>
              <select
                className="input text-sm"
                value={batchId}
                onChange={(e) => setBatchId(e.target.value)}
              >
                <option value="">Auto-detect from Exam Stream / Default Class</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.stream}) · {b.campus.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="label text-slate-700 font-medium">Week Number</label>
            <input
              className="input text-sm"
              value={weekNumber}
              onChange={(e) => setWeekNumber(e.target.value.replace(/[^0-9A-Za-z._-]/g, ""))}
              placeholder="e.g. 1"
              disabled={uploadType === "students"}
            />
            <p className="mt-1 text-[11px] text-slate-500">
              Same class + same sheet + same week replaces old results.
            </p>
          </div>
        </div>

        <div>
          <label className="label text-slate-700 font-medium">Spreadsheet File (.xlsx, .xls, .csv)</label>
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-lg hover:border-primary-400 transition bg-slate-50/50">
            <div className="space-y-1 text-center">
              <svg className="mx-auto h-12 w-12 text-slate-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div className="flex text-sm text-slate-600 justify-center">
                <label className="relative cursor-pointer bg-white rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none">
                  <span>Choose a file</span>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="sr-only"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                </label>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs text-slate-500">
                {file ? `Selected: ${file.name} (${(file.size / 1024).toFixed(1)} KB)` : "Excel sheets (.xlsx, .xls) up to 10MB"}
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700 flex items-start gap-2">
            <svg className="h-5 w-5 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {result && (
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-5 text-sm text-emerald-900 space-y-3">
            <div className="flex items-center gap-2 font-semibold text-emerald-800">
              <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              <span>{result.message}</span>
            </div>

            {result.assessment && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs border-t border-emerald-200 text-emerald-800">
                <div>
                  <p className="text-slate-500">Assessments:</p>
                  <p className="font-semibold text-slate-900">
                    {result.assessments?.length ?? 1} from {result.sheetsProcessed ?? 1} sheet(s)
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Class & Campus:</p>
                  <p className="font-semibold text-slate-900">{result.assessment.batchName} · {result.assessment.campusName}</p>
                </div>
                <div>
                  <p className="text-slate-500">Subjects Ingested:</p>
                  <p className="font-semibold text-slate-900">{result.subjects?.join(", ") || "All Subjects"}</p>
                </div>
                <div>
                  <p className="text-slate-500">Students Enrolled / Updated:</p>
                  <p className="font-semibold text-slate-900">
                    +{result.studentsCreated ?? 0} new, {result.studentsUpdated ?? 0} updated
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Week / Replacements:</p>
                  <p className="font-semibold text-slate-900">
                    {result.weekNumber ? `Week ${result.weekNumber}` : "No week"} · {result.assessmentsOverwritten ?? 0} replaced
                  </p>
                </div>
              </div>
            )}

            {result.assessments && result.assessments.length > 1 && (
              <div className="rounded-lg border border-emerald-200 bg-white/70 overflow-hidden">
                <table className="min-w-full text-xs">
                  <thead className="bg-emerald-100/70 text-emerald-900">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold">Sheet / Assessment</th>
                      <th className="px-3 py-2 text-right font-semibold">Rows</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-100">
                    {result.assessments.map((a) => (
                      <tr key={a.id}>
                        <td className="px-3 py-2">
                          <Link href={`/assessments/${a.id}`} className="font-semibold text-primary-700 hover:underline">
                            {a.title}
                          </Link>
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-slate-700">{a.imported}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {result.assessment?.id && (
              <div className="pt-2">
                <Link
                  href={`/assessments/${result.assessment.id}`}
                  className="btn-primary inline-flex items-center gap-1.5 text-xs py-1.5 px-3"
                >
                  View Assessment Results & Subject Breakdown &rarr;
                </Link>
              </div>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !file}
          className="btn-primary w-full py-2.5 text-base flex justify-center items-center gap-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span>Processing & Computing Analytics...</span>
            </>
          ) : (
            "Upload & Process Spreadsheet"
          )}
        </button>
      </form>

      {/* Clear Data Banner */}
      <ClearDataButton variant="card" onCleared={() => { setResult(null); loadData(); }} />
    </div>
  );
}
