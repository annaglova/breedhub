import { afterEach, describe, expect, it, vi } from "vitest";

type MockUser = {
  id: string;
  email?: string | null;
  user_metadata?: {
    full_name?: string;
    name?: string;
    avatar_url?: string;
    picture?: string;
  };
};

type MockSession = {
  user: MockUser;
};

type ContactLookupResult = {
  data: { id: string } | null;
  error: Error | null;
};

function makeUser(id: string): MockUser {
  return {
    id,
    email: `${id.toLowerCase()}@example.com`,
  };
}

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

async function loadUserStoreHarness(options?: {
  contactLookup?: (userId: string) => Promise<ContactLookupResult>;
}) {
  vi.resetModules();
  vi.spyOn(console, "log").mockImplementation(() => {});

  let authCallback:
    | ((event: string, session: MockSession | null) => void)
    | null = null;

  const getSession = vi.fn(async () => ({
    data: {
      session: null,
    },
  }));

  const unsubscribe = vi.fn();
  const onAuthStateChange = vi.fn(
    (callback: (event: string, session: MockSession | null) => void) => {
      authCallback = callback;

      return {
        data: {
          subscription: {
            unsubscribe,
          },
        },
      };
    },
  );

  const contactLookup =
    options?.contactLookup ??
    (async (): Promise<ContactLookupResult> => ({
      data: null,
      error: null,
    }));

  const maybeSingle = vi.fn();
  const eq = vi.fn((_column: string, value: string) => ({
    maybeSingle: () => {
      maybeSingle();
      return contactLookup(value);
    },
  }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));

  vi.doMock("../../supabase/client", () => ({
    supabase: {
      auth: {
        getSession,
        onAuthStateChange,
      },
      from,
    },
  }));

  const module = await import("../user-store.signal-store");

  return {
    userStore: module.userStore,
    from,
    select,
    eq,
    maybeSingle,
    async initialize() {
      await module.userStore.initialize();
    },
    emitAuthChange(event: string, session: MockSession | null) {
      authCallback?.(event, session);
    },
  };
}

describe("user-store currentContactId", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("resolveContactIdForUser returns the id through the setUser lookup", async () => {
    const h = await loadUserStoreHarness({
      contactLookup: async () => ({
        data: { id: "CONTACT_UUID" },
        error: null,
      }),
    });
    await h.initialize();

    h.emitAuthChange("SIGNED_IN", { user: makeUser("USER_UUID") });
    await flushPromises();

    expect(h.userStore.currentContactId.value).toBe("CONTACT_UUID");
    expect(h.from).toHaveBeenCalledWith("contact");
    expect(h.select).toHaveBeenCalledWith("id");
    expect(h.eq).toHaveBeenCalledWith("user_id", "USER_UUID");
    expect(h.maybeSingle).toHaveBeenCalledTimes(1);
  });

  it("resolveContactIdForUser returns null on no row through the setUser lookup", async () => {
    const h = await loadUserStoreHarness({
      contactLookup: async () => ({
        data: null,
        error: null,
      }),
    });
    await h.initialize();

    h.emitAuthChange("SIGNED_IN", { user: makeUser("USER_UUID") });
    await flushPromises();

    expect(h.userStore.currentContactId.value).toBeNull();
    expect(h.from).toHaveBeenCalledWith("contact");
    expect(h.eq).toHaveBeenCalledWith("user_id", "USER_UUID");
    expect(h.maybeSingle).toHaveBeenCalledTimes(1);
  });

  it("resolveContactIdForUser returns null and warns on error through the setUser lookup", async () => {
    const error = new Error("boom");
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const h = await loadUserStoreHarness({
      contactLookup: async () => ({
        data: null,
        error,
      }),
    });
    await h.initialize();

    h.emitAuthChange("SIGNED_IN", { user: makeUser("USER_UUID") });
    await flushPromises();

    expect(h.userStore.currentContactId.value).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(
      "[UserStore] Failed to resolve contact for user:",
      error,
    );
  });

  it("setUser populates currentContactId asynchronously", async () => {
    const lookup = deferred<ContactLookupResult>();
    const h = await loadUserStoreHarness({
      contactLookup: () => lookup.promise,
    });
    await h.initialize();

    h.emitAuthChange("SIGNED_IN", { user: makeUser("USER_A") });

    expect(h.userStore.currentUserId.value).toBe("USER_A");
    expect(h.userStore.currentContactId.value).toBeNull();

    lookup.resolve({
      data: { id: "CONTACT_A" },
      error: null,
    });
    await flushPromises();

    expect(h.userStore.currentContactId.value).toBe("CONTACT_A");
  });

  it("drops a stale contact lookup result when the user switches mid-lookup", async () => {
    const userALookup = deferred<ContactLookupResult>();
    const h = await loadUserStoreHarness({
      contactLookup: (userId) => {
        if (userId === "USER_A") return userALookup.promise;

        return Promise.resolve({
          data: { id: "CONTACT_B" },
          error: null,
        });
      },
    });
    await h.initialize();

    h.emitAuthChange("SIGNED_IN", { user: makeUser("USER_A") });
    h.emitAuthChange("SIGNED_IN", { user: makeUser("USER_B") });
    await flushPromises();

    expect(h.userStore.currentUserId.value).toBe("USER_B");
    expect(h.userStore.currentContactId.value).toBe("CONTACT_B");

    userALookup.resolve({
      data: { id: "CONTACT_A" },
      error: null,
    });
    await flushPromises();

    expect(h.userStore.currentContactId.value).toBe("CONTACT_B");
  });

  it("clearUser resets currentContactId", async () => {
    const h = await loadUserStoreHarness({
      contactLookup: async () => ({
        data: { id: "CONTACT_A" },
        error: null,
      }),
    });
    await h.initialize();

    h.emitAuthChange("SIGNED_IN", { user: makeUser("USER_A") });
    await flushPromises();
    expect(h.userStore.currentContactId.value).toBe("CONTACT_A");

    h.emitAuthChange("SIGNED_OUT", null);

    expect(h.userStore.currentUserId.value).toBeNull();
    expect(h.userStore.currentContactId.value).toBeNull();
  });
});
