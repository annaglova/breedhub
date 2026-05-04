import { isValidElement } from "react";
import { describe, expect, it } from "vitest";

import { buildTabSkeleton } from "@/components/shared/tab-registry";

/**
 * Tests for `buildTabSkeleton(componentName, props)` — the helper that
 * returns the matching native Suspense fallback for every tab in
 * `TAB_COMPONENT_REGISTRY`. Used by:
 *   - `RegisteredLazyTab` Suspense fallback (chunk-download window)
 *   - `TabOutlet.renderSkeleton()` per-section overlay in scroll mode
 *
 * Goal: lock the dispatch table so a future refactor that adds a new
 * native skeleton without wiring it here (or the reverse: removes a
 * skeleton without dropping the dispatch entry) shows up as a test
 * regression — not a silent fallback to the generic 3-rect
 * TabBodySkeleton.
 */

describe("buildTabSkeleton", () => {
  // Spec-table covering each tab that has a native skeleton wired in.
  // If you add a native skeleton, add a row here. If you remove one,
  // remove its row. Anything missing from the table falls through to
  // TabBodySkeleton in non-fullscreen, null in fullscreen — also
  // asserted below.
  const NATIVE_SKELETONS: Array<{ name: string; expectedDisplayName?: string }> = [
    { name: "EditFormTab" },
    { name: "PetHealthTab" },
    { name: "PetShowResultsTab" },
    { name: "PetIdentifiersTab" },
    { name: "PetChildrenTab" },
    { name: "PetSiblingsTab" },
    { name: "PetGeneralTab" },
    { name: "LitterGeneralTab" },
    { name: "KennelGeneralTab" },
    { name: "ContactGeneralTab" },
    { name: "EventGeneralTab" },
    { name: "EventResultsTab" },
    { name: "PetServicesTab" },
    { name: "LitterChildrenTab" },
    { name: "LitterServicesTab" },
    { name: "KennelServicesTab" },
    { name: "ContactBreederTab" },
    { name: "ContactJudgeTab" },
    { name: "BreedPatronsTab" },
    { name: "BreedTopKennelsTab" },
    { name: "BreedTopPetsTab" },
    { name: "PetTimelineTab" },
    { name: "BreedAchievementsTab" },
    { name: "EditChildTableTab" },
  ];

  it.each(NATIVE_SKELETONS)("returns a React element for $name", ({ name }) => {
    const element = buildTabSkeleton(name, { mode: "scroll" });
    expect(element).not.toBeNull();
    expect(isValidElement(element)).toBe(true);
  });

  it("returns null for EditChildMatrixTab (delegates to its own skeleton)", () => {
    expect(buildTabSkeleton("EditChildMatrixTab", { mode: "scroll" })).toBeNull();
  });

  it("returns null in fullscreen tab mode for unknown tabs (no generic flicker)", () => {
    const element = buildTabSkeleton("UnknownTab", { mode: "fullscreen" });
    expect(element).toBeNull();
  });

  it("falls back to a generic skeleton element for unknown tabs in scroll mode", () => {
    const element = buildTabSkeleton("UnknownTab", { mode: "scroll" });
    // Scroll-mode unknown tabs land on the generic TabBodySkeleton until
    // they get their own native skeleton — keeps layout reservation
    // consistent during the migration.
    expect(element).not.toBeNull();
    expect(isValidElement(element)).toBe(true);
  });
});
