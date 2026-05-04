import { act, render, renderHook } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  AboveFoldLoadingProvider,
  SKELETON_ANTI_FLASH_MS,
  useAboveFoldBlock,
  useAboveFoldBlockIf,
  useAboveFoldLoadingContext,
  useAllAboveFoldReady,
} from "@/contexts/AboveFoldLoadingContext";

/**
 * Tests for the AboveFold coordinator that gates page-level skeleton
 * visibility. Covers:
 * - useAboveFoldBlock register/unregister lifecycle
 * - allBlocksReady semantics (no blocks → ready; mixed → not-ready;
 *   all ready → ready)
 * - sticky-ready (`hasEverBeenReadyRef`) — once allBlocksReady was
 *   true, stays true even if blocks toggle back to not-ready (entity
 *   switch within a space)
 * - minLoadingTime gate (race protection on first render — also gives
 *   blocks one tick to register before sticky-ready can lock)
 * - useAboveFoldBlockIf only registers when enabled
 *
 * Note on `minLoadingTime`: most tests pass a non-zero value so the
 * coordinator doesn't flip to ready on the very first render (before
 * `useEffect`s fire to register blocks). Production providers default
 * to SKELETON_ANTI_FLASH_MS, so this matches reality.
 */

const HOLD = 100; // arbitrary minLoadingTime that keeps gate not-ready until blocks register

function makeWrapper(providerProps: { minLoadingTime?: number; skeletonDelay?: number } = {}) {
  const props = {
    minLoadingTime: providerProps.minLoadingTime ?? HOLD,
    skeletonDelay: providerProps.skeletonDelay ?? 0,
  };
  return ({ children }: { children: React.ReactNode }) => (
    <AboveFoldLoadingProvider {...props}>{children}</AboveFoldLoadingProvider>
  );
}

describe("AboveFoldLoadingContext — coordinator", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("reports ready=true when no blocks register and minLoadingTime has elapsed", () => {
    const wrapper = makeWrapper();
    const { result } = renderHook(() => useAllAboveFoldReady(), { wrapper });

    // Initially false: minLoadingTime hasn't elapsed.
    expect(result.current).toBe(false);

    act(() => {
      vi.advanceTimersByTime(HOLD + 1);
    });
    expect(result.current).toBe(true);
  });

  it("reports ready=false while some registered blocks are not ready", () => {
    const wrapper = makeWrapper();
    const { result } = renderHook(
      ({ aReady, bReady }: { aReady: boolean; bReady: boolean }) => {
        useAboveFoldBlock("a", aReady);
        useAboveFoldBlock("b", bReady);
        return useAllAboveFoldReady();
      },
      { wrapper, initialProps: { aReady: true, bReady: false } },
    );

    // Wait past minLoadingTime so the gate isn't gated by it; b is not ready.
    act(() => {
      vi.advanceTimersByTime(HOLD + 1);
    });
    expect(result.current).toBe(false);
  });

  it("flips to ready=true when the last block reports ready", () => {
    const wrapper = makeWrapper();
    const { result, rerender } = renderHook(
      ({ aReady, bReady }: { aReady: boolean; bReady: boolean }) => {
        useAboveFoldBlock("a", aReady);
        useAboveFoldBlock("b", bReady);
        return useAllAboveFoldReady();
      },
      { wrapper, initialProps: { aReady: false, bReady: false } },
    );

    act(() => {
      vi.advanceTimersByTime(HOLD + 1);
    });
    expect(result.current).toBe(false);

    rerender({ aReady: true, bReady: false });
    expect(result.current).toBe(false);

    rerender({ aReady: true, bReady: true });
    expect(result.current).toBe(true);
  });

  it("stays ready (sticky) once allBlocksReady was true even if a block flips back to not-ready", () => {
    // Entity-switch case: block reports ready on first cold-load, then on
    // switch the block briefly reports not-ready while it refetches; the
    // page-level overlay must stay hidden because the user already saw real
    // data once during this provider mount.
    const wrapper = makeWrapper();
    const { result, rerender } = renderHook(
      ({ aReady }: { aReady: boolean }) => {
        useAboveFoldBlock("a", aReady);
        return useAllAboveFoldReady();
      },
      { wrapper, initialProps: { aReady: false } },
    );

    act(() => {
      vi.advanceTimersByTime(HOLD + 1);
    });
    expect(result.current).toBe(false);

    // Block becomes ready → coordinator flips to ready.
    rerender({ aReady: true });
    expect(result.current).toBe(true);

    // Block flips back to not-ready (entity switch). Sticky ref keeps gate ready.
    rerender({ aReady: false });
    expect(result.current).toBe(true);
  });

  it("delays ready until minLoadingTime elapses, even if blocks register ready immediately", () => {
    const wrapper = makeWrapper({ minLoadingTime: 100 });
    const { result } = renderHook(() => {
      useAboveFoldBlock("a", true);
      return useAllAboveFoldReady();
    }, { wrapper });

    expect(result.current).toBe(false);

    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(result.current).toBe(false);

    act(() => {
      vi.advanceTimersByTime(60);
    });
    expect(result.current).toBe(true);
  });

  it("uses SKELETON_ANTI_FLASH_MS as the default minLoadingTime", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AboveFoldLoadingProvider>{children}</AboveFoldLoadingProvider>
    );
    const { result } = renderHook(() => {
      useAboveFoldBlock("a", true);
      return useAllAboveFoldReady();
    }, { wrapper });

    expect(result.current).toBe(false);

    act(() => {
      vi.advanceTimersByTime(SKELETON_ANTI_FLASH_MS - 1);
    });
    expect(result.current).toBe(false);

    act(() => {
      vi.advanceTimersByTime(2);
    });
    expect(result.current).toBe(true);
  });

  it("unregisters a block on unmount so it no longer affects the gate", () => {
    function Block({ id, ready }: { id: string; ready: boolean }) {
      useAboveFoldBlock(id, ready);
      return null;
    }

    function Probe() {
      const ready = useAllAboveFoldReady();
      const ctx = useAboveFoldLoadingContext();
      return (
        <span data-testid="probe">
          {ready ? "ready" : "not-ready"}|count={ctx?.registeredCount ?? 0}
        </span>
      );
    }

    function App({ showB }: { showB: boolean }) {
      return (
        <AboveFoldLoadingProvider minLoadingTime={HOLD}>
          <Block id="a" ready />
          {showB && <Block id="b" ready={false} />}
          <Probe />
        </AboveFoldLoadingProvider>
      );
    }

    const { rerender, getByTestId } = render(<App showB />);

    act(() => {
      vi.advanceTimersByTime(HOLD + 1);
    });
    expect(getByTestId("probe").textContent).toBe("not-ready|count=2");

    // Unmount b → only a (ready) remains → coordinator ready.
    rerender(<App showB={false} />);
    expect(getByTestId("probe").textContent).toBe("ready|count=1");
  });
});

describe("useAboveFoldBlockIf", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not register the block when enabled is false (gate ready immediately after minLoadingTime)", () => {
    const wrapper = makeWrapper();
    const { result } = renderHook(() => {
      useAboveFoldBlockIf("disabled-block", false, false);
      return useAllAboveFoldReady();
    }, { wrapper });

    act(() => {
      vi.advanceTimersByTime(HOLD + 1);
    });
    // No block registered → registeredCount=0 → allBlocksReady=true.
    expect(result.current).toBe(true);
  });

  it("registers the block when enabled is true and gates the coordinator", () => {
    const wrapper = makeWrapper();
    const { result, rerender } = renderHook(
      ({ ready }: { ready: boolean }) => {
        useAboveFoldBlockIf("conditional", ready, true);
        return useAllAboveFoldReady();
      },
      { wrapper, initialProps: { ready: false } },
    );

    act(() => {
      vi.advanceTimersByTime(HOLD + 1);
    });
    // Block registered as not-ready → coordinator not-ready.
    expect(result.current).toBe(false);

    rerender({ ready: true });
    expect(result.current).toBe(true);
  });
});
