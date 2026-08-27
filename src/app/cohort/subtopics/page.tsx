import { prisma } from "@/lib/db";
import Link from "next/link";
import { getSession, isSuperAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

function accuracyColor(accuracy: number | null): string {
  if (accuracy === null) return "bg-slate-100 text-slate-400";
  if (accuracy < 35) return "bg-red-200 text-red-900 font-bold";
  if (accuracy < 50) return "bg-red-100 text-red-800";
  if (accuracy < 65) return "bg-amber-100 text-amber-800";
  if (accuracy < 80) return "bg-emerald-100 text-emerald-800";
  return "bg-emerald-200 text-emerald-900 font-bold";
}

function trendArrow(history: number[]): { symbol: string; color: string } {
  if (history.length < 2) return { symbol: "—", color: "text-slate-400" };
  const last = history[history.length - 1];
  const prev = history[history.length - 2];
  const diff = last - prev;
  if (diff <= -10) return { symbol: "↓↓", color: "text-red-700" };
  if (diff < -3) return { symbol: "↓", color: "text-red-500" };
  if (diff >= 10) return { symbol: "↑↑", color: "text-emerald-700" };
  if (diff > 3) return { symbol: "↑", color: "text-emerald-500" };
  return { symbol: "→", color: "text-slate-400" };
}

export default async function CohortSubtopicsPage() {
  const session = await getSession();
  const isSuper = isSuperAdmin(session);
  const userCampusId = session?.campusId;

  // Fetch last 6 assessments ordered chronologically
  const assessments = await prisma.assessment.findMany({
    where: userCampusId ? { batch: { campusId: userCampusId } } : undefined,
    orderBy: { examDate: "asc" },
    select: { id: true, title: true, examDate: true },
    take: 6,
  });

  if (assessments.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-900">Subtopic Trend Heatmap</h1>
        <div className="card p-8 border border-slate-200 text-center">
          <p className="text-slate-500">No assessments found. Upload results to get started.</p>
        </div>
      </div>
    );
  }

  // Build subtopic × assessment accuracy matrix
  const subtopicData = new Map<
    string,
    { subject: string; chapter: string; subtopic: string; byAssessment: Map<string, number> }
  >();

  for (const assessment of assessments) {
    const rows = await prisma.studentSubtopicSummary.findMany({
      where: { assessmentId: assessment.id },
    });

    const grouped = new Map<string, number[]>();
    for (const row of rows) {
      if (!row.chapter || !row.subtopic) continue;
      const key = `${row.subject}||${row.chapter}||${row.subtopic}`;
      const arr = grouped.get(key) ?? [];
      arr.push(row.accuracy);
      grouped.set(key, arr);
    }

    for (const [key, accuracies] of Array.from(grouped.entries())) {
      const [subject, chapter, subtopic] = key.split("||");
      if (!subtopicData.has(key)) {
        subtopicData.set(key, { subject, chapter, subtopic, byAssessment: new Map() });
      }
      const avg = accuracies.reduce((a, b) => a + b, 0) / accuracies.length;
      subtopicData.get(key)!.byAssessment.set(assessment.id, Math.round(avg * 10) / 10);
    }
  }

  // Sort: worst performers on latest assessment first
  const latestId = assessments[assessments.length - 1].id;
  const rows = Array.from(subtopicData.values()).sort((a, b) => {
    const aAcc = a.byAssessment.get(latestId) ?? 100;
    const bAcc = b.byAssessment.get(latestId) ?? 100;
    return aAcc - bAcc;
  });

  const hasData = rows.length > 0;

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
              {isSuper ? "🌐 All Centers" : `📍 ${session?.campusName ?? "My Center"}`}
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Subtopic Trend Heatmap</h1>
          <p className="text-sm text-slate-500 mt-1">
            Class-level subtopic accuracy across {assessments.length} assessment(s). Worst subtopics listed first.
          </p>
        </div>
        <Link href="/cohort" className="text-xs text-primary-600 hover:underline">
          ← Cohort Overview
        </Link>
      </div>

      {/* Colour Legend */}
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="px-2 py-1 rounded bg-red-200 text-red-900 font-bold">Below 35%</span>
        <span className="px-2 py-1 rounded bg-red-100 text-red-800">35–49%</span>
        <span className="px-2 py-1 rounded bg-amber-100 text-amber-800">50–64%</span>
        <span className="px-2 py-1 rounded bg-emerald-100 text-emerald-800">65–79%</span>
        <span className="px-2 py-1 rounded bg-emerald-200 text-emerald-900 font-bold">80%+</span>
        <span className="px-2 py-1 rounded bg-slate-100 text-slate-400">No data</span>
        <span className="ml-4 text-slate-500">Trend: ↑↑ +10%+ &nbsp;↑ +3%+ &nbsp;→ stable &nbsp;↓ −3%+ &nbsp;↓↓ −10%+</span>
      </div>

      {!hasData ? (
        <div className="card p-8 border border-amber-200 bg-amber-50 text-center">
          <p className="text-amber-800 font-semibold">No subtopic data yet.</p>
          <p className="text-amber-700 text-sm mt-1">
            Upload a Question Mapping CSV and then the QuestionWiseAnalysis XLS to populate this heatmap.
          </p>
          <Link href="/upload" className="mt-3 inline-block btn-primary text-xs py-1.5 px-3">
            Go to Upload →
          </Link>
        </div>
      ) : (
        <div className="card border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-3 py-2.5 text-left font-semibold border-r border-slate-200 sticky left-0 bg-slate-50 z-10">
                    Subject
                  </th>
                  <th className="px-3 py-2.5 text-left font-semibold border-r border-slate-200 min-w-32">
                    Chapter
                  </th>
                  <th className="px-3 py-2.5 text-left font-semibold border-r border-slate-200 min-w-40">
                    Subtopic
                  </th>
                  {assessments.map((a) => (
                    <th key={a.id} className="px-3 py-2.5 text-center font-medium min-w-20 border-r border-slate-200">
                      <Link href={`/assessments/${a.id}/questions`} className="hover:underline block">
                        {a.title.split(" ").slice(-2).join(" ")}
                      </Link>
                      <div className="text-slate-400 font-normal text-[10px]">
                        {new Date(a.examDate).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                        })}
                      </div>
                    </th>
                  ))}
                  <th className="px-3 py-2.5 text-center font-semibold">Trend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {rows.map((row, i) => {
                  const history = assessments
                    .map((a) => row.byAssessment.get(a.id))
                    .filter((v): v is number => v !== undefined);
                  const { symbol, color } = trendArrow(history);
                  return (
                    <tr key={i} className="hover:bg-slate-50/50">
                      <td className="px-3 py-2 font-semibold text-slate-700 border-r border-slate-100 sticky left-0 bg-white">
                        {row.subject}
                      </td>
                      <td className="px-3 py-2 text-slate-500 border-r border-slate-100">{row.chapter}</td>
                      <td className="px-3 py-2 text-slate-800 border-r border-slate-100">{row.subtopic}</td>
                      {assessments.map((a) => {
                        const acc = row.byAssessment.get(a.id) ?? null;
                        return (
                          <td
                            key={a.id}
                            className={`px-3 py-2 text-center border-r border-slate-100 ${accuracyColor(acc)}`}
                          >
                            {acc !== null ? `${acc}%` : "—"}
                          </td>
                        );
                      })}
                      <td className={`px-3 py-2 text-center font-bold text-base ${color}`}>{symbol}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}