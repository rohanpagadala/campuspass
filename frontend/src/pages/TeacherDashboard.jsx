import { useEffect, useState } from "react";
import apiClient from "../api/client";
import DashboardLayout from "../components/DashboardLayout";
import formatDateTime from "../utils/formatDateTime";
import extractApiErrorMessage from "../utils/extractApiErrorMessage";

export default function TeacherDashboard() {
  const [outpasses, setOutpasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actioningId, setActioningId] = useState(null);
  const [actionError, setActionError] = useState("");
  const [confirmation, setConfirmation] = useState("");

  async function fetchPending() {
    setLoading(true);
    setLoadError("");
    try {
      const { data } = await apiClient.get("/outpass/pending");
      setOutpasses(data);
    } catch {
      setLoadError("Could not load pending requests.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPending();
  }, []);

  async function handleDecision(outpassId, decision) {
    setActionError("");
    setConfirmation("");
    setActioningId(outpassId);
    try {
      await apiClient.post(`/outpass/${outpassId}/${decision}`);
      setOutpasses((prev) => prev.filter((o) => o.id !== outpassId));
      setConfirmation(
        decision === "approve"
          ? "Request approved and sent to HOD for final approval."
          : "Request rejected."
      );
    } catch (err) {
      setActionError(
        extractApiErrorMessage(err, "Could not update this request. Please try again.")
      );
    } finally {
      setActioningId(null);
    }
  }

  return (
    <DashboardLayout>
      <h1 className="text-xl font-semibold text-slate-900 mb-4">Teacher Dashboard</h1>

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

      <h2 className="text-base font-semibold text-slate-900 mb-3">Pending Requests</h2>

      {loading && <p className="text-sm text-slate-500">Loading...</p>}
      {loadError && <p className="text-sm text-red-600">{loadError}</p>}

      {!loading && !loadError && outpasses.length === 0 && (
        <p className="text-sm text-slate-500">No pending requests.</p>
      )}

      <ul className="flex flex-col gap-3">
        {outpasses.map((outpass) => {
          const isBusy = actioningId === outpass.id;
          return (
            <li
              key={outpass.id}
              className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4"
            >
              <div className="mb-2">
                <p className="text-sm font-semibold text-slate-900">
                  {outpass.student_full_name}
                </p>
                <p className="text-xs text-slate-500">@{outpass.student_username}</p>
              </div>

              <p className="text-sm text-slate-900 mb-2">{outpass.reason}</p>
              <p className="text-xs text-slate-500 mb-4">
                Exit: {formatDateTime(outpass.requested_exit_time)}
              </p>

              <div className="flex gap-2">
                <button
                  onClick={() => handleDecision(outpass.id, "approve")}
                  disabled={isBusy}
                  className="flex-1 px-3 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:bg-green-300 disabled:cursor-not-allowed transition-colors"
                >
                  Approve
                </button>
                <button
                  onClick={() => handleDecision(outpass.id, "reject")}
                  disabled={isBusy}
                  className="flex-1 px-3 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed transition-colors"
                >
                  Reject
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </DashboardLayout>
  );
}
