"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface CampusData {
  id: string;
  name: string;
  city: string;
  state: string;
  batchCount: number;
  totalStudents: number;
  totalAssessments: number;
  admins: { id: string; name: string; email: string; role: string }[];
}

interface CenterManagerProps {
  campuses: CampusData[];
  isSuperAdmin: boolean;
}

export default function CenterManager({ campuses, isSuperAdmin }: CenterManagerProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [selectedCampusId, setSelectedCampusId] = useState<string>("");

  // Add Center Form
  const [centerName, setCenterName] = useState("");
  const [centerCity, setCenterCity] = useState("");
  const [centerState, setCenterState] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Add User Form
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userPassword, setUserPassword] = useState("password123");
  const [userRole, setUserRole] = useState<"CAMPUS_HEAD" | "ADMIN" | "FACULTY" | "TELE_CALLER" | "VIEWER">("CAMPUS_HEAD");

  const router = useRouter();

  async function handleAddCenter(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/campuses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: centerName, city: centerCity, state: centerState }),
      });
      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        setError(data.error || "Failed to create center");
        return;
      }

      setShowAddModal(false);
      setCenterName("");
      setCenterCity("");
      setCenterState("");
      router.refresh();
    } catch {
      setLoading(false);
      setError("Network error while creating center");
    }
  }

  async function handleDeleteCenter(id: string, name: string) {
    if (!confirm(`Are you sure you want to remove "${name}"? This will delete all associated batches, students, and test results for this center.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/campuses?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to delete center");
        return;
      }
      router.refresh();
    } catch {
      alert("Network error while deleting center");
    }
  }

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/campuses/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: userName,
          email: userEmail,
          password: userPassword,
          role: userRole,
          campusId: selectedCampusId || null,
        }),
      });
      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        setError(data.error || "Failed to create user");
        return;
      }

      setShowAddUserModal(false);
      setUserName("");
      setUserEmail("");
      router.refresh();
    } catch {
      setLoading(false);
      setError("Network error while creating user");
    }
  }

  return (
    <div className="space-y-4">
      {/* Action Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-800">Campus Centers ({campuses.length})</h2>
          <p className="text-xs text-slate-500">
            {isSuperAdmin
              ? "Super Admin control: Add or remove centers and configure center admins."
              : "Your center configuration and access scope."}
          </p>
        </div>

        {isSuperAdmin && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSelectedCampusId(campuses[0]?.id || "");
                setShowAddUserModal(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
            >
              <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              Add Center User
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-primary inline-flex items-center gap-1.5 text-xs py-1.5 px-3"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              Add New Center
            </button>
          </div>
        )}
      </div>

      {/* Centers Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {campuses.map((c) => (
          <div key={c.id} className="card p-5 border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-slate-900">{c.name}</h3>
                <p className="text-xs text-slate-500">{c.city}, {c.state}</p>
              </div>
              {isSuperAdmin && (
                <button
                  onClick={() => handleDeleteCenter(c.id, c.name)}
                  title="Remove Center"
                  className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 transition"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 border-t border-b border-slate-100 py-2.5 text-center text-xs">
              <div>
                <p className="text-slate-400">Batches</p>
                <p className="font-bold text-slate-800">{c.batchCount}</p>
              </div>
              <div>
                <p className="text-slate-400">Students</p>
                <p className="font-bold text-slate-800">{c.totalStudents}</p>
              </div>
              <div>
                <p className="text-slate-400">Tests</p>
                <p className="font-bold text-slate-800">{c.totalAssessments}</p>
              </div>
            </div>

            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Admins / Staff</p>
              {c.admins.length > 0 ? (
                <div className="mt-1 space-y-1">
                  {c.admins.map((u) => (
                    <div key={u.id} className="flex items-center justify-between text-xs text-slate-600">
                      <span className="font-medium truncate max-w-[140px]">{u.name}</span>
                      <span className="badge bg-slate-100 text-slate-700 text-[10px]">{u.role}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-1 text-xs text-slate-400 italic">No center admin assigned</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add Center Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="card max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200 bg-white">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Add New Center</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddCenter} className="space-y-3">
              <div>
                <label className="label text-xs font-semibold">Center Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. NANO Madhapur Campus"
                  className="input text-sm"
                  value={centerName}
                  onChange={(e) => setCenterName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label text-xs font-semibold">City</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Hyderabad"
                    className="input text-sm"
                    value={centerCity}
                    onChange={(e) => setCenterCity(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label text-xs font-semibold">State</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Telangana"
                    className="input text-sm"
                    value={centerState}
                    onChange={(e) => setCenterState(e.target.value)}
                  />
                </div>
              </div>

              {error && <p className="text-xs text-red-600">{error}</p>}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary text-xs py-1.5 px-4"
                >
                  {loading ? "Creating..." : "Create Center"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="card max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200 bg-white">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Create Center User / Admin</h3>
              <button
                onClick={() => setShowAddUserModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddUser} className="space-y-3">
              <div>
                <label className="label text-xs font-semibold">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  className="input text-sm"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                />
              </div>

              <div>
                <label className="label text-xs font-semibold">Email</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. admin@madhapur.com"
                  className="input text-sm"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                />
              </div>

              <div>
                <label className="label text-xs font-semibold">Password</label>
                <input
                  type="password"
                  required
                  className="input text-sm"
                  value={userPassword}
                  onChange={(e) => setUserPassword(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label text-xs font-semibold">Role</label>
                  <select
                    className="input text-sm"
                    value={userRole}
                    onChange={(e) => setUserRole(e.target.value as typeof userRole)}
                  >
                    <option value="CAMPUS_HEAD">Center Admin (Campus Head)</option>
                    <option value="ADMIN">Super Admin (Global)</option>
                    <option value="FACULTY">Faculty (Read-Only)</option>
                    <option value="TELE_CALLER">Telecaller (Read-Only)</option>
                    <option value="VIEWER">Viewer (Read-Only)</option>
                  </select>
                </div>

                <div>
                  <label className="label text-xs font-semibold">Assigned Center</label>
                  <select
                    className="input text-sm"
                    value={selectedCampusId}
                    onChange={(e) => setSelectedCampusId(e.target.value)}
                    disabled={userRole === "ADMIN"}
                  >
                    {userRole === "ADMIN" ? (
                      <option value="">Global (All Centers)</option>
                    ) : (
                      campuses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              {error && <p className="text-xs text-red-600">{error}</p>}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary text-xs py-1.5 px-4"
                >
                  {loading ? "Creating..." : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
