import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { getClassSubtopicAccuracy } from "@/lib/subtopicAnalytics";
import { getSession, isSuperAdmin } from "@/lib/auth";

import QuestionPaperUploader from "@/components/QuestionPaperUploader";

export const dynamic = "force-dynamic";

export default async function AssessmentQuestionsPage({ params }: { params: { id: string } }) {
  const session = await getSession();
  const isSuper = isSuperAdmin(session);
  const userCampusId = session?.campusId;

  const assessment = await prisma.assessment.findUnique({
    where: { id: params.id },
    include: {
      batch: { include: { campus: true } },
      assessmentQuestions: { orderBy: { questionNo: "asc" } },
    },
  });

  if (!assessment) notFound();
  if (!isSuper && userCampusId && assessment.batch.campusId !== userCampusId) notFound();

  const hasMapping = assessment.assessmentQuestions.length > 0;
  const hasSubtopics = assessment.assessmentQuestions.some((q) => q.subtopic);

  const questionStats = hasMapping
    ? await prisma.studentQuestionResponse.groupBy({
        by: ["assessmentQuestionId"],
        where: { assessmentQuestion: { assessmentId: params.id } },
        _count: { id: true },
        _sum: { marksScored: true },
      })
    : [];

  const totalStudents = await prisma.testResult.count({ where: { assessmentId: params.id } });
  const qStatsMap = new Map(questionStats.map((s) => [s.assessmentQuestionId, s]));
  const subtopicAccuracy = hasSubtopics ? await getClassSubtopicAccuracy(params.id) : [];

  return (
    <div className="space-y-6">
      {/* Header with Question Paper Upload Action */}
      <div className="card p-5 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span>{assessment.batch.campus.name}</span>
            <span>›</span>
            <span>{assessment.batch.name}</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">{assessment.title}</h1>
          <p className="text-sm text-slate-500 mt-1">
            Question-wise Analysis · {assessment.assessmentQuestions.length} questions mapped · {totalStudents} students
          </p>
        </div>

        <div>
          <QuestionPaperUploader
            assessmentId={assessment.id}
            assessmentTitle={assessment.title}
            stream={assessment.batch.stream}
          />
        </div>
      </div>

      {/* No mapping warning */}
      {!hasMapping && (
        <div className="card p-6 border border-amber-200 bg-amber-50 text-center">
          <p className="text-amber-800 font-semibold">No question mapping uploaded yet.</p>
          <p className="text-amber-700 text-sm mt-1">
            Go to Upload → select <strong>Question Mapping</strong> and choose this assessment to enable subtopic analysis.
          </p>
        </div>
      )}

      {/* Class-level Subtopic Accuracy */}
      {hasSubtopics && subtopicAccuracy.length > 0 && (
        <div className="card border border-slate-200 overflow-hidden">
          <div className="card-header px-5 py-3 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-bold text-slate-800 text-sm">Class Subtopic Accuracy</h2>
            <span className="text-xs text-slate-400">Red rows = class avg below 50%</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium">Subject</th>
                  <th className="px-4 py-2.5 text-left font-medium">Chapter</th>
                  <th className="px-4 py-2.5 text-left font-medium">Subtopic</th>
                  <th className="px-4 py-2.5 text-center font-medium">Class Avg</th>
                  <th className="px-4 py-2.5 text-center font-medium">Students Weak</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {subtopicAccuracy.map((row, i) => (
                  <tr key={i} className={row.avgAccuracy < 50 ? "bg-red-50" : "hover:bg-slate-50"}>
                    <td className="px-4 py-2.5 font-semibold text-slate-700">{row.subject}</td>
                    <td className="px-4 py-2.5 text-slate-600">{row.chapter}</td>
                    <td className="px-4 py-2.5 text-slate-800">{row.subtopic}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`font-bold ${row.avgAccuracy < 50 ? "text-red-600" : "text-emerald-600"}`}>
                        {row.avgAccuracy}%
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center text-slate-600">
                      {row.studentsWeak} / {row.totalStudents}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Per-Question Table */}
      {hasMapping && (
        <div className="card border border-slate-200 overflow-hidden">
          <div className="card-header px-5 py-3 border-b border-slate-100">
            <h2 className="font-bold text-slate-800 text-sm">Question-level Class Accuracy</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-2.5 text-center font-medium w-12">Q No</th>
                  <th className="px-4 py-2.5 text-left font-medium">Subject</th>
                  <th className="px-4 py-2.5 text-left font-medium">Chapter</th>
                  <th className="px-4 py-2.5 text-left font-medium">Subtopic</th>
                  <th className="px-4 py-2.5 text-center font-medium">Key</th>
                  <th className="px-4 py-2.5 text-center font-medium">Class Accuracy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {assessment.assessmentQuestions.map((q) => {
                  const stat = qStatsMap.get(q.id);
                  const correct = stat ? Math.round((stat._sum.marksScored ?? 0) / q.maxMarks) : 0;
                  const accuracy = totalStudents > 0 ? Math.round((correct / totalStudents) * 100) : null;
                  const isWeak = accuracy !== null && accuracy < 50;
                  return (
                    <tr key={q.id} className={isWeak ? "bg-red-50" : "hover:bg-slate-50"}>
                      <td className="px-4 py-2 text-center font-mono text-slate-500">{q.questionNo}</td>
                      <td className="px-4 py-2 font-semibold text-slate-700">{q.subject}</td>
                      <td className="px-4 py-2 text-slate-500 text-xs">{q.chapter ?? "—"}</td>
                      <td className="px-4 py-2 text-slate-700">{q.subtopic ?? "—"}</td>
                      <td className="px-4 py-2 text-center font-mono font-bold text-slate-700">{q.correctKey ?? "—"}</td>
                      <td className="px-4 py-2 text-center">
                        {accuracy !== null ? (
                          <span className={`font-bold ${isWeak ? "text-red-600" : "text-emerald-600"}`}>
                            {accuracy}%
                            <span className="ml-1 text-xs font-normal text-slate-400">
                              ({correct}/{totalStudents})
                            </span>
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">No data</span>
                        )}
                      </td>
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