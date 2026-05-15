/**
 * Unified view over a workspace's renderable children.
 *
 * A workspace can host two kinds of children:
 *   - `space` — an entity list (Notes, Pets, Breeds, …). Always slug-based.
 *   - `page`  — a custom component (Dashboard, Mating, Billing, …).
 *              May or may not have a slug:
 *                slug present → routed at `${workspace.path}/${slug}`
 *                slug absent  → routed at `workspace.path` itself
 *                              (legacy tool-workspace layout: /mating, /billing).
 *
 * This utility merges both into a single sortable list so the router and the
 * sidebar agree on order, default item, and resolved paths.
 */

export type WorkspaceItemKind = "page" | "space";

export interface WorkspaceItem {
  kind: WorkspaceItemKind;
  id: string;
  /** Set for spaces (always) and for pages that have a slug. */
  slug?: string;
  label?: string;
  icon?: unknown;
  order: number;
  isDefault: boolean;
  /** Original config node — kept so callers can read kind-specific fields. */
  raw: any;
}

function toArray<T = any>(value: any): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : (Object.values(value) as T[]);
}

/**
 * Merge `spaces` + `pages` of a workspace into a unified item list.
 * Order is preserved by the `order` field (ascending, fallback 0).
 */
export function getWorkspaceItems(workspace: any): WorkspaceItem[] {
  if (!workspace) return [];

  const items: WorkspaceItem[] = [];

  for (const space of toArray(workspace.spaces)) {
    if (!space?.slug) continue;
    items.push({
      kind: "space",
      id: space.id || space.slug,
      slug: space.slug,
      label: space.label,
      icon: space.icon,
      order: space.order ?? 0,
      isDefault: space.isDefault === true,
      raw: space,
    });
  }

  for (const page of toArray(workspace.pages)) {
    if (!page) continue;
    items.push({
      kind: "page",
      id: page.id || page.slug || page.component,
      slug: page.slug,
      label: page.label,
      icon: page.icon,
      order: page.order ?? 0,
      isDefault: page.isDefault === true,
      raw: page,
    });
  }

  return items.sort((a, b) => a.order - b.order);
}

/**
 * Pick the default child for workspace-root redirection.
 *
 * Rules (per Anna 2026-05-15):
 *   1. `isDefault: true` wins over order.
 *   2. If multiple defaults, the first by `order` wins.
 *   3. If no defaults, fallback to the lowest-order item.
 *   4. Pages WITHOUT a slug never participate — they live at the workspace
 *      root themselves and would create a redirect loop.
 */
export function getDefaultWorkspaceItem(
  items: WorkspaceItem[],
): WorkspaceItem | undefined {
  const candidates = items.filter((i) => i.kind === "space" || !!i.slug);
  if (candidates.length === 0) return undefined;

  const defaults = candidates.filter((i) => i.isDefault);
  if (defaults.length > 0) return defaults[0];

  return candidates[0];
}

/**
 * Resolve the full URL path for an item.
 * - Spaces and slug-bearing pages: `${workspacePath}/${slug}`
 * - Slug-less pages: `workspacePath` (legacy tool-workspace shape).
 * Root workspace (`path === '/'`) yields `/${slug}` for slug items.
 */
export function resolveItemPath(
  workspacePath: string,
  item: WorkspaceItem,
): string {
  if (!item.slug) {
    return workspacePath || "/";
  }
  if (!workspacePath || workspacePath === "/") {
    return `/${item.slug}`;
  }
  const base = workspacePath.endsWith("/")
    ? workspacePath.slice(0, -1)
    : workspacePath;
  return `${base}/${item.slug}`;
}
