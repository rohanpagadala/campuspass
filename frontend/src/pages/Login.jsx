import { useState } from "react";
import { Eye, EyeOff, KeyRound, ShieldCheck, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import extractApiErrorMessage from "../utils/extractApiErrorMessage";
import { Button, Field } from "../components/ui";

const ROLE_ROUTES = { student: "/student", teacher: "/teacher", security: "/security", hod: "/hod" };

function Logo() {
  return <div className="flex items-center gap-3"><img src="/cbit-logo.png" alt="CBIT" className="h-14 w-14 rounded-xl object-contain" onError={(event) => { event.currentTarget.style.display = "none"; event.currentTarget.nextElementSibling?.classList.remove("hidden"); }} /><span className="hidden h-14 w-14 items-center justify-center rounded-xl bg-white text-lg font-bold text-brand-900">CB</span><div><p className="text-xl font-bold tracking-tight">CampusPass</p><p className="text-sm text-indigo-200">CBIT student services</p></div></div>;
}

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(event) {
    event.preventDefault(); setError(""); setSubmitting(true);
    try { const me = await login(username, password); navigate(ROLE_ROUTES[me.role] || "/login", { replace: true }); }
    catch (err) { setError(extractApiErrorMessage(err, "Login failed. Check your username and password.")); }
    finally { setSubmitting(false); }
  }

  return <div className="grid min-h-screen lg:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.95fr)]">
    <section className="hidden flex-col justify-between bg-brand-900 p-10 text-white lg:flex xl:p-16"><div><Logo /><div className="mt-28 max-w-xl"><p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-indigo-200">A simpler way to manage campus exits</p><h1 className="text-5xl font-bold leading-tight tracking-tight">Move through campus with confidence.</h1><p className="mt-6 max-w-lg text-lg leading-8 text-indigo-100">One secure workspace for requests, approvals, and verified exits at Chaitanya Bharathi Institute of Technology.</p><div className="mt-10 space-y-4 text-indigo-100">{["Apply for outpasses in seconds", "Keep every approval in one place", "Verify exits with a secure QR code"].map((item) => <p key={item} className="flex items-center gap-3"><span className="rounded-full bg-indigo-400/20 p-1.5 text-indigo-200"><ShieldCheck size={16} /></span>{item}</p>)}</div></div></div><p className="text-sm text-indigo-300">Chaitanya Bharathi Institute of Technology</p></section>
    <main className="flex items-center justify-center bg-page px-4 py-8 sm:px-8"><div className="w-full max-w-md"><div className="mb-8 lg:hidden"><Logo /></div><div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9"><div className="mb-8"><div className="mb-4 hidden rounded-xl bg-brand-50 p-3 text-brand-900 sm:inline-flex"><Sparkles size={22} /></div><h2 className="text-2xl font-bold tracking-tight text-slate-950">Welcome back</h2><p className="mt-2 text-base text-slate-500">Sign in to your CampusPass workspace.</p></div><form onSubmit={handleSubmit} className="space-y-5"><Field label="Email or username" id="username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required placeholder="you@example.com" /><label htmlFor="password" className="block"><span className="mb-1.5 block text-sm font-semibold text-slate-700">Password</span><div className="relative"><input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 pr-12 text-base text-slate-900 focus:border-brand-800 focus:outline-none focus:ring-2 focus:ring-brand-100" placeholder="Enter your password" /><button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md p-2 text-slate-500 hover:bg-slate-100" aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={19} /> : <Eye size={19} />}</button></div></label>{error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</p>}<Button type="submit" loading={submitting} className="mt-2 w-full"><KeyRound size={17} />Sign in</Button></form></div><p className="mt-6 text-center text-sm text-slate-500">Secure access for the CBIT community</p></div></main>
  </div>;
}
