import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import extractApiErrorMessage from "../utils/extractApiErrorMessage";

const ROLE_ROUTES = {
  student: "/student",
  teacher: "/teacher",
  security: "/security",
  hod: "/hod",
};

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const me = await login(username, password);
      const destination = ROLE_ROUTES[me.role] || "/login";
      navigate(destination, { replace: true });
    } catch (err) {
      setError(
        extractApiErrorMessage(err, "Login failed. Check your username and password.")
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col"
      >
        <h1 className="text-2xl font-semibold text-slate-900 text-center">
          CampusPass
        </h1>
        <p className="text-sm text-slate-500 text-center mt-1 mb-6">
          Sign in to continue
        </p>

        <label htmlFor="username" className="text-sm font-medium text-slate-700 mb-1">
          Username
        </label>
        <input
          id="username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          required
          className="mb-4 px-3 py-2.5 rounded-lg border border-slate-300 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />

        <label htmlFor="password" className="text-sm font-medium text-slate-700 mb-1">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
          className="mb-5 px-3 py-2.5 rounded-lg border border-slate-300 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />

        {error && (
          <p className="text-sm text-red-600 -mt-2 mb-4">{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2.5 rounded-lg bg-blue-600 text-white font-semibold text-base hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}
