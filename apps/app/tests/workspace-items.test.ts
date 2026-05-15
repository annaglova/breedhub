import { describe, expect, it } from "vitest";
import {
  getDefaultWorkspaceItem,
  getWorkspaceItems,
  resolveItemPath,
} from "@/utils/workspace-items";

describe("getWorkspaceItems", () => {
  it("returns empty when workspace is null/undefined", () => {
    expect(getWorkspaceItems(null)).toEqual([]);
    expect(getWorkspaceItems(undefined)).toEqual([]);
  });

  it("merges pages + spaces sorted by order ascending", () => {
    const workspace = {
      pages: {
        p1: { id: "p1", slug: "board", label: "Dashboard", order: 1, isDefault: true, component: "DashboardPage" },
      },
      spaces: {
        s1: { id: "s1", slug: "notes", label: "Notes", order: 2 },
        s2: { id: "s2", slug: "pets", label: "Pets", order: 3 },
      },
    };
    const items = getWorkspaceItems(workspace);
    expect(items.map((i) => ({ kind: i.kind, slug: i.slug, order: i.order }))).toEqual([
      { kind: "page", slug: "board", order: 1 },
      { kind: "space", slug: "notes", order: 2 },
      { kind: "space", slug: "pets", order: 3 },
    ]);
  });

  it("treats arrays and objects identically", () => {
    const asObj = getWorkspaceItems({
      pages: { p1: { id: "p1", slug: "a", order: 1 } },
      spaces: { s1: { id: "s1", slug: "b", order: 2 } },
    });
    const asArr = getWorkspaceItems({
      pages: [{ id: "p1", slug: "a", order: 1 }],
      spaces: [{ id: "s1", slug: "b", order: 2 }],
    });
    expect(asObj).toEqual(asArr);
  });

  it("includes pages without slug (they live at workspace path)", () => {
    const items = getWorkspaceItems({
      pages: { p1: { id: "mating", component: "MatingPage", isDefault: true, order: 1 } },
    });
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ kind: "page", slug: undefined, isDefault: true });
  });

  it("skips spaces without slug (invalid config)", () => {
    const items = getWorkspaceItems({
      spaces: { s1: { id: "s1", order: 1 } },
    });
    expect(items).toEqual([]);
  });
});

describe("getDefaultWorkspaceItem", () => {
  it("returns undefined for empty items", () => {
    expect(getDefaultWorkspaceItem([])).toBeUndefined();
  });

  it("picks isDefault over lower order", () => {
    const items = getWorkspaceItems({
      pages: { p1: { slug: "board", order: 5, isDefault: true } },
      spaces: { s1: { slug: "notes", order: 1 } },
    });
    expect(getDefaultWorkspaceItem(items)?.slug).toBe("board");
  });

  it("falls back to lowest order when no isDefault is set", () => {
    const items = getWorkspaceItems({
      spaces: {
        s1: { slug: "notes", order: 2 },
        s2: { slug: "pets", order: 3 },
      },
    });
    expect(getDefaultWorkspaceItem(items)?.slug).toBe("notes");
  });

  it("ignores slug-less pages (they live at workspace path, no redirect needed)", () => {
    const items = getWorkspaceItems({
      pages: { p1: { component: "MatingPage", isDefault: true, order: 1 } },
    });
    expect(getDefaultWorkspaceItem(items)).toBeUndefined();
  });

  it("when multiple isDefault, picks the first by order (already sorted)", () => {
    const items = getWorkspaceItems({
      pages: {
        a: { slug: "a", order: 2, isDefault: true },
        b: { slug: "b", order: 1, isDefault: true },
      },
    });
    expect(getDefaultWorkspaceItem(items)?.slug).toBe("b");
  });
});

describe("resolveItemPath", () => {
  it("returns workspacePath for slug-less items", () => {
    expect(resolveItemPath("/mating", { kind: "page", id: "m", order: 0, isDefault: true, raw: {} })).toBe("/mating");
  });

  it("joins workspace path + slug for non-root workspaces", () => {
    const item = { kind: "space" as const, id: "n", slug: "notes", order: 0, isDefault: false, raw: {} };
    expect(resolveItemPath("/my", item)).toBe("/my/notes");
  });

  it("handles trailing slash on workspace path", () => {
    const item = { kind: "space" as const, id: "n", slug: "notes", order: 0, isDefault: false, raw: {} };
    expect(resolveItemPath("/my/", item)).toBe("/my/notes");
  });

  it("returns `/${slug}` for root workspace", () => {
    const item = { kind: "space" as const, id: "b", slug: "breeds", order: 0, isDefault: false, raw: {} };
    expect(resolveItemPath("/", item)).toBe("/breeds");
  });
});
