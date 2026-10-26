import { useEffect, useState } from "react";
import apiClient from "../api/client";
import DashboardLayout from "../components/DashboardLayout";
import StatusBadge from "../components/StatusBadge";
import QrCodeModal from "../components/QrCodeModal";
import formatDateTime from "../utils/formatDateTime";
import extractApiErrorMessage from "../utils/extractApiErrorMessage";

const EMPTY_FORM = {
  reason: "",
  requested_exit_time: "",
};

function getClientValidationError(form) {
  if (!form.requested_exit_time) return "";

  const exitTime = new Date(form.requested_exit_time);
  if (exitTime < new Date()) {
    return "Requested exit time cannot be in the past.";
  }
  return "";
}

export default function StudentDashboard() {
  const [outpasses, setOutpasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [qrOutpass, setQrOutpass] = useState(null);

  const validationError = getClientValidationError(form);

  async function fetchOutpasses() {
    setLoading(true);
    setLoadError("");
    try {
      const { data } = await apiClient.get("/outpass/mine");
      setOutpasses(data);
    } catch {
      setLoadError("Could not load your outpass requests.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchOutpasses();
  }, []);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (validationError) return;

    setSubmitError("");
    setSubmitting(true);
    try {
      await apiClient.post("/outpass", form);
      setForm(EMPTY_FORM);
      await fetchOutpasses();
    } catch (err) {
      setSubmitError(
        extractApiErrorMessage(err, "Could not submit your request. Please try again.")
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DashboardLayout>
      <h1 className="text-xl font-semibold text-slate-900 mb-4">Student Dashboard</h1>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-5 flex flex-col mb-6"
      >
        <h2 className="text-base font-semibold text-slate-900 mb-4">
          New Outpass Request
        </h2>

        <label htmlFor="reason" className="text-sm font-medium text-slate-700 mb-1">
          Reason
        </label>
        <textarea
          id="reason"
          name="reason"
          value={form.reason}
          onChange={handleChange}
          required
          rows={2}
          className="mb-4 px-3 py-2.5 rounded-lg border border-slate-300 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
        />

        <label
          htmlFor="requested_exit_time"
          className="text-sm font-medium text-slate-700 mb-1"
        >
          Requested exit time
        </label>
        <input
          id="requested_exit_time"
          name="requested_exit_time"
          type="datetime-local"
          value={form.requested_exit_time}
          onChange={handleChange}
          required
          className="mb-5 px-3 py-2.5 rounded-lg border border-slate-300 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />

        {validationError && (
          <p className="text-sm text-red-600 -mt-2 mb-4">{validationError}</p>
        )}
        {submitError && <p className="text-sm text-red-600 -mt-2 mb-4">{submitError}</p>}

        <button
          type="submit"
          disabled={submitting || Boolean(validationError)}
          className="px-4 py-2.5 rounded-lg bg-blue-600 text-white font-semibold text-base hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? "Submitting..." : "Submit request"}
        </button>
      </form>

      <h2 className="text-base font-semibold text-slate-900 mb-3">My Requests</h2>

      {loading && <p className="text-sm text-slate-500">Loading...</p>}
      {loadError && <p className="text-sm text-red-600">{loadError}</p>}

      {!loading && !loadError && outpasses.length === 0 && (
        <p className="text-sm text-slate-500">No outpass requests yet.</p>
      )}

      <ul className="flex flex-col gap-3">
        {outpasses.map((outpass) => (
          <li
            key={outpass.id}
            className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4"
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <p className="text-sm font-medium text-slate-900">{outpass.reason}</p>
              <StatusBadge status={outpass.status} />
            </div>
            <p className="text-xs text-slate-500 mb-2">
              Exit: {formatDateTime(outpass.requested_exit_time)}
            </p>

            {outpass.status === "approved" && (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setQrOutpass(outpass)}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  View QR Code
                </button>
                {outpass.short_code && (
                  <span className="text-xs text-slate-500">
                    Code:{" "}
                    <span className="font-mono font-semibold text-slate-700">
                      {outpass.short_code}
                    </span>
                  </span>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>

      {qrOutpass && (
        <QrCodeModal outpass={qrOutpass} onClose={() => setQrOutpass(null)} />
      )}
    </DashboardLayout>
  );
}
