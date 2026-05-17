// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { EntitiesCounter } from "../EntitiesCounter";

function createMemoryStorage(): Storage {
  const store = new Map<string, string>();

  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
  };
}

try {
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: createMemoryStorage(),
  });
} catch {
  // jsdom may provide a non-configurable localStorage in some runners.
}

describe("EntitiesCounter", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders authoritative Showing 0 after an empty load, ignoring total and cached total", () => {
    localStorage.setItem(
      "totalCount_breed",
      JSON.stringify({ value: 1, timestamp: Date.now() }),
    );

    render(
      <EntitiesCounter
        entityType="breed"
        entitiesCount={0}
        total={10}
        isInitialLoad={false}
      />,
    );

    expect(screen.getByText("Showing 0")).toBeInTheDocument();
  });

  it("renders the loading placeholder instead of Showing 0 during initial load", () => {
    const { container } = render(
      <EntitiesCounter
        entityType="breed"
        entitiesCount={0}
        total={0}
        isInitialLoad
      />,
    );

    expect(screen.queryByText("Showing 0")).toBeNull();
    expect(container.textContent).toBe("Showing ...");
  });

  it("renders the current slice and total when data is present", () => {
    render(
      <EntitiesCounter
        entityType="breed"
        entitiesCount={5}
        total={10}
        isInitialLoad={false}
      />,
    );

    expect(screen.getByText("Showing 5 of 10")).toBeInTheDocument();
  });

  it("preserves the placeholder when a required total filter has no value", () => {
    const { container } = render(
      <EntitiesCounter
        entityType="breed"
        entitiesCount={0}
        total={0}
        totalFilterKey="pet_type_id"
        totalFilterValue={null}
        isInitialLoad={false}
      />,
    );

    expect(screen.getByText("...")).toBeInTheDocument();
    expect(container.textContent).toBe("Showing 0 of ...");
  });

  it("uses cached total as the placeholder total when entities are present and total is zero", () => {
    localStorage.setItem(
      "totalCount_breed",
      JSON.stringify({ value: 10, timestamp: Date.now() }),
    );

    render(
      <EntitiesCounter
        entityType="breed"
        entitiesCount={3}
        total={0}
        isInitialLoad={false}
      />,
    );

    expect(screen.getByText("Showing 3 of 10")).toBeInTheDocument();
  });
});
