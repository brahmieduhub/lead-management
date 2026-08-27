import { prisma } from "@/lib/db";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { getSession, isSuperAdmin, isReadOnly } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AssessmentsPage() {
  const session = await getSession();
  const isSuper = isSuperAdmin(session);
  const userCampusId = session?.campusId;
  const readOnly = isReadOnly(session);

  const assessments = await prisma.assessment.findMany({
    where: userCampusId ? { batch: { campusId: userCampusId } } : undefined,
    include: {
      batch: { include: { campus: true } },
      _count: { select: { testResults: true } },
    },
    orderBy: { examDate: "desc" },
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
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Assessments & Test Cycles</h1>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/rankings"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {assessments.length === 0 ? (
          <div className="col-span-full card p-8 text-center text-xs text-slate-400 border border-slate-200">
            No assessments found for this center.
          </div>
        ) : (
          assessments.map((a) => (
            <Link
              key={a.id}
              href={`/assessments/${a.id}`}
              className="card p-5 border border-slate-200 transition shadow-sm hover:shadow-md space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="badge bg-primary-50 text-primary-700 text-xs font-bold">{a.batch.stream}</span>
                  <h3 className="mt-1.5 font-bold text-slate-900 line-clamp-2">{a.title}</h3>
                </div>
                <span
                  className={`badge text-[10px] ${
                    a.status === "RESULTS_LOCKED"
                      ? "bg-green-100 text-green-800"
                      : a.status === "PUBLISHED"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {a.status.replace("_", " ")}
                </span>
              </div>

              <div className="text-xs text-slate-500 space-y-0.5 border-t border-slate-100 pt-2.5">
                <p className="font-medium text-slate-700">{a.batch.name} · {a.batch.campus.name}</p>
                <p>{formatDate(a.examDate)}</p>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 border-t border-slate-100 pt-2">
                <span>{a._count.testResults} candidates</span>
                <span className="font-semibold text-slate-700">Max {a.totalMarks}M</span>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}