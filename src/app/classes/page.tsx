import { prisma } from "@/lib/db";
import Link from "next/link";
import { getSession, isSuperAdmin, isReadOnly } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ClassesPage() {
  const session = await getSession();
  const isSuper = isSuperAdmin(session);
  const userCampusId = session?.campusId;
  const readOnly = isReadOnly(session);

  const classes = await prisma.batch.findMany({
    where: userCampusId ? { campusId: userCampusId } : undefined,
    include: {
      campus: true,
      students: {
        orderBy: { name: "asc" },
        include: {
          testResults: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      },
      _count: { select: { students: true, assessments: true } },
    },
    orderBy: [{ campus: { name: "asc" } }, { name: "asc" }],
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
              {isSuper ? "All Centers" : session?.campusName || "My Center"}
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Classes</h1>
        </div>

        {!readOnly && (
          <Link href="/upload" className="btn-primary text-xs py-2 px-3.5">
            Import Students
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {classes.length === 0 ? (
          <div className="col-span-full card p-8 text-center text-xs text-slate-400 border border-slate-200">
            No classes found for this center yet.
          </div>
        ) : (
          classes.map((classItem) => (
            <section key={classItem.id} className="card border border-slate-200 overflow-hidden">
              <div className="border-b border-slate-100 px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-bold text-slate-900">{classItem.name}</h2>
                    <p className="text-xs text-slate-500">
                      {classItem.stream} · {classItem.sessionYear} · {classItem.campus.name}
                    </p>
                  </div>
                  <div className="flex gap-2 text-[11px]">
                    <span className="badge bg-slate-100 text-slate-700">{classItem._count.students} students</span>
                    <span className="badge bg-primary-50 text-primary-700">{classItem._count.assessments} tests</span>
                  </div>
                </div>
              </div>

              <div className="max-h-96 overflow-y-auto">
                {classItem.students.length === 0 ? (
                  <p className="p-5 text-center text-xs text-slate-400">No students grouped in this class.</p>
                ) : (
                  <table className="min-w-full divide-y divide-slate-100 text-sm">
                    <thead className="sticky top-0 bg-slate-50 text-xs text-slate-500">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium">Roll No</th>
                        <th className="px-4 py-2 text-left font-medium">Student</th>
                        <th className="px-4 py-2 text-right font-medium">Latest %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {classItem.students.map((student) => {
                        const latest = student.testResults[0];
                        return (
                          <tr key={student.id} className="hover:bg-slate-50">
                            <td className="px-4 py-2 font-mono text-xs text-slate-600">{student.rollNo}</td>
                            <td className="px-4 py-2">
                              <Link href={`/students/${student.id}`} className="font-medium text-primary-700 hover:underline">
                                {student.name}
                              </Link>
                            </td>
                            <td className="px-4 py-2 text-right font-mono text-xs text-slate-700">
                              {latest ? `${latest.percentage.toFixed(1)}%` : "-"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
}
