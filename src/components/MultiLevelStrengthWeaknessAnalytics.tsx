"use client";

import { useState } from "react";

export interface SubtopicStat {
  subject: string;
  chapter: string;
  subtopic: string;
  totalQs: number;
  correctQs: number;
  wrongQs: number;
  unattemptedQs: number;
  accuracy: number;
}

export interface SubjectStat {
  subject: string;
  avgMarks: number;
  avgPercentile: number;
  trend: number;
}

interface MultiLevelAnalyticsProps {
  overallPercentage?: number;
  overallPercentile?: number;
  rank?: number;
  totalTests?: number;
  subjectStats?: SubjectStat[];
  subtopics?: SubtopicStat[];
  studentName?: string;
}

export default function MultiLevelStrengthWeaknessAnalytics({
  overallPercentage,
  overallPercentile,
  rank,
  totalTests = 1,
  subjectStats = [],
  subtopics = [],
  studentName,
}: MultiLevelAnalyticsProps) {
  const [activeTab, setActiveTab] = useState<"overall" | "subjects" | "chapters" | "subtopics">("subtopics");
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "WEAK" | "MODERATE" | "STRONG">("ALL");

  const availableSubjects = Array.from(new Set(subtopics.map((s) => s.subject)));

  // Group subtopics into chapters
  const chapterMap = new Map<
    string,
    { subject: string; chapter: string; totalQs: number; correctQs: number; subtopicsCount: number }
  >();

  for (const st of subtopics) {
    const key = `${st.subject}||${st.chapter}`;
    const existing = chapterMap.get(key) || {
      subject: st.subject,
      chapter: st.chapter,
      totalQs: 0,
      correctQs: 0,
      subtopicsCount: 0,
    };
    existing.totalQs += st.totalQs;
    existing.correctQs += st.correctQs;
    existing.subtopicsCount += 1;
    chapterMap.set(key, existing);
  }

  const chapters = Array.from(chapterMap.values()).map((ch) => ({
    ...ch,
    accuracy: ch.totalQs > 0 ? Math.round((ch.correctQs / ch.totalQs) * 100) : 0,
  }));

  // Filter subtopics
  const filteredSubtopics = subtopics.filter((st) => {
    if (selectedSubjectFilter !== "ALL" && st.subject !== selectedSubjectFilter) return false;
    if (statusFilter === "WEAK" && st.accuracy >= 50) return false;
    if (statusFilter === "MODERATE" && (st.accuracy < 50 || st.accuracy >= 75)) return false;
    if (statusFilter === "STRONG" && st.accuracy < 75) return false;
    return true;
  });

  // Filter chapters
  const filteredChapters = chapters.filter((ch) => {
    if (selectedSubjectFilter !== "ALL" && ch.subject !== selectedSubjectFilter) return false;
    if (statusFilter === "WEAK" && ch.accuracy >= 50) return false;
    if (statusFilter === "MODERATE" && (ch.accuracy < 50 || ch.accuracy >= 75)) return false;
    if (statusFilter === "STRONG" && ch.accuracy < 75) return false;
    return true;
  });

  const weakSubtopicsCount = subtopics.filter((s) => s.accuracy < 50).length;
  const strongSubtopicsCount = subtopics.filter((s) => s.accuracy >= 75).length;

  return (
    <div className="card border border-slate-200 overflow-hidden bg-white shadow-xs rounded-2xl">
      {/* Header & Level Navigation */}
      <div className="card-header border-b border-slate-200 px-5 py-4 bg-slate-50/70 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <span>🎯</span>
            <span>Multi-Level Strengths & Weaknesses Matrix</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {studentName ? `Diagnostic Breakdown for ${studentName}` : "Diagnostic Breakdown"} · Drill down across 4 layers
          </p>
        </div>

        {/* Level Switcher Tabs */}
        <div className="flex bg-slate-200/80 p-1 rounded-xl text-xs font-semibold text-slate-600 gap-1 self-start md:self-auto">
          <button
            onClick={() => setActiveTab("overall")}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === "overall" ? "bg-white text-primary-700 shadow-2xs" : "hover:text-slate-900"
            }`}
          >
            1. Overall
          </button>
          <button
            onClick={() => setActiveTab("subjects")}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === "subjects" ? "bg-white text-primary-700 shadow-2xs" : "hover:text-slate-900"
            }`}
          >
            2. Subjects
          </button>
          <button
            onClick={() => setActiveTab("chapters")}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === "chapters" ? "bg-white text-primary-700 shadow-2xs" : "hover:text-slate-900"
            }`}
          >
            3. Topics / Chapters
          </button>
          <button
            onClick={() => setActiveTab("subtopics")}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === "subtopics" ? "bg-white text-primary-700 shadow-2xs" : "hover:text-slate-900"
            }`}
          >
            4. Subtopics ({subtopics.length})
          </button>
        </div>
      </div>

      {/* Sub-Filters Bar for Chapters & Subtopics */}
      {(activeTab === "chapters" || activeTab === "subtopics") && (
        <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Subject:</span>
            <select
              value={selectedSubjectFilter}
              onChange={(e) => setSelectedSubjectFilter(e.target.value)}
              className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-medium"
            >
              <option value="ALL">All Subjects</option>
              {availableSubjects.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium mr-1">Status:</span>
            <button
              onClick={() => setStatusFilter("ALL")}
              className={`px-2.5 py-1 rounded-lg font-medium ${
                statusFilter === "ALL" ? "bg-slate-800 text-white" : "bg-white border border-slate-200 text-slate-600"
              }`}
            >
              All ({activeTab === "subtopics" ? subtopics.length : chapters.length})
            </button>
            <button
              onClick={() => setStatusFilter("WEAK")}
              className={`px-2.5 py-1 rounded-lg font-medium ${
                statusFilter === "WEAK" ? "bg-red-600 text-white" : "bg-red-50 text-red-700 border border-red-200"
              }`}
            >
              Weak &lt;50% ({weakSubtopicsCount})
            </button>
            <button
              onClick={() => setStatusFilter("STRONG")}
              className={`px-2.5 py-1 rounded-lg font-medium ${
                statusFilter === "STRONG" ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-700 border border-emerald-200"
              }`}
            >
              Strong &ge;75% ({strongSubtopicsCount})
            </button>
          </div>
        </div>
      )}

      {/* Tab 1: Overall Performance */}
      {activeTab === "overall" && (
        <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-xs text-slate-500">Cumulative Percentage</span>
            <p className="text-2xl font-bold text-slate-900 mt-1">
              {overallPercentage !== undefined ? `${overallPercentage.toFixed(1)}%` : "—"}
            </p>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-xs text-slate-500">Percentile Rank</span>
            <p className="text-2xl font-bold text-primary-700 mt-1">
              {overallPercentile !== undefined ? overallPercentile.toFixed(1) : "—"}
            </p>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-xs text-slate-500">Campus Rank</span>
            <p className="text-2xl font-bold text-slate-800 mt-1">
              {rank !== undefined ? `#${rank}` : "—"}
            </p>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-xs text-slate-500">Weak Subtopics Flagged</span>
            <p className="text-2xl font-bold text-red-600 mt-1">{weakSubtopicsCount}</p>
          </div>
        </div>
      )}

      {/* Tab 2: Subject-Level Breakdown */}
      {activeTab === "subjects" && (
        <div className="p-5">
          {subjectStats.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-6">No subject stats recorded yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {subjectStats.map((sub, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-900 text-sm">{sub.subject}</h3>
                    <span
                      className={`badge text-xs font-semibold ${
                        sub.avgPercentile >= 75
                          ? "bg-emerald-100 text-emerald-800"
                          : sub.avgPercentile < 50
                          ? "bg-red-100 text-red-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {sub.avgPercentile >= 75 ? "Strong" : sub.avgPercentile < 50 ? "Needs Focus" : "Average"}
                    </span>
                  </div>
                  <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                    <div className="flex justify-between">
                      <span>Avg Score:</span>
                      <strong className="text-slate-800">{sub.avgMarks}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Percentile:</span>
                      <strong className="text-slate-800">{sub.avgPercentile}%</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Chapter / Topic Level */}
      {activeTab === "chapters" && (
        <div className="overflow-x-auto">
          {filteredChapters.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-8">No chapters match your filter.</p>
          ) : (
            <table className="min-w-full divide-y divide-slate-200 text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold">
                <tr>
                  <th className="px-4 py-2.5 text-left">Subject</th>
                  <th className="px-4 py-2.5 text-left">Topic / Chapter</th>
                  <th className="px-4 py-2.5 text-center">Subtopics Included</th>
                  <th className="px-4 py-2.5 text-center">Accuracy Score</th>
                  <th className="px-4 py-2.5 text-center">Proficiency Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredChapters.map((ch, idx) => (
                  <tr key={idx} className={ch.accuracy < 50 ? "bg-red-50/60" : "hover:bg-slate-50"}>
                    <td className="px-4 py-2.5 font-bold text-slate-700">{ch.subject}</td>
                    <td className="px-4 py-2.5 font-medium text-slate-900">{ch.chapter}</td>
                    <td className="px-4 py-2.5 text-center text-slate-500">{ch.subtopicsCount} subtopics</td>
                    <td className="px-4 py-2.5 text-center font-bold text-sm">
                      <span className={ch.accuracy < 50 ? "text-red-600" : ch.accuracy >= 75 ? "text-emerald-600" : "text-amber-600"}>
                        {ch.accuracy}%
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span
                        className={`badge text-[10px] font-bold uppercase ${
                          ch.accuracy < 50
                            ? "bg-red-100 text-red-700"
                            : ch.accuracy >= 75
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {ch.accuracy < 50 ? "Weak Topic" : ch.accuracy >= 75 ? "Mastered" : "Moderate"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tab 4: Granular Subtopic Level */}
      {activeTab === "subtopics" && (
        <div className="overflow-x-auto">
          {filteredSubtopics.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-8">
              No subtopics mapped yet. Upload a question paper to auto-generate subtopic analytics!
            </p>
          ) : (
            <table className="min-w-full divide-y divide-slate-200 text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold">
                <tr>
                  <th className="px-4 py-2.5 text-left">Subject</th>
                  <th className="px-4 py-2.5 text-left">Chapter / Topic</th>
                  <th className="px-4 py-2.5 text-left">Standard Subtopic</th>
                  <th className="px-4 py-2.5 text-center">Correct / Total Qs</th>
                  <th className="px-4 py-2.5 text-center">Accuracy</th>
                  <th className="px-4 py-2.5 text-center">Diagnostic Tag</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredSubtopics.map((st, idx) => (
                  <tr key={idx} className={st.accuracy < 50 ? "bg-red-50/60" : "hover:bg-slate-50"}>
                    <td className="px-4 py-2.5 font-bold text-slate-700">{st.subject}</td>
                    <td className="px-4 py-2.5 text-slate-500">{st.chapter}</td>
                    <td className="px-4 py-2.5 font-medium text-slate-900">{st.subtopic}</td>
                    <td className="px-4 py-2.5 text-center font-mono text-slate-600">
                      {st.correctQs} / {st.totalQs}
                    </td>
                    <td className="px-4 py-2.5 text-center font-bold text-sm">
                      <span className={st.accuracy < 50 ? "text-red-600" : st.accuracy >= 75 ? "text-emerald-600" : "text-amber-600"}>
                        {st.accuracy}%
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span
                        className={`badge text-[10px] font-bold uppercase ${
                          st.accuracy < 50
                            ? "bg-red-100 text-red-700"
                            : st.accuracy >= 75
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {st.accuracy < 50 ? "Weak" : st.accuracy >= 75 ? "Strong" : "Moderate"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
