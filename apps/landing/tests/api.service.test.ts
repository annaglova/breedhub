import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("landingService", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("VITE_SUPABASE_URL", "");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "");
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("returns null and warns when Supabase credentials are missing", async () => {
    const { landingService } = await import("../src/services/api.service");

    await expect(landingService.getActiveServices()).resolves.toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(
      "Supabase credentials not found. Using mock data.",
    );
  });
});
