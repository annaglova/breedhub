import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * W1.5 invariant: lazy-route Suspense fallbacks must not paint a spinner.
 * Per SKELETON_LOADING_ARCHITECTURE §10 / §P4 — page-level loading is always
 * a structurally-aware skeleton, never `animate-spin`.
 */
const ROUTE_FILES = [
  "apps/app/src/router/AppRouter.tsx",
  "apps/app/src/pages/pageRegistry.tsx",
  "apps/app/src/components/auth/AuthGuard.tsx",
];

describe("route-level loading fallbacks", () => {
  for (const relPath of ROUTE_FILES) {
    it(`${relPath} has no animate-spin spinner`, () => {
      const abs = path.resolve(process.cwd(), relPath);
      const src = readFileSync(abs, "utf8");
      expect(src).not.toMatch(/animate-spin/);
    });
  }
});
