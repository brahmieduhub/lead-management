"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ClearDataButtonProps {
  onCleared?: () => void;
  className?: string;
  variant?: "danger" | "outline-danger" | "card";
}

export default function ClearDataButton({
  onCleared,
  className = "",
  variant = "outline-danger",
}: ClearDataButtonProps) {
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [scope, setScope] = useState<"student_data" | "full_reset">("student_data");
  const [statusMessage, setStatusMessage] = useState("");
  const router = useRouter();

  async function handleClear() {
    setLoading(true);
    setStatusMessage("");

    try {
      const res = await fetch("/api/data/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope }),
      });

      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        alert(data.error || "Failed to clear data.");
        return;
      }

      setShowConfirm(false);
      setStatusMessage(data.message || "Data cleared successfully.");
      if (onCleared) {
        onCleared();
      }
      router.refresh();
    } catch {
      setLoading(false);
      alert("Network error while clearing data.");
    }
  }

  return (
    <>
      {variant === "card" ? (
        <div className="card p-5 border border-red-200 bg-red-50/40 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-red-900 text-sm">Testing & Data Reset</h3>
              <p className="text-xs text-red-700 mt-0.5">
                Wipe all uploaded student results, assessments, and diagnostic reports to start fresh testing with your own data.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowConfirm(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-red-700 transition"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Clear All Data
            </button>
          </div>
          {statusMessage && (
            <p className="text-xs font-medium text-green-700 bg-green-50 p-2 rounded border border-green-200">
              ✓ {statusMessage}
            </p>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowConfirm(true)}
          className={
            className ||
            "inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 shadow-sm hover:bg-red-50 transition"
          }
        >
          <svg className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Clear All Data
        </button>
      )}

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="card max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200 bg-white">
            <div className="flex items-center gap-3 text-red-600">
              <div className="rounded-full bg-red-100 p-2">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-900">Confirm Data Reset</h3>
            </div>

            <p className="text-sm text-slate-600">
              Are you sure you want to clear test data? This will allow you to test fresh uploads with your own custom spreadsheet.
            </p>

            <div className="space-y-2 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="clearScope"
                  checked={scope === "student_data"}
                  onChange={() => setScope("student_data")}
                  className="text-red-600 focus:ring-red-500"
                />
                <div>
                  <strong className="text-slate-800">Clear Student Data & Results Only (Recommended)</strong>
                  <p className="text-slate-500">Deletes all students, test results, assessments, subject scores, and drift trends. Keeps batches and user logins.</p>
                </div>
              </label>
              <label className="flex items-center gap-2 cursor-pointer pt-2 border-t border-slate-200">
                <input
                  type="radio"
                  name="clearScope"
                  checked={scope === "full_reset"}
                  onChange={() => setScope("full_reset")}
                  className="text-red-600 focus:ring-red-500"
                />
                <div>
                  <strong className="text-slate-800">Full Factory Reset</strong>
                  <p className="text-slate-500">Resets everything and recreates a clean default campus, batch, and admin login (superadmin@eduhub.com / password123).</p>
                </div>
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={loading}
                onClick={() => setShowConfirm(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleClear}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-red-700 flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>Clearing...</span>
                  </>
                ) : (
                  "Yes, Clear Data"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
