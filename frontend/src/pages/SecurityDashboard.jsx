import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, CameraOff, CheckCircle2, FlipHorizontal, ScanLine, ShieldAlert, UserRound, Zap } from "lucide-react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import apiClient from "../api/client";
import DashboardLayout from "../components/DashboardLayout";
import formatDateTime from "../utils/formatDateTime";
import extractApiErrorMessage from "../utils/extractApiErrorMessage";
import { cameraErrorMessage, createScanDebouncer } from "../utils/cameraScanner";
import { Avatar, Button, Card, PillTabs } from "../components/ui";

const MODES = [
  { id: "camera", label: "Scan with camera" },
  { id: "manual", label: "Enter code manually" },
];

export default function SecurityDashboard() {
  const [mode, setMode] = useState("camera");
  const [code, setCode] = useState("");
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [cameras, setCameras] = useState([]);
  const [cameraIndex, setCameraIndex] = useState(0);
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const scannerRef = useRef(null);
  const trackRef = useRef(null);
  const acceptingReadsRef = useRef(createScanDebouncer());
  const submittingRef = useRef(false);

  const stopCamera = useCallback(async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    setScanning(false);
    setTorchOn(false);
    setTorchSupported(false);
    if (scanner) {
      try {
        await scanner.stop();
      } catch {
        // The stream may already be stopped by the browser.
      }
      try {
        scanner.clear();
      } catch {
        // html5-qrcode can already have removed its container after a failed start.
      }
    }
    trackRef.current?.stop();
    trackRef.current = null;
  }, []);

  const submitCode = useCallback(async (value) => {
    const trimmed = value.trim();
    if (!trimmed || submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setScanning(false);
    setResult(null);
    setError("");
    try {
      await stopCamera();
      const { data } = await apiClient.post("/security/scan", { code: trimmed });
      setResult(data);
    } catch (requestError) {
      setError(extractApiErrorMessage(requestError, "Could not verify this code."));
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
      setCode("");
    }
  }, [stopCamera]);

  const startCamera = useCallback(async () => {
    if (scannerRef.current) return;
    setCameraError("");
    setError("");
    setResult(null);
    try {
      const devices = await Html5Qrcode.getCameras();
      if (!devices.length) throw Object.assign(new Error("No camera found"), { name: "NotFoundError" });
      setCameras(devices);
      const camera = cameraIndex === 0 ? { facingMode: { exact: "environment" } } : (devices[cameraIndex] || devices[0]);
      const scanner = new Html5Qrcode("gate-camera-reader", {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      });
      scannerRef.current = scanner;
      await scanner.start(
        camera,
        { fps: 10, qrbox: (viewfinderWidth, viewfinderHeight) => ({ width: Math.min(320, viewfinderWidth * 0.8), height: Math.min(320, viewfinderHeight * 0.8) }), aspectRatio: 1 },
        (decodedText) => {
          if (!acceptingReadsRef.current(decodedText)) return;
          if (navigator.vibrate) navigator.vibrate(100);
          void submitCode(decodedText);
        },
        () => {},
      );
      const track = document.querySelector("#gate-camera-reader video")?.srcObject?.getVideoTracks?.()[0];
      trackRef.current = track || null;
      const capabilities = track?.getCapabilities?.();
      setTorchSupported(Boolean(capabilities?.torch));
      setScanning(true);
    } catch (cameraStartError) {
      await stopCamera();
      setCameraError(cameraErrorMessage(cameraStartError));
    }
  }, [cameraIndex, stopCamera, submitCode]);

  useEffect(() => () => { void stopCamera(); }, [stopCamera]);
  useEffect(() => { if (mode !== "camera") void stopCamera(); }, [mode, stopCamera]);

  async function toggleTorch() {
    const track = trackRef.current;
    if (!track?.applyConstraints) return;
    const next = !torchOn;
    try {
      await track.applyConstraints({ advanced: [{ torch: next }] });
      setTorchOn(next);
    } catch {
      setTorchSupported(false);
    }
  }

  function scanNext() {
    setResult(null);
    setError("");
    setCameraError("");
    if (mode === "camera") void startCamera();
  }

  async function handleManualSubmit(event) {
    event.preventDefault();
    await submitCode(code);
  }

  return <DashboardLayout>
    <div className="mb-8"><p className="mb-2 text-sm font-semibold text-brand-800">Security workspace</p><h1 className="text-3xl font-bold tracking-tight text-slate-950">Gate scanner</h1><p className="mt-2 text-base text-slate-500">Verify a QR token or short code before allowing an exit.</p></div>
    <div id="scanner" className="mx-auto max-w-3xl scroll-mt-24">
      <Card className="p-5 sm:p-8">
        <div className="mb-6 flex items-center gap-4"><div className="rounded-xl bg-brand-50 p-3 text-brand-800"><ScanLine size={28} /></div><div><h2 className="text-xl font-bold text-slate-950">Verify an exit pass</h2><p className="mt-1 text-sm text-slate-500">Use the camera for QR codes or enter a code manually.</p></div></div>
        <PillTabs tabs={MODES} active={mode} onChange={(nextMode) => { setMode(nextMode); setCameraError(""); setError(""); }} className="mb-6" />
        {mode === "camera" ? <div>
          <div className="relative mx-auto aspect-square w-full max-w-[420px] overflow-hidden rounded-2xl bg-slate-950">
            <div id="gate-camera-reader" className="h-full w-full [&_video]:h-full [&_video]:w-full [&_video]:object-cover" />
            <div className="pointer-events-none absolute inset-8 border-2 border-white/80 [clip-path:polygon(0_0,28%_0,28%_5px,5px_5px,5px_28%,0_28%,0_0,100%_0,100%_28%,calc(100%-5px)_28%,calc(100%-5px)_5px,72%_5px,72%_0,100%_0,100%_100%,72%_100%,72%_calc(100%-5px),calc(100%-5px)_calc(100%-5px),calc(100%-5px)_72%,100%_72%,100%_100%,0_100%,0_72%,5px_72%,5px_calc(100%-5px),28%_calc(100%-5px),28%_100%,0_100%)]" />
            {!scanning && <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/70 px-6 text-center text-white"><Camera size={42} className="mb-4 text-indigo-200" /><p className="text-lg font-semibold">Camera ready when you are</p><p className="mt-2 text-sm text-indigo-100">Point the rear camera at the student's QR code.</p><Button type="button" onClick={() => void startCamera()} className="mt-5 min-w-44"><Camera size={19} />Start camera</Button></div>}
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-3"><Button type="button" variant="secondary" onClick={() => void stopCamera()} disabled={!scanning}><CameraOff size={17} />Stop</Button>{cameras.length > 1 && <Button type="button" variant="secondary" onClick={() => { void stopCamera(); setCameraIndex((index) => (index + 1) % cameras.length); setTimeout(() => void startCamera(), 0); }} disabled={!scanning}><FlipHorizontal size={17} />Switch camera</Button>}{torchSupported && <Button type="button" variant="secondary" onClick={() => void toggleTorch()}><Zap size={17} />{torchOn ? "Turn torch off" : "Turn torch on"}</Button>}</div>
          {cameraError && <p role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700">{cameraError}</p>}
        </div> : <form onSubmit={handleManualSubmit} className="space-y-5"><label htmlFor="code" className="block"><span className="mb-1.5 block text-sm font-semibold text-slate-700">QR token or short code</span><textarea id="code" value={code} onChange={(event) => setCode(event.target.value)} placeholder="Enter token or code" required rows={4} className="w-full rounded-xl border border-slate-300 px-4 py-4 font-mono text-lg text-slate-900 placeholder:font-sans placeholder:text-slate-400 focus:border-brand-800 focus:outline-none focus:ring-4 focus:ring-brand-100" /></label><Button type="submit" loading={submitting} className="w-full text-base sm:w-auto"><ScanLine size={19} />Verify & exit</Button></form>}
      </Card>
      {result && <ResultCard result={result} onScanNext={scanNext} />}
      {error && <ErrorCard error={error} onScanNext={scanNext} />}
    </div>
  </DashboardLayout>;
}

function ResultCard({ result, onScanNext }) {
  return <Card className="mt-6 border-green-200 bg-green-50 p-6"><div className="flex items-start gap-4"><div className="rounded-full bg-green-100 p-3 text-success"><CheckCircle2 size={28} /></div><div><p className="text-xl font-bold text-green-800">Exit approved</p><p className="mt-1 text-sm text-green-700">This pass is valid and has been marked as used.</p></div></div><div className="mt-6 grid gap-4 border-t border-green-200 pt-5 sm:grid-cols-2"><div className="flex items-center gap-3"><Avatar name={result.student_full_name} size="sm" /><div><p className="font-semibold text-slate-900">{result.student_full_name}</p><p className="text-sm text-slate-600">@{result.student_username}</p></div></div><div className="flex items-start gap-2 text-sm text-slate-700"><UserRound size={17} className="mt-0.5 shrink-0" /><span><strong>Reason:</strong> {result.reason}<br /><strong>Exit:</strong> {formatDateTime(result.requested_exit_time)}</span></div></div><Button type="button" onClick={onScanNext} className="mt-6 w-full sm:w-auto"><ScanLine size={18} />Scan next</Button></Card>;
}

function ErrorCard({ error, onScanNext }) {
  return <Card className="mt-6 border-red-200 bg-red-50 p-6"><div className="flex items-start gap-4"><div className="rounded-full bg-red-100 p-3 text-danger"><ShieldAlert size={28} /></div><div><p className="text-xl font-bold text-red-800">Scan failed</p><p className="mt-1 text-base text-red-700">{error}</p></div></div><Button type="button" variant="secondary" onClick={onScanNext} className="mt-6 w-full sm:w-auto"><ScanLine size={18} />Try again</Button></Card>;
}
