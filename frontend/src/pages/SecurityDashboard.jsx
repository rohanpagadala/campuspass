import { useState } from "react";
import apiClient from "../api/client";
import DashboardLayout from "../components/DashboardLayout";
import formatDateTime from "../utils/formatDateTime";
import extractApiErrorMessage from "../utils/extractApiErrorMessage";

export default function SecurityDashboard() {
  const [code, setCode] = useState("");
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  async function handleScan(e) {
    e.preventDefault();
    if (!code.trim()) return;

    setScanning(true);
    setResult(null);
    setError("");

    try {
      const { data } = await apiClient.post("/security/scan", { code: code.trim() });
      setResult(data);
    } catch (err) {
      setError(extractApiErrorMessage(err, "Could not verify this code."));
    } finally {
      setScanning(false);
      setCode("");
    }
  }

  return (
    <DashboardLayout>
      <h1 className="text-xl font-semibold text-slate-900 mb-4">Security Dashboard</h1>

      <form
        onSubmit={handleScan}
        className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-5 flex flex-col mb-6"
      >
        <label htmlFor="code" className="text-sm font-medium text-slate-700 mb-1">
          QR token or exit code
        </label>
        <textarea
          id="code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Paste the scanned QR token, or type the 6-character exit code"
          required
          rows={3}
          className="mb-4 px-3 py-2.5 rounded-lg border border-slate-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
        />

        <button
          type="submit"
          disabled={scanning}
          className="px-4 py-2.5 rounded-lg bg-blue-600 text-white font-semibold text-base hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors"
        >
          {scanning ? "Checking..." : "Verify & Exit"}
        </button>
      </form>

      {result && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
          <p className="text-sm font-semibold text-green-800 mb-2">Exit approved</p>
          <p className="text-sm text-slate-900">{result.student_full_name}</p>
          <p className="text-xs text-slate-500 mb-2">@{result.student_username}</p>
          <p className="text-sm text-slate-900 mb-2">{result.reason}</p>
          <p className="text-xs text-slate-500">
            Exit: {formatDateTime(result.requested_exit_time)}
          </p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <p className="text-sm font-semibold text-red-800 mb-1">Scan failed</p>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
    </DashboardLayout>
  );
}
