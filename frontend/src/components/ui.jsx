import { LoaderCircle, SearchX } from "lucide-react";

export function Card({ children, className = "", ...props }) {
  return (
    <section
      className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}
      {...props}
    >
      {children}
    </section>
  );
}

const STATUS_STYLES = {
  pending: "bg-amber-50 text-amber-800 ring-amber-200",
  teacher_approved: "bg-brand-50 text-brand-800 ring-brand-100",
  approved: "bg-green-50 text-green-700 ring-green-200",
  rejected: "bg-red-50 text-red-700 ring-red-200",
  expired: "bg-slate-100 text-slate-600 ring-slate-200",
};

const STATUS_LABELS = {
  pending: "Pending",
  teacher_approved: "Awaiting HOD",
  approved: "Approved",
  rejected: "Rejected",
  expired: "Expired",
};

export function Badge({ children, tone = "neutral" }) {
  const tones = {
    neutral: "bg-slate-100 text-slate-700 ring-slate-200",
    success: "bg-green-50 text-green-700 ring-green-200",
    danger: "bg-red-50 text-red-700 ring-red-200",
    warning: "bg-amber-50 text-amber-800 ring-amber-200",
    info: "bg-cyan-50 text-info ring-cyan-200",
    indigo: "bg-brand-50 text-brand-800 ring-brand-100",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${tones[tone] || tones.neutral}`}>
      {children}
    </span>
  );
}

export function StatusBadge({ status }) {
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${STATUS_STYLES[status] || "bg-slate-100 text-slate-600 ring-slate-200"}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}

const BUTTON_STYLES = {
  primary: "bg-brand-900 text-white hover:bg-brand-800 disabled:bg-brand-800/50",
  secondary: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:text-slate-400",
  danger: "bg-danger text-white hover:bg-red-700 disabled:bg-red-300",
  success: "bg-success text-white hover:bg-green-700 disabled:bg-green-300",
};

export function Button({ children, variant = "primary", loading = false, className = "", ...props }) {
  return (
    <button
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors duration-150 disabled:cursor-not-allowed ${BUTTON_STYLES[variant] || BUTTON_STYLES.primary} ${className}`}
      {...props}
      disabled={loading || props.disabled}
    >
      {loading && <LoaderCircle size={17} className="animate-spin" aria-hidden="true" />}
      {loading ? "Working..." : children}
    </button>
  );
}

export function PillTabs({ tabs, active, onChange, className = "" }) {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`} role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={active === tab.id}
          onClick={() => onChange(tab.id)}
          className={`min-h-10 rounded-full px-4 text-sm font-semibold transition-colors duration-150 ${active === tab.id ? "bg-brand-900 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-brand-100 hover:text-brand-900"}`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function Avatar({ name = "User", size = "md", className = "" }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "U";
  const sizes = { sm: "h-9 w-9 text-xs", md: "h-11 w-11 text-sm", lg: "h-14 w-14 text-lg" };
  return <div className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-800 to-indigo-400 font-bold text-white ${sizes[size] || sizes.md} ${className}`} aria-hidden="true">{initials}</div>;
}

export function StatCard({ label, value, icon: Icon, tone = "indigo", detail }) {
  const colors = {
    indigo: "bg-brand-50 text-brand-800",
    green: "bg-green-50 text-success",
    amber: "bg-amber-50 text-warning",
    teal: "bg-cyan-50 text-info",
  };
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-950">{value}</p>
          {detail && <p className="mt-1 text-sm text-slate-500">{detail}</p>}
        </div>
        {Icon && <div className={`rounded-lg p-2.5 ${colors[tone] || colors.indigo}`}><Icon size={20} /></div>}
      </div>
    </Card>
  );
}

export function EmptyState({ title, description, icon: Icon = SearchX }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <div className="mb-3 rounded-full bg-brand-50 p-3 text-brand-800"><Icon size={24} /></div>
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>}
    </div>
  );
}

export function LoadingSkeleton({ rows = 3 }) {
  return <div className="space-y-3" aria-label="Loading">
    {Array.from({ length: rows }, (_, index) => <div key={index} className="h-28 animate-pulse rounded-xl border border-slate-200 bg-white" />)}
  </div>;
}

export function Field({ label, id, hint, className = "", as, ...props }) {
  return (
    <label htmlFor={id} className={`block ${className}`}>
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</span>
      {as === "textarea" ? <textarea id={id} {...props} className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 placeholder:text-slate-400 focus:border-brand-800 focus:outline-none focus:ring-2 focus:ring-brand-100" /> : <input id={id} {...props} className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 placeholder:text-slate-400 focus:border-brand-800 focus:outline-none focus:ring-2 focus:ring-brand-100" />}
      {hint && <span className="mt-1 block text-sm text-red-600">{hint}</span>}
    </label>
  );
}

export function SelectField({ label, id, children, className = "", ...props }) {
  return <label htmlFor={id} className={`block ${className}`}><span className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</span><select id={id} {...props} className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 focus:border-brand-800 focus:outline-none focus:ring-2 focus:ring-brand-100">{children}</select></label>;
}
