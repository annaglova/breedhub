import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useSkeletonWithDelay } from "@/contexts/AboveFoldLoadingContext";

describe("useSkeletonWithDelay", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows skeleton immediately when isLoading flips true", () => {
    const { result, rerender } = renderHook(
      ({ loading }: { loading: boolean }) => useSkeletonWithDelay(loading),
      { initialProps: { loading: false } },
    );

    expect(result.current).toBe(false);

    rerender({ loading: true });
    expect(result.current).toBe(true);
  });

  it("keeps skeleton visible for the default 100ms anti-flash window after isLoading flips false", () => {
    const { result, rerender } = renderHook(
      ({ loading }: { loading: boolean }) => useSkeletonWithDelay(loading),
      { initialProps: { loading: true } },
    );

    expect(result.current).toBe(true);

    act(() => {
      vi.advanceTimersByTime(20);
    });
    rerender({ loading: false });
    expect(result.current).toBe(true);

    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(result.current).toBe(true);

    act(() => {
      vi.advanceTimersByTime(40);
    });
    expect(result.current).toBe(false);
  });

  it("hides skeleton immediately if data arrives after the min display window already elapsed", () => {
    const { result, rerender } = renderHook(
      ({ loading }: { loading: boolean }) => useSkeletonWithDelay(loading),
      { initialProps: { loading: true } },
    );

    act(() => {
      vi.advanceTimersByTime(150);
    });

    rerender({ loading: false });
    expect(result.current).toBe(false);
  });

  it("respects an explicit minDisplayMs override", () => {
    const { result, rerender } = renderHook(
      ({ loading }: { loading: boolean }) =>
        useSkeletonWithDelay(loading, 500),
      { initialProps: { loading: true } },
    );

    expect(result.current).toBe(true);

    rerender({ loading: false });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current).toBe(true);

    act(() => {
      vi.advanceTimersByTime(310);
    });
    expect(result.current).toBe(false);
  });
});
