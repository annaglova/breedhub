#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SCAN_DIRS = ["apps", "packages"];
const SKIP_DIRS = new Set([
  "node_modules",
  "dist",
  "dev-dist",
  ".git",
]);
const GENERATED_SUFFIXES = [".js", ".js.map", ".d.ts", ".d.ts.map"];
const CHECK_ONLY = process.argv.includes("--check");

function shouldSkipDir(dirname) {
  return SKIP_DIRS.has(dirname);
}

function hasSourceSibling(filePath, suffix) {
  const basePath = filePath.slice(0, -suffix.length);
  return fs.existsSync(`${basePath}.ts`) || fs.existsSync(`${basePath}.tsx`);
}

function walk(dirPath, removals) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      if (!shouldSkipDir(entry.name)) {
        walk(fullPath, removals);
      }
      continue;
    }

    const suffix = GENERATED_SUFFIXES.find((candidate) =>
      entry.name.endsWith(candidate),
    );

    if (!suffix) {
      continue;
    }

    if (hasSourceSibling(fullPath, suffix)) {
      removals.push(fullPath);
    }
  }
}

function main() {
  const removals = [];

  for (const relativeDir of SCAN_DIRS) {
    const dirPath = path.join(ROOT, relativeDir);
    if (fs.existsSync(dirPath)) {
      walk(dirPath, removals);
    }
  }

  if (removals.length === 0) {
    console.log("[clean-inline-ts-emit] No generated inline TS artifacts found.");
    return;
  }

  if (CHECK_ONLY) {
    console.error(
      `[clean-inline-ts-emit] Found ${removals.length} generated inline artifact(s). Run "pnpm clean:generated" to remove them.`,
    );
    process.exitCode = 1;
    return;
  }

  for (const filePath of removals) {
    fs.unlinkSync(filePath);
  }

  console.log(
    `[clean-inline-ts-emit] Removed ${removals.length} generated inline artifact(s).`,
  );
}

main();
