"use client";

import { useState, useEffect } from "react";
import { formatPercent } from "@/lib/utils";

interface AssessmentOption {
  id: string;
  title: string;
  examDate: string;
  totalMarks: number;
  stream: string;
  campusName: string;
}

interface CenterStat {
  campusId: string;
  campusName: string;
  city: string;
  candidateCount: number;
  avgScore: number;
  avgPercentage: number;
  topScore: number;
  topPerformer: string;
  top10Count: number;
  isOwnCenter: boolean;
}

interface LeaderboardEntry {
  id: string;
  overallRank: number;
  campusRank: number;
  rollNo: string;
  name: string;
  campusName: string;
  campusCity: string;
  totalMarks: number;
  maxMarks: number;
  percentage: number;
  percentile: number | null;
  zScore: number | null;
  isOwnCenter: boolean;
  subjectScores: { subject: string; marks: number }[];
}

export default function RankingsPage() {
  const [assessments, setAssessments] = useState<AssessmentOption[]>([]);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>("");
  const [streamFilter, setStreamFilter] = useState<string>("");
  const [campusFilter, setCampusFilter] = useState<string>("");
  const [centerStats, setCenterStats] = useState<CenterStat[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  function fetchRankings(assessmentId?: string, stream?: string, campusId?: string) {
    setLoading(true);
    const params = new URLSearchParams();
    if (assessmentId) params.append("assessmentId", assessmentId);
    if (stream) params.append("stream", stream);
    if (campusId) params.append("campusId", campusId);

    fetch(`/api/rankings?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        setLoading(false);
        if (data.assessments) {
          setAssessments(data.assessments);
        }
        if (data.selectedAssessment && !assessmentId) {
          setSelectedAssessmentId(data.selectedAssessment.id);
        }
        if (data.centerStats) {
          setCenterStats(data.centerStats);
        }
        if (data.leaderboard) {
          setLeaderboard(data.leaderboard);
        }
      })
      .catch(() => setLoading(false));
  }

  useEffect(() => {
    fetchRankings();
  }, []);

  function handleAssessmentChange(id: string) {
    setSelectedAssessmentId(id);
    fetchRankings(id, streamFilter, campusFilter);
  }

  function handleStreamChange(s: string) {
    setStreamFilter(s);
    fetchRankings(selectedAssessmentId, s, campusFilter);
  }

  function handleCampusChange(cId: string) {
    setCampusFilter(cId);
    fetchRankings(selectedAssessmentId, streamFilter, cId);
  }

  const subjectNames = Array.from(
    new Set(leaderboard.flatMap((c) => c.subjectScores.map((s) => s.subject)))
  );

  return (
    <div className="space-y-6">
      {/* Header & Filter Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Cross-Center Rankings & Leaderboard</h1>
          <p className="text-sm text-slate-500">
            Compare academic performance, cohort percentiles, and top ranks across all campus centers.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Stream Filter */}
          <div className="flex rounded-lg border border-slate-300 bg-white p-0.5 shadow-sm text-xs font-semibold">
            <button
              onClick={() => handleStreamChange("")}
              className={`px-3 py-1.5 rounded-md transition ${!streamFilter ? "bg-primary-600 text-white" : "text-slate-600 hover:text-slate-900"}`}
            >
              All Streams
            </button>
            <button
              onClick={() => handleStreamChange("JEE")}
              className={`px-3 py-1.5 rounded-md transition ${streamFilter === "JEE" ? "bg-primary-600 text-white" : "text-slate-600 hover:text-slate-900"}`}
            >
              JEE
            </button>
            <button
              onClick={() => handleStreamChange("NEET")}
              className={`px-3 py-1.5 rounded-md transition ${streamFilter === "NEET" ? "bg-primary-600 text-white" : "text-slate-600 hover:text-slate-900"}`}
            >
              NEET
            </button>
          </div>
        </div>
      </div>

      {/* Assessment & Center Dropdown Selectors */}
      <div className="card p-4 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label text-xs font-semibold text-slate-600">Select Test Cycle</label>
          <select
            className="input text-sm"
            value={selectedAssessmentId}
            onChange={(e) => handleAssessmentChange(e.target.value)}
          >
            {assessments.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title} ({a.stream}) · {a.campusName}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label text-xs font-semibold text-slate-600">Filter by Center</label>
          <select
            className="input text-sm"
            value={campusFilter}
            onChange={(e) => handleCampusChange(e.target.value)}
          >
            <option value="">All Centers (Global View)</option>
            {centerStats.map((c) => (
              <option key={c.campusId} value={c.campusId}>
                {c.campusName} ({c.city})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Center Comparative Benchmark Cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-slate-800">Center Performance Benchmarks</h2>
          <span className="text-xs text-slate-400">{centerStats.length} Centers Active</span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {centerStats.map((c) => (
            <div
              key={c.campusId}
              className={`card p-5 border transition shadow-sm ${
                c.isOwnCenter ? "border-primary-400 bg-primary-50/20" : "border-slate-200"
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-slate-900">{c.campusName}</h3>
                  <p className="text-xs text-slate-500">{c.city}</p>
                </div>
                {c.isOwnCenter && (
                  <span className="badge bg-primary-100 text-primary-800 text-xs font-semibold">Your Center</span>
                )}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
                <div>
                  <p className="text-xs text-slate-400">Candidates</p>
                  <p className="text-lg font-bold text-slate-800">{c.candidateCount}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Average Score</p>
                  <p className="text-lg font-bold text-slate-800">
                    {c.avgScore} <span className="text-xs font-normal text-slate-500">({c.avgPercentage}%)</span>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Top Score</p>
                  <p className="text-lg font-bold text-emerald-600">{c.topScore}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Top 10 Ranks</p>
                  <p className="text-lg font-bold text-amber-600">{c.top10Count}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cross-Center Leaderboard */}
      <div className="card border border-slate-200 overflow-hidden">
        <div className="card-header border-b border-slate-100 px-5 py-3.5 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-slate-900 text-sm">Cross-Center Candidate Leaderboard</h2>
            <p className="text-xs text-slate-500">Ranked globally across all participating centers</p>
          </div>
          <span className="badge bg-slate-100 text-slate-700 text-xs">
            {leaderboard.length} Candidates
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">Loading rankings data...</div>
        ) : leaderboard.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">No test results found for this selection.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-slate-600 font-semibold">
                <tr>
                  <th className="px-3 py-2.5 text-center font-medium">Overall Rank</th>
                  <th className="px-3 py-2.5 text-center font-medium">Center Rank</th>
                  <th className="px-3 py-2.5 text-left font-medium">Candidate Name</th>
                  <th className="px-3 py-2.5 text-left font-medium">Center</th>
                  {subjectNames.map((sub) => (
                    <th key={sub} className="px-3 py-2.5 text-center font-medium text-slate-700">
                      {sub.slice(0, 3).toUpperCase()}
                    </th>
                  ))}
                  <th className="px-3 py-2.5 text-center font-medium text-slate-900">Total</th>
                  <th className="px-3 py-2.5 text-center font-medium">%</th>
                  <th className="px-3 py-2.5 text-center font-medium">Percentile</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {leaderboard.map((c) => {
                  const subMap = new Map(c.subjectScores.map((s) => [s.subject, s.marks]));
                  const isTop3 = c.overallRank <= 3;

                  return (
                    <tr
                      key={c.id}
                      className={`hover:bg-slate-50 transition ${
                        c.isOwnCenter ? "bg-primary-50/15" : ""
                      }`}
                    >
                      <td className="px-3 py-2.5 text-center font-mono font-bold text-slate-900">
                        {isTop3 ? (
                          <span
                            className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                              c.overallRank === 1
                                ? "bg-amber-100 text-amber-900 border border-amber-300"
                                : c.overallRank === 2
                                ? "bg-slate-200 text-slate-800"
                                : "bg-orange-100 text-orange-900"
                            }`}
                          >
                            {c.overallRank}
                          </span>
                        ) : (
                          `#${c.overallRank}`
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center font-mono text-xs text-slate-500">
                        #{c.campusRank}
                      </td>
                      <td className="px-3 py-2.5 font-medium text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <span>{c.name}</span>
                          {c.isOwnCenter && (
                            <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary-600" title="Your Center Student" />
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-slate-600">
                        <span className="badge bg-slate-100 text-slate-700">{c.campusName}</span>
                      </td>
                      {subjectNames.map((sub) => {
                        const marks = subMap.get(sub);
                        return (
                          <td key={sub} className="px-3 py-2.5 text-center font-mono text-slate-700">
                            {marks !== undefined ? marks : "—"}
                          </td>
                        );
                      })}
                      <td className="px-3 py-2.5 text-center font-mono font-bold text-slate-900">
                        {c.totalMarks}
                      </td>
                      <td className="px-3 py-2.5 text-center font-mono text-slate-700">
                        {formatPercent(c.percentage)}
                      </td>
                      <td className="px-3 py-2.5 text-center font-mono text-slate-600 font-semibold">
                        {c.percentile != null ? c.percentile.toFixed(1) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
