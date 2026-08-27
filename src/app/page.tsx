import { prisma } from "@/lib/db";
import Link from "next/link";
import { Prisma } from "@prisma/client";
import { formatDate, formatPercent, getDriftColor, getDriftLabel } from "@/lib/utils";
import { getSession, isSuperAdmin, isReadOnly } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getSession();
  const isSuper = isSuperAdmin(session);
  const userCampusId = session?.campusId;
  const readOnly = isReadOnly(session);

  const campusFilter: Prisma.TestResultWhereInput | undefined = userCampusId
    ? { student: { batch: { campusId: userCampusId } } }
    : undefined;

  const [
    totalStudents,
    totalAssessments,
    campusCount,
    latestResults,
    topImprovers,
    driftCounts,
    latestAISummary,
  ] = await Promise.all([
    prisma.student.count({
      where: userCampusId ? { batch: { campusId: userCampusId } } : undefined,
    }),
    prisma.assessment.count({
      where: userCampusId ? { batch: { campusId: userCampusId } } : undefined,
    }),
    userCampusId ? 1 : prisma.campus.count(),
    prisma.testResult.findMany({
      where: campusFilter,
      take: 8,
      orderBy: { createdAt: "desc" },
      include: {
        student: { include: { batch: { include: { campus: true } } } },
        assessment: true,
      },
    }),
    prisma.performanceTrend.findMany({
      where: {
        driftStatus: "IMPROVED_SIGNIFICANTLY",
        student: userCampusId ? { batch: { campusId: userCampusId } } : undefined,
      },
      take: 6,
      orderBy: { createdAt: "desc" },
      include: {
        student: { include: { batch: { include: { campus: true } } } },
        assessment: true,
      },
    }),
    prisma.performanceTrend.groupBy({
      by: ["driftStatus"],
      where: userCampusId ? { student: { batch: { campusId: userCampusId } } } : undefined,
      _count: true,
    }),
    prisma.assessment.findFirst({
      where: {
        aiSummary: { not: Prisma.DbNull },
        ...(userCampusId ? { batch: { campusId: userCampusId } } : {}),
      },
      orderBy: { examDate: "desc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      {/* Header with Center Scope & Quick Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`badge text-xs font-semibold ${
                isSuper
                  ? "bg-purple-100 text-purple-800"
                  : "bg-blue-100 text-blue-800"
              }`}
            >
              {isSuper ? "🌐 Super Admin (All Centers)" : `📍 ${session?.campusName || "Center Dashboard"}`}
            </span>
            {readOnly && (
              <span className="badge bg-slate-100 text-slate-600 text-xs">Read-Only Viewer</span>
            )}
          </div>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Academic Dashboard</h1>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/rankings"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
          >
            <svg className="h-4 w-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            Cross-Center Rankings
          </Link>
          {!readOnly && (
            <Link href="/upload" className="btn-primary text-xs py-2 px-3.5">
              Upload Results
            </Link>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card p-5 border border-slate-200">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Students</p>
          <p className="mt-1 text-3xl font-bold text-slate-900">{totalStudents}</p>
        </div>
        <div className="card p-5 border border-slate-200">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Assessments</p>
          <p className="mt-1 text-3xl font-bold text-slate-900">{totalAssessments}</p>
        </div>
        <div className="card p-5 border border-slate-200">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {userCampusId ? "Campus Center" : "Active Campuses"}
          </p>
          <p className="mt-1 text-3xl font-bold text-slate-900">{campusCount}</p>
        </div>
        <div className="card p-5 border border-slate-200">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Top Improvers</p>
          <p className="mt-1 text-3xl font-bold text-emerald-600">
            {driftCounts.find((d) => d.driftStatus === "IMPROVED_SIGNIFICANTLY")?._count ?? 0}
          </p>
        </div>
      </div>

      {latestAISummary && latestAISummary.aiSummary && (
        <div className="card overflow-hidden border border-emerald-200">
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 px-5 py-4 flex items-start gap-4">
            <div className="mt-1 flex-shrink-0">
              <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-sm font-bold text-emerald-900 flex items-center gap-2">
                Latest AI Insights — {latestAISummary.title}
                <span className="badge bg-white/50 text-emerald-700 border border-emerald-200/50">
                  {formatDate(latestAISummary.examDate)}
                </span>
              </h2>
              <p className="mt-2 text-sm text-slate-700 leading-relaxed">
                {(latestAISummary.aiSummary as any).overallSummary}
              </p>
              {((latestAISummary.aiSummary as any).weeklyNarrative) && (
                <p className="mt-1 text-sm font-medium text-emerald-800">
                  {(latestAISummary.aiSummary as any).weeklyNarrative}
                </p>
              )}
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="bg-white/60 rounded-lg p-3 border border-emerald-100">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Recommended Actions</p>
                  <ul className="space-y-1 text-xs text-slate-700 list-disc list-inside">
                    {((latestAISummary.aiSummary as any).recommendations || []).map((r: string, i: number) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
                <div className="flex items-center justify-end gap-3">
                  <Link href="/cohort/subtopics" className="btn-primary bg-emerald-600 hover:bg-emerald-700 text-xs py-2 px-4 shadow-sm border-0">
                    View Cohort Trend Heatmap &rarr;
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Latest Results */}
        <div className="card border border-slate-200">
          <div className="card-header border-b border-slate-100 px-5 py-3.5 flex items-center justify-between">
            <h2 className="font-bold text-slate-800 text-sm">Recent Test Results</h2>
            <Link href="/assessments" className="text-xs text-primary-600 hover:underline">
              View all &rarr;
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {latestResults.length === 0 ? (
              <p className="p-5 text-xs text-slate-400 text-center">No test results recorded yet.</p>
            ) : (
              latestResults.map((r) => (
                <div key={r.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition">
                  <div>
                    <Link href={`/students/${r.student.id}`} className="text-sm font-semibold text-slate-900 hover:underline">
                      {r.student.name}
                    </Link>
                    <p className="text-xs text-slate-500">
                      {r.assessment.title} · {formatDate(r.assessment.examDate)}
                    </p>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {r.student.batch.campus.name}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-800">{formatPercent(r.percentage)}</p>
                    <p className="text-xs text-slate-500">Percentile: {r.percentile?.toFixed(0) ?? "—"}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top Improvers */}
        <div className="card border border-slate-200">
          <div className="card-header border-b border-slate-100 px-5 py-3.5 flex items-center justify-between">
            <h2 className="font-bold text-slate-800 text-sm">Significant Improvers (Δ ≥ +15%)</h2>
            <Link href="/cohort" className="text-xs text-primary-600 hover:underline">
              Cohort analysis &rarr;
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {topImprovers.length === 0 ? (
              <p className="p-5 text-xs text-slate-400 text-center">No drift flags detected yet.</p>
            ) : (
              topImprovers.map((t) => (
                <div key={t.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition">
                  <div>
                    <Link href={`/students/${t.student.id}`} className="text-sm font-semibold text-slate-900 hover:underline">
                      {t.student.name}
                    </Link>
                    <p className="text-xs text-slate-500">
                      {t.student.batch.name} · {t.student.batch.campus.name}
                    </p>
                  </div>
                  <span className={`badge ${getDriftColor(t.driftStatus)} text-xs font-semibold`}>
                    {getDriftLabel(t.driftStatus)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
