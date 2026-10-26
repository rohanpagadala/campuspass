import { useEffect, useState } from "react";
import apiClient from "../api/client";
import DashboardLayout from "../components/DashboardLayout";
import StatusBadge from "../components/StatusBadge";
import formatDateTime from "../utils/formatDateTime";
import extractApiErrorMessage from "../utils/extractApiErrorMessage";
import { useAuth } from "../context/AuthContext";

const TABS = [
  { id: "outpasses", label: "All Outpasses" },
  { id: "users", label: "Users" },
  { id: "exitLogs", label: "Exit Logs" },
];

export default function HodDashboard() {
  const [activeTab, setActiveTab] = useState("outpasses");

  return (
    <DashboardLayout>
      <h1 className="text-xl font-semibold text-slate-900 mb-4">HOD Dashboard</h1>

      <div className="flex gap-1 mb-6 border-b border-slate-200">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab.id
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "outpasses" && <OutpassesTab />}
      {activeTab === "users" && <UsersTab />}
      {activeTab === "exitLogs" && <ExitLogsTab />}
    </DashboardLayout>
  );
}

function OutpassesTab() {
  const [outpasses, setOutpasses] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actioningId, setActioningId] = useState(null);
  const [actionError, setActionError] = useState("");
  const [confirmation, setConfirmation] = useState("");

  async function fetchOutpasses() {
    setLoading(true);
    setError("");
    try {
      const { data } = await apiClient.get("/hod/outpasses", {
        params: statusFilter ? { status: statusFilter } : {},
      });
      setOutpasses(data);
    } catch {
      setError("Could not load outpasses.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchOutpasses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  async function handleDecision(outpassId, decision) {
    setActionError("");
    setConfirmation("");
    setActioningId(outpassId);
    try {
      await apiClient.post(`/hod/outpasses/${outpassId}/${decision}`);
      setConfirmation(
        decision === "approve"
          ? "Final approval given — QR code and exit code generated."
          : "Request rejected."
      );
      await fetchOutpasses();
    } catch (err) {
      setActionError(
        extractApiErrorMessage(err, "Could not update this request. Please try again.")
      );
    } finally {
      setActioningId(null);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <label htmlFor="status-filter" className="text-sm font-medium text-slate-700">
          Filter by status
        </label>
        <select
          id="status-filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-2 py-1.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">All</option>
          <option value="pending">Pending</option>
          <option value="teacher_approved">Awaiting HOD</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      {confirmation && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-4">
          {confirmation}
        </p>
      )}
      {actionError && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
          {actionError}
        </p>
      )}

      {loading && <p className="text-sm text-slate-500">Loading...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!loading && !error && outpasses.length === 0 && (
        <p className="text-sm text-slate-500">No outpasses found.</p>
      )}

      <div className="flex flex-col gap-3">
        {outpasses.map((o) => {
          const isBusy = actioningId === o.id;
          return (
            <div
              key={o.id}
              className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {o.student_full_name}{" "}
                    <span className="text-xs font-normal text-slate-500">
                      @{o.student_username}
                    </span>
                  </p>
                  <p className="text-sm text-slate-900">{o.reason}</p>
                </div>
                <StatusBadge status={o.status} />
              </div>
              <p className="text-xs text-slate-500 mb-1">
                Exit: {formatDateTime(o.requested_exit_time)}
              </p>
              <p className="text-xs text-slate-500">
                Teacher:{" "}
                {o.teacher_full_name ? `${o.teacher_full_name} (@${o.teacher_username})` : "—"}
                {o.decided_at ? ` on ${formatDateTime(o.decided_at)}` : ""}
              </p>
              <p className="text-xs text-slate-500 mb-2">
                HOD: {o.hod_full_name ? `${o.hod_full_name} (@${o.hod_username})` : "—"}
                {o.hod_decided_at ? ` on ${formatDateTime(o.hod_decided_at)}` : ""}
              </p>

              {o.status === "teacher_approved" && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDecision(o.id, "approve")}
                    disabled={isBusy}
                    className="flex-1 px-3 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:bg-green-300 disabled:cursor-not-allowed transition-colors"
                  >
                    Final Approve
                  </button>
                  <button
                    onClick={() => handleDecision(o.id, "reject")}
                    disabled={isBusy}
                    className="flex-1 px-3 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed transition-colors"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const EMPTY_USER_FORM = {
  username: "",
  password: "",
  full_name: "",
  role: "student",
};

function UsersTab() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [form, setForm] = useState(EMPTY_USER_FORM);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [deactivatingId, setDeactivatingId] = useState(null);
  const [actionError, setActionError] = useState("");

  async function fetchUsers() {
    setLoading(true);
    setLoadError("");
    try {
      const { data } = await apiClient.get("/hod/users");
      setUsers(data);
    } catch {
      setLoadError("Could not load users.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  function handleFormChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleCreateUser(e) {
    e.preventDefault();
    setCreateError("");
    setCreating(true);
    try {
      await apiClient.post("/hod/users", form);
      setForm(EMPTY_USER_FORM);
      await fetchUsers();
    } catch (err) {
      setCreateError(extractApiErrorMessage(err, "Could not create user."));
    } finally {
      setCreating(false);
    }
  }

  async function handleDeactivate(userId) {
    setActionError("");
    setDeactivatingId(userId);
    try {
      await apiClient.patch(`/hod/users/${userId}/deactivate`);
      await fetchUsers();
    } catch (err) {
      setActionError(extractApiErrorMessage(err, "Could not deactivate user."));
    } finally {
      setDeactivatingId(null);
    }
  }

  return (
    <div>
      <form
        onSubmit={handleCreateUser}
        className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-5 flex flex-col gap-3 mb-6"
      >
        <h2 className="text-base font-semibold text-slate-900">Create User</h2>

        <input
          name="username"
          placeholder="Username"
          value={form.username}
          onChange={handleFormChange}
          required
          className="px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <input
          name="password"
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={handleFormChange}
          required
          className="px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <input
          name="full_name"
          placeholder="Full name"
          value={form.full_name}
          onChange={handleFormChange}
          required
          className="px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <select
          name="role"
          value={form.role}
          onChange={handleFormChange}
          className="px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="student">Student</option>
          <option value="teacher">Teacher</option>
          <option value="security">Security</option>
          <option value="hod">HOD</option>
        </select>

        {createError && <p className="text-sm text-red-600">{createError}</p>}

        <button
          type="submit"
          disabled={creating}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors"
        >
          {creating ? "Creating..." : "Create user"}
        </button>
      </form>

      {loading && <p className="text-sm text-slate-500">Loading...</p>}
      {loadError && <p className="text-sm text-red-600">{loadError}</p>}
      {actionError && <p className="text-sm text-red-600 mb-3">{actionError}</p>}

      <div className="flex flex-col gap-2">
        {users.map((u) => (
          <div
            key={u.id}
            className="bg-white rounded-2xl shadow-sm border border-slate-200 p-3 flex items-center justify-between gap-3"
          >
            <div>
              <p className="text-sm font-medium text-slate-900">
                {u.full_name}{" "}
                <span className="text-xs font-normal text-slate-500">@{u.username}</span>
              </p>
              <p className="text-xs text-slate-500 capitalize">
                {u.role} · {u.is_active ? "active" : "deactivated"}
              </p>
            </div>
            {u.id !== currentUser?.id && u.is_active && (
              <button
                onClick={() => handleDeactivate(u.id)}
                disabled={deactivatingId === u.id}
                className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed transition-colors shrink-0"
              >
                {deactivatingId === u.id ? "..." : "Deactivate"}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ExitLogsTab() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiClient
      .get("/hod/exit-logs")
      .then(({ data }) => setLogs(data))
      .catch(() => setError("Could not load exit logs."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      {loading && <p className="text-sm text-slate-500">Loading...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!loading && !error && logs.length === 0 && (
        <p className="text-sm text-slate-500">No exit logs yet.</p>
      )}

      <div className="flex flex-col gap-3">
        {logs.map((log) => (
          <div
            key={log.id}
            className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4"
          >
            <p className="text-sm font-semibold text-slate-900">
              {log.student_full_name}{" "}
              <span className="text-xs font-normal text-slate-500">
                @{log.student_username}
              </span>
            </p>
            <p className="text-sm text-slate-900 mb-1">{log.reason}</p>
            <p className="text-xs text-slate-500">Exited: {formatDateTime(log.scanned_at)}</p>
            <p className="text-xs text-slate-500">
              Scanned by: {log.scanned_by_full_name} (@{log.scanned_by_username})
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
