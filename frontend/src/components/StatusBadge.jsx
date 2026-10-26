const STYLES = {
  pending: "bg-amber-100 text-amber-800",
  teacher_approved: "bg-blue-100 text-blue-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  expired: "bg-slate-200 text-slate-600",
};

const LABELS = {
  pending: "Pending",
  teacher_approved: "Awaiting HOD",
  approved: "Approved",
  rejected: "Rejected",
  expired: "Expired",
};

export default function StatusBadge({ status }) {
  const style = STYLES[status] || "bg-slate-200 text-slate-600";
  const label = LABELS[status] || status;
  return (
    <span
      className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${style}`}
    >
      {label}
    </span>
  );
}
