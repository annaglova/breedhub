/**
 * Unit tests for useFormValidation — focused on the numeric branch
 * (measurementKind defaults, explicit min/max, custom messages).
 *
 * Run: pnpm test:app
 */

import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useFormValidation } from "@/hooks/useFormValidation";

describe("useFormValidation — numeric bounds", () => {
  it("required + empty → '<displayName> is required'", () => {
    const { result } = renderHook(() => useFormValidation());
    const err = result.current.validateField(
      { displayName: "Weight", required: true, measurementKind: "weight" },
      "",
    );
    expect(err).toBe("Weight is required");
  });

  it("optional + empty → null (no error)", () => {
    const { result } = renderHook(() => useFormValidation());
    const err = result.current.validateField(
      { displayName: "Weight", measurementKind: "weight" },
      "",
    );
    expect(err).toBeNull();
  });

  it("measurementKind=weight default bounds — value in range → null", () => {
    const { result } = renderHook(() => useFormValidation());
    const err = result.current.validateField(
      { displayName: "Weight", measurementKind: "weight" },
      25,
    );
    expect(err).toBeNull();
  });

  it("measurementKind=weight default bounds — below min (0.01 kg) → 'Minimum value is 0.01'", () => {
    const { result } = renderHook(() => useFormValidation());
    const err = result.current.validateField(
      { displayName: "Weight", measurementKind: "weight" },
      0,
    );
    expect(err).toBe("Minimum value is 0.01");
  });

  it("measurementKind=weight default bounds — above max (200 kg) → 'Maximum value is 200'", () => {
    const { result } = renderHook(() => useFormValidation());
    const err = result.current.validateField(
      { displayName: "Weight", measurementKind: "weight" },
      300,
    );
    expect(err).toBe("Maximum value is 200");
  });

  it("explicit validation.min/max overrides measurementKind defaults", () => {
    const { result } = renderHook(() => useFormValidation());
    const err = result.current.validateField(
      {
        displayName: "Birth weight",
        measurementKind: "weight",
        validation: { min: 0.05, max: 2 },
      },
      5, // exceeds explicit max=2 even though kind-default would allow up to 200
    );
    expect(err).toBe("Maximum value is 2");
  });

  it("validation.minMessage overrides default error text", () => {
    const { result } = renderHook(() => useFormValidation());
    const err = result.current.validateField(
      {
        displayName: "Weight",
        validation: { min: 1, minMessage: "Must be at least 1" },
      },
      0.5,
    );
    expect(err).toBe("Must be at least 1");
  });

  it("no measurementKind, no validation → no numeric error", () => {
    const { result } = renderHook(() => useFormValidation());
    const err = result.current.validateField(
      { displayName: "Free number" },
      99999,
    );
    expect(err).toBeNull();
  });

  it("string-typed numeric value still validates (form state may hold strings from input)", () => {
    const { result } = renderHook(() => useFormValidation());
    const err = result.current.validateField(
      { displayName: "Weight", measurementKind: "weight" },
      "300",
    );
    expect(err).toBe("Maximum value is 200");
  });
});
