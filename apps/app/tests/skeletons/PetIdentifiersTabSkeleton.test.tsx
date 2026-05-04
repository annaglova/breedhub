import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PetIdentifiersTabSkeleton } from "@/components/pet/tabs/PetIdentifiersTabSkeleton";

/**
 * Shape test for PetIdentifiersTabSkeleton — representative of the
 * "structurally-aware skeleton" pattern (W2.2 / P6). The point is not
 * to lock pixel-perfect markup but to assert the load-bearing
 * properties so a regression that changes the column count, removes
 * the header labels, or strips the aria-busy attribute fails loudly.
 *
 * Properties asserted:
 * 1. Outer wrapper has `aria-busy="true"` (so screen readers announce
 *    a busy region).
 * 2. Static header labels (`Identifier` / `Value`) render — they are
 *    real text in the real component and never bars.
 * 3. The placeholder body renders multiple rows so layout reservation
 *    matches the cap (drawer mode uses 5 rows, fullscreen uses 8).
 * 4. The grid-cols class differs between drawer and fullscreen so the
 *    column tracks line up with the real component in each mode.
 */

describe("PetIdentifiersTabSkeleton", () => {
  it("declares the aria-busy region and renders the static table headers", () => {
    const { container, getByText } = render(<PetIdentifiersTabSkeleton />);

    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(getByText("Identifier")).toBeInTheDocument();
    expect(getByText("Value")).toBeInTheDocument();
  });

  it("renders 5 placeholder rows in drawer mode (matches the eventual 5-row cap)", () => {
    const { container } = render(<PetIdentifiersTabSkeleton isFullscreen={false} />);

    const rows = container.querySelectorAll('[aria-busy="true"] .grid > .grid');
    // 5 placeholder rows + 1 header row = 6 inside the wrapper, but the
    // skeleton-rows specifically set their own bg-card-ground/bg-even-card-ground
    // alternation. Count via the placeholder-bar class signature.
    const bars = container.querySelectorAll(".animate-pulse");
    // 5 rows × 2 cells per row = 10 bars
    expect(bars.length).toBe(10);
  });

  it("renders 8 placeholder rows in fullscreen mode (wider viewport gets more rows)", () => {
    const { container } = render(<PetIdentifiersTabSkeleton isFullscreen={true} />);

    const bars = container.querySelectorAll(".animate-pulse");
    // 8 rows × 2 cells = 16 bars
    expect(bars.length).toBe(16);
  });

  it("uses different grid-cols tracks for drawer vs fullscreen so columns align with real PetIdentifiersTab", () => {
    const drawer = render(<PetIdentifiersTabSkeleton isFullscreen={false} />);
    const fullscreen = render(<PetIdentifiersTabSkeleton isFullscreen={true} />);

    // Real PetIdentifiersTab uses grid-cols-[120px_auto] sm:grid-cols-[184px_auto]
    // in drawer mode and grid-cols-[184px_auto] lg:grid-cols-[284px_auto] in fullscreen.
    // The skeleton mirrors these, so the className strings must contain the
    // mode-specific tracks for col-alignment to hold.
    const drawerHeaderCls = drawer.container.querySelector('.grid.gap-3.border-b')?.className ?? "";
    const fullscreenHeaderCls = fullscreen.container.querySelector('.grid.gap-3.border-b')?.className ?? "";

    expect(drawerHeaderCls).toContain("grid-cols-[120px_auto]");
    expect(fullscreenHeaderCls).toContain("grid-cols-[184px_auto]");
  });
});
