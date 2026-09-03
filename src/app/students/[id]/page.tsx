import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { formatDate, formatPercent, getDriftColor, getDriftLabel } from "@/lib/utils";
import DiagnosticReport from "@/components/DiagnosticReport";
import { getSession, isSuperAdmin } from "@/lib/auth";
import { getStudentSubtopicTrend } from "@/lib/subtopicAnalytics";
import SideBySideChatAgent from "@/components/SideBySideChatAgent";

export const dynamic = "force-dynamic";

export default async function StudentDetailPage({ params }: { params: { id: string } }) {
  const session = await getSession();
  const isSuper = isSuperAdmin(session);
  const userCampusId = session?.campusId;

  const student = await prisma.student.findUnique({
    where: { id: params.id },
    include: {
      batch: { include: { campus: true } },
      testResults: {
        include: { assessment: true, subjectScores: true },
        orderBy: { assessment: { examDate: "asc" } },
      },
      performanceTrends: {
        include: { assessment: true },
        orderBy: { assessment: { examDate: "asc" } },
      },
      diagnostics: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  if (!student) notFound();

  // Strict Center Isolation
  if (!isSuper && userCampusId && student.batch.campusId !== userCampusId) {
    notFound();
  }

  const latestTrend = student.performanceTrends[student.performanceTrends.length - 1];
  const latestResult = student.testResults[student.testResults.length - 1];

  // Fetch cross-assessment subtopic trend
  const subtopicTrend = await getStudentSubtopicTrend(student.id);
  const hasSubtopicData = subtopicTrend.length > 0;

  return (
    <div className="space-y-6">
      <div className="card p-6 border border-slate-200">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="badge bg-slate-100 text-slate-700 font-semibold">{student.batch.campus.name}</span>
              <span className="badge bg-primary-50 text-primary-700">{student.batch.name}</span>
            </div>
            <h1 className="mt-2 text-2xl font-bold text-slate-900">{student.name}</h1>
            <p className="mt-1 text-sm text-slate-500 font-mono">
              Roll No: {student.rollNo} · Phone: {student.phone || "—"}
            </p>
          </div>
          {latestTrend && (
            <span className={`badge ${getDriftColor(latestTrend.driftStatus)} text-xs font-semibold`}>
              {getDriftLabel(latestTrend.driftStatus)}
            </span>
          )}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4 border-t border-slate-100 pt-4">
          <div>
            <p className="text-xs text-slate-500">Latest Percentage</p>
            <p className="text-xl font-bold text-slate-900">{latestResult ? formatPercent(latestResult.percentage) : "—"}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Latest Percentile</p>
            <p className="text-xl font-bold text-slate-900">{latestResult?.percentile?.toFixed(1) ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Rolling Avg (3-Window)</p>
            <p className="text-xl font-bold text-slate-900">{latestTrend?.rollingAvg3 ? `${latestTrend.rollingAvg3}%` : "—"}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Rolling Avg (5-Window)</p>
            <p className="text-xl font-bold text-slate-900">{latestTrend?.rollingAvg5 ? `${latestTrend.rollingAvg5}%` : "—"}</p>
          </div>
        </div>
      </div>

      {/* Side-by-Side Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left 2 Columns: Reports, History & Subtopic Analytics */}
        <div className="lg:col-span-2 space-y-6">
          {/* Performance History */}
          <div className="card border border-slate-200 overflow-hidden">
            <div className="card-header border-b border-slate-100 px-5 py-3 flex items-center justify-between">
              <h2 className="font-bold text-slate-800 text-sm">Performance & Subject Breakdown History</h2>
              <span className="text-xs text-slate-400">{student.testResults.length} Tests Recorded</span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-slate-600 font-semibold">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-medium">Assessment Title</th>
                    <th className="px-4 py-2.5 text-left font-medium">Date</th>
                    <th className="px-4 py-2.5 text-left font-medium">Subject Scores</th>
                    <th className="px-4 py-2.5 text-center font-medium">Total</th>
                    <th className="px-4 py-2.5 text-center font-medium">%</th>
                    <th className="px-4 py-2.5 text-center font-medium">Percentile</th>
                    <th className="px-4 py-2.5 text-center font-medium">Rank</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {student.testResults.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-medium text-slate-900">{r.assessment.title}</td>
                      <td className="px-4 py-2.5 text-slate-500">{formatDate(r.assessment.examDate)}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {r.subjectScores.map((s) => (
                            <span key={s.id} className="badge bg-slate-100 text-slate-700 text-xs">
                              {s.subject}: {s.marks}/{s.maxMarks}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-center font-bold text-slate-800">
                        {r.totalMarks}/{r.assessment.totalMarks}
                      </td>
                      <td className="px-4 py-2.5 text-center font-bold text-primary-700">
                        {formatPercent(r.percentage)}
                      </td>
                      <td className="px-4 py-2.5 text-center text-slate-600">
                        {r.percentile != null ? r.percentile.toFixed(1) : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-center font-mono font-bold text-slate-700">
                        #{r.campusRank}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Subtopic Trend Panel */}
          {hasSubtopicData && (
            <div className="card border border-slate-200 overflow-hidden">
              <div className="card-header border-b border-slate-100 px-5 py-3 flex items-center justify-between">
                <h2 className="font-bold text-slate-800 text-sm">Cross-Assessment Subtopic Trend</h2>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400">{subtopicTrend.length} subtopics tracked</span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-slate-600 font-semibold">
                    <tr>
                      <th className="px-4 py-2.5 text-left font-medium">Subject</th>
                      <th className="px-4 py-2.5 text-left font-medium">Chapter</th>
                      <th className="px-4 py-2.5 text-left font-medium">Subtopic</th>
                      <th className="px-4 py-2.5 text-center font-medium">Trend History</th>
                      <th className="px-4 py-2.5 text-center font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {subtopicTrend.map((s, i) => {
                      const sortedHistory = [...s.history].sort((a, b) => b.examDate.getTime() - a.examDate.getTime());
                      const latest = sortedHistory[0];
                      const isWeak = latest && latest.accuracy < 50;

                      let trendIcon = "—";
                      let trendColor = "text-slate-400";
                      if (sortedHistory.length >= 2) {
                        const diff = sortedHistory[0].accuracy - sortedHistory[1].accuracy;
                        if (diff >= 10) { trendIcon = "↑↑"; trendColor = "text-emerald-600"; }
                        else if (diff > 0) { trendIcon = "↑"; trendColor = "text-emerald-500"; }
                        else if (diff <= -10) { trendIcon = "↓↓"; trendColor = "text-red-600"; }
                        else if (diff < 0) { trendIcon = "↓"; trendColor = "text-red-500"; }
                        else { trendIcon = "→"; }
                      }

                      return (
                        <tr key={i} className={isWeak ? "bg-red-50" : "hover:bg-slate-50"}>
                          <td className="px-4 py-2.5 font-semibold text-slate-700">{s.subject}</td>
                          <td className="px-4 py-2.5 text-slate-500 text-xs">{s.chapter}</td>
                          <td className="px-4 py-2.5 text-slate-800">{s.subtopic}</td>
                          <td className="px-4 py-2.5 text-center">
                            <div className="flex items-center justify-center gap-1.5 flex-wrap">
                              {sortedHistory.slice(0, 3).map((h, hi) => (
                                <span
                                  key={hi}
                                  className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                                    h.accuracy < 50 ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"
                                  }`}
                                  title={h.assessmentTitle}
                                >
                                  {h.accuracy}%
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-center font-bold text-base">
                            <span className={trendColor} title="Trend vs previous assessment">{trendIcon}</span>
                            {isWeak && <span className="ml-2 badge bg-red-100 text-red-700 text-[10px] uppercase font-bold">Weak</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* AI Diagnostic Engine Report */}
          <DiagnosticReport studentId={student.id} existing={student.diagnostics[0]} />
        </div>

        {/* Right 1 Column: Side-by-Side Interactive AI Chat Agent */}
        <div className="lg:col-span-1">
          <SideBySideChatAgent
            studentId={student.id}
            studentName={student.name}
            studentRollNo={student.rollNo}
            batchName={student.batch.name}
          />
        </div>
      </div>
    </div>
  );
}