import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SpaceQuickFiltersConfig } from "@breedhub/rxdb-store";

type MutableSignal<T> = { value: T };

const signalStore = vi.hoisted(() => ({
  currentContactId: undefined as unknown as MutableSignal<string | null>,
}));

vi.mock("@breedhub/rxdb-store", async () => {
  const { signal } =
    await vi.importActual<typeof import("@preact/signals-react")>(
      "@preact/signals-react",
    );

  signalStore.currentContactId = signal<string | null>(null);

  return {
    userStore: {
      currentContactId: signalStore.currentContactId,
    },
  };
});

import { useQuickFilterReadFrom } from "../use-quick-filter-read-from";

function makeQuickFilters(
  modes: SpaceQuickFiltersConfig["modes"] = {
    owned: {
      slug: "owned",
      label: "Owned",
      isDefault: true,
      table: "pet_owner",
      parentField: "contact_id",
      entityIdField: "pet_id",
      entityPartitionField: "pet_breed_id",
    },
    bred: {
      slug: "bred",
      label: "Bred",
      table: "offspring_in_contact",
      parentField: "contact_id",
      entityIdField: "pet_id",
      entityPartitionField: "pet_breed_id",
    },
  },
): SpaceQuickFiltersConfig {
  return {
    component: "PetOwnerBreederFilter",
    parentIdSource: "currentContactId",
    modes,
  };
}

describe("useQuickFilterReadFrom", () => {
  beforeEach(() => {
    signalStore.currentContactId.value = "contact-1";
  });

  it("returns undefined when quickFilters is undefined", () => {
    const { result } = renderHook(() =>
      useQuickFilterReadFrom(undefined, null),
    );

    expect(result.current).toBeUndefined();
  });

  it("returns undefined when no parentId is available yet", () => {
    signalStore.currentContactId.value = null;

    const { result } = renderHook(() =>
      useQuickFilterReadFrom(makeQuickFilters(), null),
    );

    expect(result.current).toBeUndefined();
  });

  it("picks the mode whose slug matches the active scope", () => {
    const { result } = renderHook(() =>
      useQuickFilterReadFrom(makeQuickFilters(), "bred"),
    );

    expect(result.current).toEqual({
      table: "offspring_in_contact",
      parentField: "contact_id",
      entityIdField: "pet_id",
      entityPartitionField: "pet_breed_id",
      parentId: "contact-1",
    });
  });

  it("falls back to the default mode when scope is null", () => {
    const { result } = renderHook(() =>
      useQuickFilterReadFrom(makeQuickFilters(), null),
    );

    expect(result.current?.table).toBe("pet_owner");
  });

  it("falls back to the default mode when scope does not match a mode", () => {
    const { result } = renderHook(() =>
      useQuickFilterReadFrom(makeQuickFilters(), "missing"),
    );

    expect(result.current?.table).toBe("pet_owner");
  });

  it("falls back to the first mode when no mode is default and no scope is set", () => {
    const { result } = renderHook(() =>
      useQuickFilterReadFrom(
        makeQuickFilters({
          bred: {
            slug: "bred",
            label: "Bred",
            table: "offspring_in_contact",
            parentField: "contact_id",
            entityIdField: "pet_id",
          },
          owned: {
            slug: "owned",
            label: "Owned",
            table: "pet_owner",
            parentField: "contact_id",
            entityIdField: "pet_id",
          },
        }),
        null,
      ),
    );

    expect(result.current?.table).toBe("offspring_in_contact");
  });

  it("resolves parentId from currentContactId", () => {
    signalStore.currentContactId.value = "contact-42";

    const { result } = renderHook(() =>
      useQuickFilterReadFrom(makeQuickFilters(), null),
    );

    expect(result.current?.parentId).toBe("contact-42");
  });

  it("re-renders when currentContactId changes", async () => {
    signalStore.currentContactId.value = null;

    const { result } = renderHook(() =>
      useQuickFilterReadFrom(makeQuickFilters(), null),
    );

    expect(result.current).toBeUndefined();

    act(() => {
      signalStore.currentContactId.value = "contact-1";
    });

    await waitFor(() => {
      expect(result.current).toMatchObject({ parentId: "contact-1" });
    });
  });
});
