import { prisma } from "@/lib/db";
import Link from "next/link";
import { getDriftColor, getDriftLabel } from "@/lib/utils";
import { getSession, isSuperAdmin, isReadOnly } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function StudentsPage() {
  const session = await getSession();
  const isSuper = isSuperAdmin(session);
  const userCampusId = session?.campusId;
  const readOnly = isReadOnly(session);

  const students = await prisma.student.findMany({
    where: userCampusId ? { batch: { campusId: userCampusId } } : undefined,
    include: {
      batch: { include: { campus: true } },
      testResults: { orderBy: { createdAt: "desc" }, take: 1 },
      performanceTrends: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Enrolled Students ({students.length})</h1>
        </div>

        {!readOnly && (
          <Link href="/upload" className="btn-primary text-xs py-2 px-3.5">
            Import from XLS
          </Link>
        )}
      </div>

      <div className="card overflow-x-auto border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-slate-600 font-semibold">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Roll No</th>
              <th className="px-4 py-3 text-left font-medium">Student Name</th>
              <th className="px-4 py-3 text-left font-medium">Phone</th>
              <th className="px-4 py-3 text-left font-medium">Batch / Campus</th>
              <th className="px-4 py-3 text-center font-medium">Latest %</th>
              <th className="px-4 py-3 text-center font-medium">Percentile</th>
              <th className="px-4 py-3 text-center font-medium">Drift Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {students.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-xs text-slate-400">
                  No students enrolled for this center yet.
                </td>
              </tr>
            ) : (
              students.map((s) => {
                const latest = s.testResults[0];
                const trend = s.performanceTrends[0];
                return (
                  <tr key={s.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 font-mono text-xs text-slate-700 font-semibold">{s.rollNo}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      <Link href={`/students/${s.id}`} className="text-primary-600 hover:underline">
                        {s.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{s.phone || "—"}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs">
                      {s.batch.name} · <span className="font-medium text-slate-700">{s.batch.campus.name}</span>
                    </td>
                    <td className="px-4 py-3 text-center font-mono font-bold text-slate-800">
                      {latest ? `${latest.percentage.toFixed(1)}%` : "—"}
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-slate-600">
                      {latest?.percentile ? latest.percentile.toFixed(1) : "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {trend ? (
                        <span className={`badge ${getDriftColor(trend.driftStatus)} text-[11px]`}>
                          {getDriftLabel(trend.driftStatus)}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}