"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@brahmieduhub.in");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      setLoading(false);
      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }
      router.push("/");
      router.refresh();
    } catch (err: any) {
      setLoading(false);
      setError("Network or server connection error.");
    }
  }

  async function handleSeedDatabase() {
    setSeeding(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/seed");
      const data = await res.json();
      setSeeding(false);
      if (res.ok) {
        setSuccess("Database initialized with NEET/JEE students and classes!");
        setEmail("admin@brahmieduhub.in");
        setPassword("password123");
      } else {
        setError(data.error || "Failed to initialize database");
      }
    } catch (err: any) {
      setSeeding(false);
      setError("Failed to reach seed endpoint.");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        <div className="card p-8 shadow-md rounded-2xl bg-white border border-slate-200">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-primary-700">EduTestPro</h1>
            <p className="mt-1 text-sm text-slate-500">Student Management & AI Diagnostics</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label text-xs font-semibold text-slate-700">Email Address</label>
              <input
                type="email"
                className="input w-full mt-1 px-3 py-2 border rounded-lg"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@brahmieduhub.in"
                required
              />
            </div>
            <div>
              <label className="label text-xs font-semibold text-slate-700">Password</label>
              <input
                type="password"
                className="input w-full mt-1 px-3 py-2 border rounded-lg"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="password123"
                required
              />
            </div>

            {error && <p className="text-sm text-red-600 font-medium">{error}</p>}
            {success && <p className="text-sm text-emerald-600 font-medium">{success}</p>}

            <button
              type="submit"
              className="btn-primary w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg shadow"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col gap-2">
            <button
              type="button"
              onClick={handleSeedDatabase}
              disabled={seeding}
              className="w-full py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
            >
              {seeding ? "Initializing database..." : "🌱 Initialize / Seed Student Database"}
            </button>

            <div className="flex justify-between items-center text-[11px] text-slate-400 mt-2">
              <span>Quick Fill:</span>
              <button
                type="button"
                className="text-primary-600 hover:underline"
                onClick={() => {
                  setEmail("admin@brahmieduhub.in");
                  setPassword("password123");
                }}
              >
                Director
              </button>
              <span>•</span>
              <button
                type="button"
                className="text-primary-600 hover:underline"
                onClick={() => {
                  setEmail("faculty@brahmieduhub.in");
                  setPassword("password123");
                }}
              >
                Faculty
              </button>
              <span>•</span>
              <button
                type="button"
                className="text-primary-600 hover:underline"
                onClick={() => {
                  setEmail("superadmin@eduhub.com");
                  setPassword("password123");
                }}
              >
                Superadmin
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}