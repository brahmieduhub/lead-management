import { prisma } from "@/lib/db";
import Link from "next/link";
import ClearDataButton from "@/components/ClearDataButton";
import CenterManager from "@/components/CenterManager";
import { getSession, isSuperAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getSession();
  const isSuper = isSuperAdmin(session);
  const userCampusId = session?.campusId;

  const [campuses, batches, users] = await Promise.all([
    prisma.campus.findMany({
      where: userCampusId ? { id: userCampusId } : undefined,
      include: {
        _count: { select: { batches: true } },
        batches: {
          include: {
            _count: { select: { students: true, assessments: true } },
          },
        },
        users: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.batch.findMany({
      where: userCampusId ? { campusId: userCampusId } : undefined,
      include: { campus: true, _count: { select: { students: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: userCampusId ? { campusId: userCampusId } : undefined,
      include: { campus: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const campusData = campuses.map((c) => ({
    id: c.id,
    name: c.name,
    city: c.city,
    state: c.state,
    batchCount: c._count.batches,
    totalStudents: c.batches.reduce((acc, b) => acc + b._count.students, 0),
    totalAssessments: c.batches.reduce((acc, b) => acc + b._count.assessments, 0),
    admins: c.users.filter((u) => u.role === "CAMPUS_HEAD" || u.role === "ADMIN"),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Settings & Administration</h1>
          <p className="text-xs text-slate-500">
            {isSuper ? "Logged in as Super Admin (Global Scope)" : `Logged in for ${session?.campusName || "Assigned Center"}`}
          </p>
        </div>
        <ClearDataButton />
      </div>

      {/* Campus Centers Section */}
      <CenterManager campuses={campusData} isSuperAdmin={isSuper} />

      {/* Batches Table */}
      <div className="card border border-slate-200">
        <div className="card-header border-b border-slate-100 px-5 py-3 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-slate-800 text-sm">Active Batches ({batches.length})</h2>
            <p className="text-xs text-slate-500">Stream cohorts configured for your center(s)</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-slate-600 font-semibold">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">Batch Name</th>
                <th className="px-4 py-2.5 text-left font-medium">Stream</th>
                <th className="px-4 py-2.5 text-left font-medium">Session</th>
                <th className="px-4 py-2.5 text-left font-medium">Campus Center</th>
                <th className="px-4 py-2.5 text-center font-medium">Students Enrolled</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {batches.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50 transition">
                  <td className="px-4 py-2.5 font-semibold text-slate-800">{b.name}</td>
                  <td className="px-4 py-2.5">
                    <span className="badge bg-primary-50 text-primary-700 font-medium">{b.stream}</span>
                  </td>
                  <td className="px-4 py-2.5 text-slate-600 text-xs font-mono">{b.sessionYear}</td>
                  <td className="px-4 py-2.5 text-slate-700">{b.campus.name}</td>
                  <td className="px-4 py-2.5 text-center font-mono font-semibold text-slate-800">{b._count.students}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Users & Roles Section */}
      <div className="card border border-slate-200">
        <div className="card-header border-b border-slate-100 px-5 py-3 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-slate-800 text-sm">Staff & Center Accounts ({users.length})</h2>
            <p className="text-xs text-slate-500">Authorized telecallers, faculty, and administrators</p>
          </div>
          <Link href="/login" className="text-xs text-primary-600 hover:underline">
            Switch login &rarr;
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-slate-600 font-semibold">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">Name</th>
                <th className="px-4 py-2.5 text-left font-medium">Email</th>
                <th className="px-4 py-2.5 text-left font-medium">Role</th>
                <th className="px-4 py-2.5 text-left font-medium">Assigned Center</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50 transition">
                  <td className="px-4 py-2.5 font-medium text-slate-900">{u.name}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-600">{u.email}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`badge ${
                        u.role === "ADMIN"
                          ? "bg-purple-100 text-purple-800 font-semibold"
                          : u.role === "CAMPUS_HEAD"
                          ? "bg-blue-100 text-blue-800 font-semibold"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-600">
                    {u.campus?.name ?? "🌐 Global (All Centers)"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Testing & Reset Tool */}
      <ClearDataButton variant="card" />
    </div>
  );
}