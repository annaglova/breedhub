import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import {
  CACHE_POLICY_VALUES,
  CHILD_RECORDS_STALE_MS,
  DICTIONARY_RECORDS_STALE_MS,
  MAPPING_CACHE_STALE_MS,
  RPC_CACHE_DEFAULT_TTL_MS,
  getCachePolicyValue,
} from "../cache-policies";

function walkTsFiles(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const entry of entries) {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      if (entry === "__tests__") continue;
      files.push(...walkTsFiles(path));
      continue;
    }
    if (entry.endsWith(".ts") || entry.endsWith(".tsx")) {
      files.push(path);
    }
  }
  return files;
}

describe("cache-policies", () => {
  it("keeps runtime stale/ttl constants defined only in cache-policies.ts", () => {
    const srcRoot = join(process.cwd(), "src");
    const offenders = walkTsFiles(srcRoot)
      .filter((path) => !path.endsWith("cache/cache-policies.ts"))
      .flatMap((path) => {
        const contents = readFileSync(path, "utf8");
        const matches = contents.match(
          /\bconst\s+(?!TOTAL_COUNT_TTL_MS\b)(?!DEFAULT_TTL\b)[A-Z_]*(?:STALE_MS|TTL_MS)\s*=/g,
        );
        if (!matches) return [];
        return matches.map((match) => `${relative(srcRoot, path)}: ${match}`);
      });

    expect(offenders).toEqual([]);
  });

  it("looks up known cache policies and throws on unknown keys", () => {
    expect(CACHE_POLICY_VALUES.CHILD_RECORDS_STALE_MS).toBe(CHILD_RECORDS_STALE_MS);
    expect(getCachePolicyValue("MAPPING_CACHE_STALE_MS")).toBe(MAPPING_CACHE_STALE_MS);
    expect(getCachePolicyValue("DICTIONARY_RECORDS_STALE_MS")).toBe(
      DICTIONARY_RECORDS_STALE_MS,
    );
    expect(getCachePolicyValue("RPC_CACHE_DEFAULT_TTL_MS")).toBe(
      RPC_CACHE_DEFAULT_TTL_MS,
    );
    expect(() => getCachePolicyValue("NOPE_STALE_MS")).toThrow(
      "Unknown cache policy: NOPE_STALE_MS",
    );
  });
});
