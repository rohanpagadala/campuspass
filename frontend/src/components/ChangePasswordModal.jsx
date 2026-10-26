import { useState } from "react";
import apiClient from "../api/client";
import extractApiErrorMessage from "../utils/extractApiErrorMessage";

export default function ChangePasswordModal({ onClose }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const mismatch =
    confirmPassword.length > 0 && newPassword !== confirmPassword;
  const tooShort = newPassword.length > 0 && newPassword.length < 8;

  async function handleSubmit(e) {
    e.preventDefault();
    if (mismatch || tooShort) return;

    setError("");
    setSubmitting(true);
    try {
      await apiClient.post("/auth/change-password", {
        current_password: currentPassword,
        new_password: newPassword,
      });
      setSuccess(true);
    } catch (err) {
      setError(extractApiErrorMessage(err, "Could not change your password."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-20"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-lg border border-slate-200 p-5 w-full max-w-xs"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold text-slate-900 mb-4">
          Change password
        </h2>

        {success ? (
          <>
            <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-4">
              Password changed. Use it next time you log in.
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors w-full"
            >
              Done
            </button>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col">
            <label
              htmlFor="current_password"
              className="text-sm font-medium text-slate-700 mb-1"
            >
              Current password
            </label>
            <input
              id="current_password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              required
              className="mb-3 px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />

            <label
              htmlFor="new_password"
              className="text-sm font-medium text-slate-700 mb-1"
            >
              New password (min 8 characters)
            </label>
            <input
              id="new_password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
              className="mb-3 px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />

            <label
              htmlFor="confirm_password"
              className="text-sm font-medium text-slate-700 mb-1"
            >
              Confirm new password
            </label>
            <input
              id="confirm_password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
              className="mb-1 px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />

            {tooShort && (
              <p className="text-xs text-red-600 mb-2">
                New password must be at least 8 characters.
              </p>
            )}
            {mismatch && (
              <p className="text-xs text-red-600 mb-2">Passwords don't match.</p>
            )}
            {error && <p className="text-sm text-red-600 mt-2 mb-2">{error}</p>}

            <div className="flex gap-2 mt-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm font-medium hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || mismatch || tooShort}
                className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
