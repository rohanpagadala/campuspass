import { describe, expect, it } from "vitest";
import extractApiErrorMessage from "../extractApiErrorMessage";

describe("extractApiErrorMessage", () => {
  it("returns a plain string detail unchanged (HTTPException(detail=...) shape)", () => {
    const err = { response: { data: { detail: "Outpass has already been approved" } } };
    expect(extractApiErrorMessage(err, "fallback")).toBe(
      "Outpass has already been approved"
    );
  });

  it("extracts and joins messages from a Pydantic validation-error array (422 shape)", () => {
    const err = {
      response: {
        data: {
          detail: [
            {
              type: "value_error",
              loc: ["body"],
              msg: "Value error, expected_return_time must be strictly after requested_exit_time",
            },
          ],
        },
      },
    };
    expect(extractApiErrorMessage(err, "fallback")).toBe(
      "expected_return_time must be strictly after requested_exit_time"
    );
  });

  it("joins multiple validation errors with a space", () => {
    const err = {
      response: {
        data: {
          detail: [{ msg: "Value error, first problem" }, { msg: "second problem" }],
        },
      },
    };
    expect(extractApiErrorMessage(err, "fallback")).toBe("first problem second problem");
  });

  it("falls back to JSON.stringify when an error object has no msg field", () => {
    const err = { response: { data: { detail: [{ type: "weird" }] } } };
    expect(extractApiErrorMessage(err, "fallback")).toBe('{"type":"weird"}');
  });

  it("uses the fallback when there is no response (network error)", () => {
    expect(extractApiErrorMessage({}, "Could not reach the server.")).toBe(
      "Could not reach the server."
    );
  });

  it("uses the fallback for an empty detail array", () => {
    const err = { response: { data: { detail: [] } } };
    expect(extractApiErrorMessage(err, "fallback")).toBe("fallback");
  });

  it("uses the fallback when detail is missing entirely", () => {
    const err = { response: { data: {} } };
    expect(extractApiErrorMessage(err, "fallback")).toBe("fallback");
  });
});
