import { useEffect, useState } from "react";
import apiClient from "../api/client";
import decodeJwtPayload from "../utils/decodeJwtPayload";
import formatDateTime from "../utils/formatDateTime";

export default function QrCodeModal({ outpass, onClose }) {
  const [imageUrl, setImageUrl] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let objectUrl = null;
    let cancelled = false;

    apiClient
      .get(`/outpass/${outpass.id}/qr`, { responseType: "blob" })
      .then(({ data }) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(data);
        setImageUrl(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load the QR code. Please try again.");
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [outpass.id]);

  const claims = outpass.qr_token ? decodeJwtPayload(outpass.qr_token) : null;
  const expiresAt = claims?.exp ? new Date(claims.exp * 1000) : null;

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-20"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-lg border border-slate-200 p-5 w-full max-w-xs flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold text-slate-900 mb-4">Exit QR Code</h2>

        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

        {!error && !imageUrl && (
          <p className="text-sm text-slate-500 mb-4">Loading QR code...</p>
        )}

        {imageUrl && (
          <img
            src={imageUrl}
            alt="Outpass exit QR code"
            className="w-56 h-56 mb-4 rounded-lg border border-slate-200"
          />
        )}

        {expiresAt && (
          <p className="text-xs text-slate-500 mb-1 text-center">
            Valid until {formatDateTime(expiresAt)}
          </p>
        )}

        {outpass.short_code && (
          <p className="text-xs text-slate-500 mb-4 text-center">
            Or give security this code:{" "}
            <span className="font-mono font-semibold text-slate-700">
              {outpass.short_code}
            </span>
          </p>
        )}

        <button
          onClick={onClose}
          className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm font-medium hover:bg-slate-200 transition-colors w-full"
        >
          Close
        </button>
      </div>
    </div>
  );
}
