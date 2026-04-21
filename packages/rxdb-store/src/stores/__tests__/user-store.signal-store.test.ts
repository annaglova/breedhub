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

async function loadUserStoreHarness(options?: {
  session?: MockSession | null;
  getSessionError?: Error;
}) {
  vi.resetModules();

  let authCallback:
    | ((event: string, session: MockSession | null) => void)
    | null = null;

  const getSession = vi.fn(async () => {
    if (options?.getSessionError) {
      throw options.getSessionError;
    }

    return {
      data: {
        session: options?.session ?? null,
      },
    };
  });

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

  vi.doMock("../../supabase/client", () => ({
    supabase: {
      auth: {
        getSession,
        onAuthStateChange,
      },
    },
  }));

  const module = await import("../user-store.signal-store");

  return {
    userStore: module.userStore,
    getSession,
    onAuthStateChange,
    unsubscribe,
    emitAuthChange(event: string, session: MockSession | null) {
      authCallback?.(event, session);
    },
  };
}

describe("user-store.signal-store", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("initializes from an empty cached session and subscribes to auth state changes", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const harness = await loadUserStoreHarness();

    await harness.userStore.initialize();

    expect(harness.getSession).toHaveBeenCalledTimes(1);
    expect(harness.onAuthStateChange).toHaveBeenCalledTimes(1);
    expect(harness.userStore.initialized.value).toBe(true);
    expect(harness.userStore.loading.value).toBe(false);
    expect(harness.userStore.currentUserId.value).toBeNull();
    expect(harness.userStore.currentUser.value).toBeNull();
    expect(harness.userStore.isAuthenticated.value).toBe(false);
    expect(logSpy).toHaveBeenCalledWith("[UserStore] Initialized, userId:", null);
  });

  it("hydrates the current user from the cached Supabase session", async () => {
    const harness = await loadUserStoreHarness({
      session: {
        user: {
          id: "user-1",
          email: "owner@example.com",
          user_metadata: {
            full_name: "Breed Owner",
            avatar_url: "https://cdn.example.com/avatar.png",
          },
        },
      },
    });

    await harness.userStore.initialize();

    expect(harness.userStore.currentUserId.value).toBe("user-1");
    expect(harness.userStore.currentUser.value).toEqual({
      id: "user-1",
      email: "owner@example.com",
      name: "Breed Owner",
      avatar: "https://cdn.example.com/avatar.png",
    });
    expect(harness.userStore.isAuthenticated.value).toBe(true);
  });

  it("does not initialize twice once the singleton is ready", async () => {
    const harness = await loadUserStoreHarness({
      session: {
        user: {
          id: "user-1",
          email: "owner@example.com",
        },
      },
    });

    await harness.userStore.initialize();
    await harness.userStore.initialize();

    expect(harness.getSession).toHaveBeenCalledTimes(1);
    expect(harness.onAuthStateChange).toHaveBeenCalledTimes(1);
  });

  it("updates the user profile on auth state changes and clears it on sign-out", async () => {
    const harness = await loadUserStoreHarness();

    await harness.userStore.initialize();

    harness.emitAuthChange("SIGNED_IN", {
      user: {
        id: "user-2",
        email: "event@example.com",
        user_metadata: {
          name: "Event User",
          picture: "https://cdn.example.com/picture.png",
        },
      },
    });

    expect(harness.userStore.currentUserId.value).toBe("user-2");
    expect(harness.userStore.currentUser.value).toEqual({
      id: "user-2",
      email: "event@example.com",
      name: "Event User",
      avatar: "https://cdn.example.com/picture.png",
    });
    expect(harness.userStore.isAuthenticated.value).toBe(true);

    harness.emitAuthChange("SIGNED_OUT", null);

    expect(harness.userStore.currentUserId.value).toBeNull();
    expect(harness.userStore.currentUser.value).toBeNull();
    expect(harness.userStore.isAuthenticated.value).toBe(false);
  });

  it("falls back to email for the display name and null avatar when metadata is absent", async () => {
    const harness = await loadUserStoreHarness();

    await harness.userStore.initialize();

    harness.emitAuthChange("TOKEN_REFRESHED", {
      user: {
        id: "user-3",
        email: "fallback@example.com",
      },
    });

    expect(harness.userStore.currentUser.value).toEqual({
      id: "user-3",
      email: "fallback@example.com",
      name: "fallback@example.com",
      avatar: null,
    });
  });

  it("logs and leaves the store uninitialized when getSession fails", async () => {
    const error = new Error("session unavailable");
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const harness = await loadUserStoreHarness({
      getSessionError: error,
    });

    await harness.userStore.initialize();

    expect(harness.onAuthStateChange).not.toHaveBeenCalled();
    expect(harness.userStore.initialized.value).toBe(false);
    expect(harness.userStore.loading.value).toBe(false);
    expect(harness.userStore.currentUserId.value).toBeNull();
    expect(errorSpy).toHaveBeenCalledWith(
      "[UserStore] Failed to initialize:",
      error,
    );
  });

  it("unsubscribes from auth changes when destroy is called", async () => {
    const harness = await loadUserStoreHarness();

    await harness.userStore.initialize();
    harness.userStore.destroy();

    expect(harness.unsubscribe).toHaveBeenCalledTimes(1);

    harness.userStore.destroy();

    expect(harness.unsubscribe).toHaveBeenCalledTimes(1);
  });
});
