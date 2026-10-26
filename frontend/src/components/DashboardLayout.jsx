import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { KeyRound, LayoutDashboard, LogOut, Menu, QrCode, ScanLine, ShieldCheck, Users, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import ChangePasswordModal from "./ChangePasswordModal";
import { Avatar } from "./ui";

const NAV_BY_ROLE = {
  student: [{ label: "My Requests", icon: LayoutDashboard, href: "/student#requests" }, { label: "New Request", icon: KeyRound, href: "/student#new-request" }],
  teacher: [{ label: "Pending Approvals", icon: ShieldCheck, href: "/teacher#pending" }],
  security: [{ label: "Gate Scanner", icon: ScanLine, href: "/security#scanner" }],
  hod: [{ label: "Outpasses", icon: QrCode, href: "/hod#outpasses" }, { label: "Users", icon: Users, href: "/hod#users" }, { label: "Exit Logs", icon: LayoutDashboard, href: "/hod#exit-logs" }],
};

const ROLE_LABELS = { student: "Student", teacher: "Teacher", security: "Security", hod: "Administrator" };

function Brand({ compact = false }) {
  return <Link to="/" className="flex min-w-0 items-center gap-3" aria-label="CampusPass home">
    <img src="/cbit-logo.png" alt="CBIT" className="h-10 w-10 rounded-lg object-contain" onError={(event) => { event.currentTarget.style.display = "none"; event.currentTarget.nextElementSibling?.classList.remove("hidden"); }} />
    <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-sm font-bold text-brand-900">CB</span>
    <span className={`min-w-0 ${compact ? "max-w-[155px]" : ""}`} title="Chaitanya Bharathi Institute of Technology">
      <span className="block text-base font-bold tracking-tight text-white">CampusPass</span>
      <span className="block truncate text-xs text-indigo-200">Chaitanya Bharathi Institute of Technology</span>
    </span>
  </Link>;
}

export default function DashboardLayout({ children }) {
  const { logout, role, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const navItems = NAV_BY_ROLE[role] || [];
  const pageName = role === "hod" ? "Admin workspace" : `${ROLE_LABELS[role] || "Workspace"} workspace`;

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return <div className="app-shell flex bg-page">
    <aside className={`fixed inset-y-0 left-0 z-40 flex w-[268px] flex-col bg-brand-900 px-5 py-5 text-white shadow-xl transition-transform duration-150 lg:translate-x-0 ${drawerOpen ? "translate-x-0" : "-translate-x-full"}`}>
      <div className="flex items-center justify-between"><Brand compact /><button className="rounded-lg p-2 text-indigo-200 hover:bg-brand-800 lg:hidden" onClick={() => setDrawerOpen(false)} aria-label="Close navigation"><X size={21} /></button></div>
      <div className="mt-8 flex items-center gap-3 border-b border-indigo-300/20 pb-6">
        <Avatar name={user?.full_name} size="md" />
        <div className="min-w-0"><p className="truncate font-semibold">{user?.full_name || "CampusPass user"}</p><p className="mt-0.5 text-sm text-indigo-200">{ROLE_LABELS[role] || role}</p></div>
      </div>
      <nav className="mt-7 flex-1 space-y-1" aria-label="Main navigation">
        <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-[0.16em] text-indigo-300">Workspace</p>
        {navItems.map(({ label, icon: Icon, href }) => {
          const active = location.pathname === href.split("#")[0] && (!location.hash || location.hash === `#${href.split("#")[1]}`);
          return <a key={href} href={href} onClick={() => setDrawerOpen(false)} className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm transition-colors ${active ? "bg-brand-100 font-semibold text-brand-900" : "text-indigo-100 hover:bg-brand-800"}`}><Icon size={19} /><span>{label}</span></a>;
        })}
      </nav>
      <div className="space-y-1 border-t border-indigo-300/20 pt-4">
        <button onClick={() => setShowChangePassword(true)} className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm text-indigo-100 hover:bg-brand-800"><KeyRound size={19} />Change password</button>
        <button onClick={handleLogout} className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm text-indigo-100 hover:bg-brand-800"><LogOut size={19} />Log out</button>
      </div>
    </aside>
    {drawerOpen && <button className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden" onClick={() => setDrawerOpen(false)} aria-label="Close navigation overlay" />}
    <div className="min-w-0 flex-1 lg:pl-[268px]">
      <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3"><button className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden" onClick={() => setDrawerOpen(true)} aria-label="Open navigation"><Menu size={23} /></button><div className="min-w-0"><p className="truncate text-sm text-slate-500">Student Workspace <span className="mx-1 text-slate-300">›</span> <span className="font-semibold text-slate-800">{pageName}</span></p></div></div>
        <div className="hidden items-center gap-3 sm:flex"><Avatar name={user?.full_name} size="sm" /><span className="hidden text-sm font-semibold text-slate-700 md:block">{user?.full_name}</span></div>
      </header>
      <main className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">{children}</main>
    </div>
    {showChangePassword && <ChangePasswordModal onClose={() => setShowChangePassword(false)} />}
  </div>;
}
