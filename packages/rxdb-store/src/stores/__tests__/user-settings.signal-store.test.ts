/**
 * Unit tests for user-settings.signal-store.
 *
 * Run: pnpm --filter @breedhub/rxdb-store test
 */

import { afterEach, describe, expect, it, vi } from "vitest";

interface MockSettingsRow {
  weight_unit_id: string | null;
  size_unit_id: string | null;
  language: string | null;
  theme: string | null;
  breed_id: string | null;
}

type AuthCallback = (userId: string | null) => void;

function makeMockUserSignal(initialUserId: string | null) {
  const listeners = new Set<AuthCallback>();
  return {
    value: initialUserId,
    subscribe(fn: AuthCallback) {
      listeners.add(fn);
      // mimic @preact/signals: subscribe fires immediately with current value
      fn(this.value);
      return () => listeners.delete(fn);
    },
    /** test helper */
    set(next: string | null) {
      this.value = next;
      listeners.forEach((fn) => fn(next));
    },
  };
}

async function loadHarness(options?: {
  initialUserId?: string | null;
  fetchResult?: { data: MockSettingsRow | null; error: { message: string } | null };
}) {
  vi.resetModules();

  const mockUserSignal = makeMockUserSignal(options?.initialUserId ?? null);

  vi.doMock("../user-store.signal-store", () => ({
    userStore: { currentUserId: mockUserSignal },
  }));

  const maybeSingle = vi.fn(async () =>
    options?.fetchResult ?? { data: null, error: null },
  );
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));

  vi.doMock("../../supabase/client", () => ({
    supabase: { from },
  }));

  const module = await import("../user-settings.signal-store");
  return {
    store: module.userSettingsStore,
    user: mockUserSignal,
    from,
    select,
    eq,
    maybeSingle,
  };
}

async function flush() {
  // settle the chain: initial sync subscribe → load() → await maybeSingle → apply()
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

describe("user-settings.signal-store", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("initializes with NULL signals when no user is signed in", async () => {
    const h = await loadHarness();

    h.store.initialize();
    await flush();

    expect(h.store.initialized.value).toBe(true);
    expect(h.store.weightUnitId.value).toBeNull();
    expect(h.store.sizeUnitId.value).toBeNull();
    expect(h.from).not.toHaveBeenCalled();
  });

  it("loads settings for the user that was already signed in at startup", async () => {
    const h = await loadHarness({
      initialUserId: "user-1",
      fetchResult: {
        data: {
          weight_unit_id: "kg-id",
          size_unit_id: "cm-id",
          language: "en",
          theme: "light",
          breed_id: null,
        },
        error: null,
      },
    });

    h.store.initialize();
    await flush();

    expect(h.from).toHaveBeenCalledWith("user_settings");
    expect(h.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(h.store.weightUnitId.value).toBe("kg-id");
    expect(h.store.sizeUnitId.value).toBe("cm-id");
    expect(h.store.language.value).toBe("en");
    expect(h.store.theme.value).toBe("light");
    expect(h.store.breedId.value).toBeNull();
  });

  it("reloads when the user changes (login)", async () => {
    const h = await loadHarness({
      fetchResult: {
        data: {
          weight_unit_id: "lbs-id",
          size_unit_id: "in-id",
          language: null,
          theme: null,
          breed_id: null,
        },
        error: null,
      },
    });

    h.store.initialize();
    await flush();

    h.user.set("user-2");
    await flush();

    expect(h.eq).toHaveBeenCalledWith("user_id", "user-2");
    expect(h.store.weightUnitId.value).toBe("lbs-id");
    expect(h.store.sizeUnitId.value).toBe("in-id");
  });

  it("clears signals on sign-out (currentUserId → null)", async () => {
    const h = await loadHarness({
      initialUserId: "user-1",
      fetchResult: {
        data: {
          weight_unit_id: "kg-id",
          size_unit_id: "cm-id",
          language: "en",
          theme: "dark",
          breed_id: "breed-x",
        },
        error: null,
      },
    });

    h.store.initialize();
    await flush();

    h.user.set(null);
    await flush();

    expect(h.store.weightUnitId.value).toBeNull();
    expect(h.store.sizeUnitId.value).toBeNull();
    expect(h.store.theme.value).toBeNull();
    expect(h.store.breedId.value).toBeNull();
  });

  it("keeps previous values on fetch error", async () => {
    const h = await loadHarness({
      initialUserId: "user-1",
      fetchResult: {
        data: {
          weight_unit_id: "kg-id",
          size_unit_id: "cm-id",
          language: null,
          theme: null,
          breed_id: null,
        },
        error: null,
      },
    });

    h.store.initialize();
    await flush();
    expect(h.store.weightUnitId.value).toBe("kg-id");

    h.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: { message: "boom" },
    });
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    h.user.set("user-2");
    await flush();

    expect(errSpy).toHaveBeenCalled();
    expect(h.store.weightUnitId.value).toBe("kg-id");
  });

  it("does not initialize twice", async () => {
    const h = await loadHarness();

    h.store.initialize();
    h.store.initialize();
    await flush();

    expect(h.from).not.toHaveBeenCalled();
    expect(h.store.initialized.value).toBe(true);
  });
});
