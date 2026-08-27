import { prisma } from "@/lib/db";
import { getDriftColor, getDriftLabel } from "@/lib/utils";
import { getSession, isSuperAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function CohortPage() {
  const session = await getSession();
  const isSuper = isSuperAdmin(session);
  const userCampusId = session?.campusId;

  const [driftGroups, top15, flaggedStudents] = await Promise.all([
    prisma.performanceTrend.groupBy({
      by: ["driftStatus"],
      where: userCampusId ? { student: { batch: { campusId: userCampusId } } } : undefined,
      _count: true,
    }),
    prisma.campusRankSummary.findMany({
      where: userCampusId ? { campusId: userCampusId } : undefined,
      include: {
        assessment: { include: { batch: { include: { campus: true } } } },
      },
      orderBy: { assessment: { examDate: "desc" } },
      take: 6,
    }),
    prisma.performanceTrend.findMany({
      where: {
        driftStatus: { in: ["IMPROVED_SIGNIFICANTLY", "DEGRADED_SIGNIFICANTLY", "CONSISTENT_TOPPER"] },
        student: userCampusId ? { batch: { campusId: userCampusId } } : undefined,
      },
      take: 50,
      orderBy: { createdAt: "desc" },
      include: {
        student: { include: { batch: { include: { campus: true } } } },
      },
    }),
  ]);

  const total = driftGroups.reduce((s, g) => s + g._count, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`badge text-xs font-semibold ${
                isSuper ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800"
              }`}
            >
              {isSuper ? "🌐 All Centers" : `📍 ${session?.campusName || "My Center"}`}
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Cohort Drift & Stability Tracker</h1>
        </div>
      </div>

      {/* Drift summary */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {driftGroups.map((g) => (
          <div key={g.driftStatus} className="card p-5 border border-slate-200">
            <p className="text-xs font-semibold text-slate-500">{getDriftLabel(g.driftStatus)}</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">{g._count}</p>
            <p className="text-xs text-slate-400">
              {total ? `${((g._count / total) * 100).toFixed(1)}% of cohort` : "0%"}
            </p>
          </div>
        ))}
      </div>

      {/* Top-15 cohorts */}
      <div className="card border border-slate-200">
        <div className="card-header border-b border-slate-100 px-5 py-3">
          <h2 className="font-bold text-slate-800 text-sm">Center Top-15 Cohort Tracker (Latest Tests)</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {top15.length === 0 ? (
            <p className="p-5 text-center text-xs text-slate-400">No cohort snapshots recorded yet.</p>
          ) : (
            top15.map((s) => {
              const rows = Array.isArray(s.top15Json) ? (s.top15Json as { name: string; percentile: number; totalMarks: number }[]) : [];
              return (
                <div key={s.id} className="px-5 py-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-900">{s.assessment.title}</p>
                    <span className="badge bg-slate-100 text-slate-700 text-xs">{s.assessment.batch.campus.name}</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {s.assessment.batch.name} · {new Date(s.assessment.examDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                    {rows.map((r, i) => (
                      <div key={i} className="rounded-lg bg-slate-50 border border-slate-200/60 p-2">
                        <p className="text-xs font-medium text-slate-900 truncate">{r.name}</p>
                        <p className="text-[11px] text-slate-500 font-mono">#{i + 1} · P{r.percentile?.toFixed(0)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* All flagged students */}
      <div className="card border border-slate-200 overflow-hidden">
        <div className="card-header border-b border-slate-100 px-5 py-3">
          <h2 className="font-bold text-slate-800 text-sm">Flagged Students by Trajectory</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-slate-600 font-semibold">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">Student</th>
                <th className="px-4 py-2.5 text-left font-medium">Batch / Center</th>
                <th className="px-4 py-2.5 text-left font-medium">Percentile Shift</th>
                <th className="px-4 py-2.5 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {flaggedStudents.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-xs text-slate-400">
                    No drift flags recorded for this center.
                  </td>
                </tr>
              ) : (
                flaggedStudents.map((t, i) => (
                  <tr key={`${t.id}-${i}`} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-2.5 font-medium text-slate-900">{t.student.name}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">
                      {t.student.batch.name} · <span className="font-semibold text-slate-700">{t.student.batch.campus.name}</span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-700 text-xs font-mono">
                      {t.statusFrom?.toFixed(0) ?? "—"} &rarr; {t.statusTo?.toFixed(0) ?? "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`badge ${getDriftColor(t.driftStatus)} text-xs`}>{getDriftLabel(t.driftStatus)}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}