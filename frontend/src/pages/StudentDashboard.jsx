import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, FilePlus2, QrCode, Send, TicketCheck } from "lucide-react";
import apiClient from "../api/client";
import DashboardLayout from "../components/DashboardLayout";
import QrCodeModal from "../components/QrCodeModal";
import formatDateTime from "../utils/formatDateTime";
import extractApiErrorMessage from "../utils/extractApiErrorMessage";
import { Avatar, Button, Card, EmptyState, Field, LoadingSkeleton, PillTabs, StatCard, StatusBadge } from "../components/ui";
import { useAuth } from "../context/AuthContext";

const EMPTY_FORM = { reason: "", requested_exit_time: "" };
const FILTERS = [{ id: "all", label: "All" }, { id: "pending", label: "Pending" }, { id: "approved", label: "Approved" }, { id: "rejected", label: "Rejected" }];

function getClientValidationError(form) {
  if (!form.requested_exit_time) return "";
  return new Date(form.requested_exit_time) < new Date() ? "Requested exit time cannot be in the past." : "";
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const [outpasses, setOutpasses] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [qrOutpass, setQrOutpass] = useState(null);
  const validationError = getClientValidationError(form);

  async function fetchOutpasses() {
    setLoading(true); setLoadError("");
    try { const { data } = await apiClient.get("/outpass/mine"); setOutpasses(data); }
    catch { setLoadError("Could not load your outpass requests."); }
    finally { setLoading(false); }
  }
  useEffect(() => { fetchOutpasses(); }, []);

  async function handleSubmit(event) {
    event.preventDefault(); if (validationError) return;
    setSubmitError(""); setSubmitting(true);
    try { await apiClient.post("/outpass", form); setForm(EMPTY_FORM); await fetchOutpasses(); }
    catch (err) { setSubmitError(extractApiErrorMessage(err, "Could not submit your request. Please try again.")); }
    finally { setSubmitting(false); }
  }

  const counts = useMemo(() => ({ pending: outpasses.filter((item) => item.status === "pending" || item.status === "teacher_approved").length, approved: outpasses.filter((item) => item.status === "approved").length, used: outpasses.filter((item) => item.status === "approved" && item.qr_token_used).length }), [outpasses]);
  const activePass = [...outpasses].filter((item) => item.status === "approved" && !item.qr_token_used).sort((a, b) => new Date(b.requested_exit_time) - new Date(a.requested_exit_time))[0];
  const visibleOutpasses = filter === "all" ? outpasses : outpasses.filter((item) => filter === "pending" ? item.status === "pending" || item.status === "teacher_approved" : item.status === filter);

  return <DashboardLayout><div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="mb-2 text-sm font-semibold text-brand-800">Student workspace</p><h1 className="text-3xl font-bold tracking-tight text-slate-950">Good to see you, {user?.full_name?.split(" ")[0] || "there"}.</h1><p className="mt-2 text-base text-slate-500">Manage your campus exit requests in one place.</p></div><div className="hidden rounded-full bg-white px-3 py-2 text-sm text-slate-600 shadow-sm ring-1 ring-slate-200 sm:flex sm:items-center sm:gap-2"><Avatar name={user?.full_name} size="sm" /> CampusPass student</div></div>
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]"><div className="min-w-0 space-y-6">
      <Card id="new-request" className="scroll-mt-24 p-5 sm:p-6"><div className="mb-6 flex items-start justify-between gap-4"><div><h2 className="text-xl font-bold text-slate-950">New request</h2><p className="mt-1 text-sm text-slate-500">Tell us when you need to leave campus.</p></div><div className="rounded-lg bg-brand-50 p-2.5 text-brand-800"><FilePlus2 size={21} /></div></div><form onSubmit={handleSubmit} className="grid gap-5 md:grid-cols-2"><Field className="md:col-span-2" as="textarea" label="Reason for exit" id="reason" name="reason" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} required rows={3} placeholder="e.g. Family appointment, medical visit..." /><Field label="Requested exit time" id="requested_exit_time" name="requested_exit_time" type="datetime-local" value={form.requested_exit_time} onChange={(e) => setForm({ ...form, requested_exit_time: e.target.value })} required hint={validationError} /><div className="flex items-end"><Button type="submit" loading={submitting} className="w-full sm:w-auto"><Send size={17} />Submit request</Button></div>{submitError && <p role="alert" className="md:col-span-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{submitError}</p>}</form></Card>
      <div id="requests" className="scroll-mt-24"><div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-bold text-slate-950">My requests</h2><p className="mt-1 text-sm text-slate-500">{outpasses.length} total request{outpasses.length === 1 ? "" : "s"}</p></div><PillTabs tabs={FILTERS} active={filter} onChange={setFilter} /></div>{loading ? <LoadingSkeleton /> : loadError ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{loadError}</p> : visibleOutpasses.length === 0 ? <EmptyState title={filter === "all" ? "No requests yet" : `No ${filter} requests`} description="Your submitted requests will appear here." icon={TicketCheck} /> : <div className="space-y-3">{visibleOutpasses.map((outpass) => <Card key={outpass.id} className="p-5"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div className="flex min-w-0 gap-3"><Avatar name={user?.full_name} size="sm" /><div className="min-w-0"><h3 className="truncate text-lg font-semibold text-slate-950">{outpass.reason}</h3><p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500"><Clock3 size={15} /> Exit {formatDateTime(outpass.requested_exit_time)}</p><p className="mt-2 text-sm text-slate-500">Request #{outpass.id} <span className="mx-1 text-slate-300">•</span> submitted {formatDateTime(outpass.created_at)}</p></div></div><StatusBadge status={outpass.status} /></div>{outpass.status === "approved" && <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4"><Button type="button" onClick={() => setQrOutpass(outpass)}><QrCode size={17} />View QR code</Button>{outpass.short_code && <span className="text-sm text-slate-500">Short code <strong className="ml-1 font-mono text-slate-800">{outpass.short_code}</strong></span>}</div>}</Card>)}</div>}</div>
    </div><aside className="space-y-4"><div className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:grid-cols-1"><StatCard label="Pending" value={counts.pending} icon={Clock3} tone="amber" /><StatCard label="Approved" value={counts.approved} icon={CheckCircle2} tone="green" /><StatCard label="Used passes" value={counts.used} icon={TicketCheck} tone="teal" /></div><Card className="p-5"><div className="mb-4 flex items-center gap-2"><div className="rounded-lg bg-brand-50 p-2 text-brand-800"><QrCode size={18} /></div><h2 className="font-bold text-slate-950">Active pass</h2></div>{activePass ? <><p className="text-lg font-semibold text-slate-900">{activePass.reason}</p><p className="mt-2 text-sm text-slate-500">Valid for exit at</p><p className="mt-0.5 text-sm font-semibold text-slate-800">{formatDateTime(activePass.requested_exit_time)}</p><button onClick={() => setQrOutpass(activePass)} className="mt-4 text-sm font-semibold text-brand-800 hover:text-brand-900">Open QR code →</button></> : <p className="text-sm leading-6 text-slate-500">Your latest approved, unused pass will appear here.</p>}</Card></aside></div>
    {qrOutpass && <QrCodeModal outpass={qrOutpass} onClose={() => setQrOutpass(null)} />}
  </DashboardLayout>;
}
