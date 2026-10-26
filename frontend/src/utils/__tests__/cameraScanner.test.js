import { describe, expect, it, vi } from "vitest";
import { cameraErrorMessage, createScanDebouncer } from "../cameraScanner";

describe("createScanDebouncer", () => {
  it("ignores the same read during the debounce window", () => {
    const accept = createScanDebouncer(4000);
    expect(accept("token", 1000)).toBe(true);
    expect(accept("token", 2000)).toBe(false);
    expect(accept("token", 5001)).toBe(true);
  });

  it("normalizes whitespace and accepts a different code", () => {
    const accept = createScanDebouncer();
    expect(accept("  first ")).toBe(true);
    expect(accept("second")).toBe(true);
  });
});

describe("cameraErrorMessage", () => {
  it("explains permission errors", () => {
    expect(cameraErrorMessage({ name: "NotAllowedError" })).toContain("permission");
  });

  it("explains missing cameras", () => {
    expect(cameraErrorMessage({ name: "NotFoundError" })).toContain("No camera");
  });

  it("handles cameras already in use", () => {
    expect(cameraErrorMessage({ name: "NotReadableError" })).toContain("already in use");
  });

  it("handles insecure contexts", () => {
    vi.stubGlobal("window", {
      isSecureContext: false,
      location: { hostname: "campuspass.example" },
    });
    expect(cameraErrorMessage(new Error("not available"))).toContain("HTTPS");
    vi.unstubAllGlobals();
  });
});
