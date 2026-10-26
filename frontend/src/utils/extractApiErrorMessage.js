// Backend errors come in two shapes: a plain string `detail` (our own
// HTTPException(detail="...") calls) or a list of Pydantic validation error
// objects (FastAPI's automatic 422 response for a failed model_validator).
// This normalizes both into one readable string instead of letting the raw
// array hit JSX directly, which React cannot render.
export default function extractApiErrorMessage(err, fallback) {
  const detail = err.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    return detail
      .map((d) => (d.msg || JSON.stringify(d)).replace(/^Value error,\s*/, ""))
      .join(" ");
  }
  return fallback;
}
