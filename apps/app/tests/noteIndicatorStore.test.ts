import { beforeEach, describe, expect, it } from "vitest";
import { noteIndicatorStore } from "../src/stores/note-indicator.store";

describe("noteIndicatorStore", () => {
  beforeEach(() => {
    noteIndicatorStore.state.value = {};
  });

  it("returns false for unknown entity", () => {
    expect(noteIndicatorStore.has("breed", "b-1")).toBe(false);
  });

  it("stores ids per entity type and reads them back", () => {
    noteIndicatorStore.setIds("breed", new Set(["b-1", "b-2"]));

    expect(noteIndicatorStore.has("breed", "b-1")).toBe(true);
    expect(noteIndicatorStore.has("breed", "b-2")).toBe(true);
    expect(noteIndicatorStore.has("breed", "b-3")).toBe(false);
  });

  it("keeps per-entity buckets independent", () => {
    noteIndicatorStore.setIds("breed", new Set(["b-1"]));
    noteIndicatorStore.setIds("pet", new Set(["p-1"]));

    expect(noteIndicatorStore.has("breed", "b-1")).toBe(true);
    expect(noteIndicatorStore.has("pet", "b-1")).toBe(false);
    expect(noteIndicatorStore.has("pet", "p-1")).toBe(true);
  });

  it("setIds replaces previous set for the same entity type", () => {
    noteIndicatorStore.setIds("breed", new Set(["b-1", "b-2"]));
    noteIndicatorStore.setIds("breed", new Set(["b-3"]));

    expect(noteIndicatorStore.has("breed", "b-1")).toBe(false);
    expect(noteIndicatorStore.has("breed", "b-3")).toBe(true);
  });
});
