export function cameraErrorMessage(error) {
  const name = error?.name || "";
  const message = String(error?.message || error || "").toLowerCase();

  const browserWindow = typeof window === "undefined" ? null : window;
  if (browserWindow && !browserWindow.isSecureContext && browserWindow.location.hostname !== "localhost" && browserWindow.location.hostname !== "127.0.0.1") {
    return "Camera access requires HTTPS or localhost. Use the manual code entry below on this connection.";
  }
  if (name === "NotAllowedError" || message.includes("permission")) {
    return "Camera permission was denied. Allow camera access for this site in your browser settings, then try again.";
  }
  if (name === "NotFoundError" || message.includes("no camera") || message.includes("camera not found")) {
    return "No camera was found. Connect a camera or use manual code entry.";
  }
  if (name === "NotReadableError" || name === "AbortError" || message.includes("in use") || message.includes("already")) {
    return "The camera is already in use by another app. Close it there and try again, or enter the code manually.";
  }
  return "Could not start the camera. Check browser permissions or use manual code entry.";
}

export function createScanDebouncer(windowMs = 4000) {
  let lastValue = "";
  let lastReadAt = 0;
  return (value, now = Date.now()) => {
    const normalized = value.trim();
    if (!normalized || (normalized === lastValue && now - lastReadAt < windowMs)) {
      return false;
    }
    lastValue = normalized;
    lastReadAt = now;
    return true;
  };
}
