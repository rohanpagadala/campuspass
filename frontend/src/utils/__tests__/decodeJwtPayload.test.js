import { describe, expect, it } from "vitest";
import decodeJwtPayload from "../decodeJwtPayload";

// Hand-built JWT fixtures: header.payload.signature, base64url-encoded.
// Signature is irrelevant here - this function never verifies it.
function buildToken(payload) {
  const base64url = (obj) =>
    Buffer.from(JSON.stringify(obj))
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

  const header = { alg: "HS256", typ: "JWT" };
  return `${base64url(header)}.${base64url(payload)}.fakesignature`;
}

describe("decodeJwtPayload", () => {
  it("decodes a well-formed token's payload", () => {
    const token = buildToken({ outpass_id: 42, type: "qr", exp: 1234567890 });
    expect(decodeJwtPayload(token)).toEqual({
      outpass_id: 42,
      type: "qr",
      exp: 1234567890,
    });
  });

  it("decodes payloads containing unicode characters", () => {
    const token = buildToken({ note: "café ☕️" });
    expect(decodeJwtPayload(token)).toEqual({ note: "café ☕️" });
  });

  it("returns null for a garbage string", () => {
    expect(decodeJwtPayload("not-a-jwt-at-all")).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(decodeJwtPayload("")).toBeNull();
  });

  it("returns null when the payload segment isn't valid base64 JSON", () => {
    expect(decodeJwtPayload("header.%%%notbase64%%%.sig")).toBeNull();
  });

  it("never throws, even on malformed input", () => {
    expect(() => decodeJwtPayload(null)).not.toThrow();
    expect(() => decodeJwtPayload(undefined)).not.toThrow();
  });
});
