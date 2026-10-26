import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ChangePasswordModal from "./ChangePasswordModal";

export default function DashboardLayout({ children }) {
  const { logout, role, user } = useAuth();
  const navigate = useNavigate();
  const [showChangePassword, setShowChangePassword] = useState(false);

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <div className="flex flex-col leading-tight">
          <span className="font-semibold text-slate-900">
            {user?.full_name || "CampusPass"}
          </span>
          <span className="text-xs uppercase tracking-wide text-slate-500">
            {role}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowChangePassword(true)}
            className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
          >
            Change password
          </button>
          <button
            onClick={handleLogout}
            className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
          >
            Log out
          </button>
        </div>
      </header>
      <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 max-w-2xl w-full mx-auto">
        {children}
      </main>

      {showChangePassword && (
        <ChangePasswordModal onClose={() => setShowChangePassword(false)} />
      )}
    </div>
  );
}
