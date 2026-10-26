import { useEffect, useState } from "react";
import { Check, Copy, QrCode, X } from "lucide-react";
import apiClient from "../api/client";
import decodeJwtPayload from "../utils/decodeJwtPayload";
import formatDateTime from "../utils/formatDateTime";
import { Button } from "./ui";

export default function QrCodeModal({ outpass, onClose }) {
  const [imageUrl, setImageUrl] = useState(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    let objectUrl = null; let cancelled = false;
    apiClient.get(`/outpass/${outpass.id}/qr`, { responseType: "blob" }).then(({ data }) => { if (!cancelled) { objectUrl = URL.createObjectURL(data); setImageUrl(objectUrl); } }).catch(() => { if (!cancelled) setError("Could not load the QR code. Please try again."); });
    return () => { cancelled = true; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [outpass.id]);
  const claims = outpass.qr_token ? decodeJwtPayload(outpass.qr_token) : null;
  const expiresAt = claims?.exp ? new Date(claims.exp * 1000) : null;
  async function copyCode() { if (!outpass.short_code) return; await navigator.clipboard?.writeText(outpass.short_code); setCopied(true); setTimeout(() => setCopied(false), 1600); }
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" onClick={onClose}><div role="dialog" aria-modal="true" aria-labelledby="qr-title" className="relative max-h-[90vh] w-full max-w-md overflow-auto rounded-2xl bg-white p-6 text-center shadow-xl" onClick={(event) => event.stopPropagation()}><button onClick={onClose} className="absolute right-4 top-4 rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Close QR modal"><X size={20} /></button><div className="mx-auto mb-3 inline-flex rounded-full bg-brand-50 p-3 text-brand-800"><QrCode size={24} /></div><h2 id="qr-title" className="text-xl font-bold text-slate-950">Your exit QR code</h2><p className="mt-1 text-sm text-slate-500">{outpass.reason}</p>{error ? <p className="mt-6 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : imageUrl ? <div className="mx-auto my-6 flex min-h-[280px] w-full max-w-[320px] items-center justify-center rounded-xl border border-slate-200 bg-white p-3"><img src={imageUrl} alt="Outpass exit QR code" className="h-auto w-full max-w-[294px]" /></div> : <div className="my-6 flex min-h-[280px] items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-500">Loading QR code...</div>}{outpass.short_code && <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Short code</p><p className="mt-1 font-mono text-3xl font-bold tracking-[0.18em] text-brand-900">{outpass.short_code}</p><Button type="button" variant="secondary" onClick={copyCode} className="mt-3 w-full">{copied ? <><Check size={17} />Copied</> : <><Copy size={17} />Copy code</>}</Button></div>}{expiresAt && <p className="mt-4 text-sm text-slate-500">Valid until <strong className="text-slate-700">{formatDateTime(expiresAt)}</strong></p>}<Button type="button" variant="secondary" onClick={onClose} className="mt-5 w-full">Close</Button></div></div>;
}
