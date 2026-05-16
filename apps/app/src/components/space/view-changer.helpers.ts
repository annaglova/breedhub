/**
 * Compute the base path for navigating to a different view.
 *
 * When a user switches view (e.g. list → table), we want to stay on the same
 * space but drop any entity slug that may be in the URL. We can't just strip
 * the last segment because workspace paths vary in depth (root `/pets` vs
 * private `/my/pets`). Instead we locate the space slug in the pathname and
 * keep everything up to and including it. If no slug is provided or it's
 * not found, fall back to the current pathname so we don't mangle it.
 */
export function computeSpaceBasePath(
  pathname: string,
  spaceSlug?: string,
): string {
  if (!spaceSlug) return pathname;
  const segments = pathname.split("/");
  const idx = segments.indexOf(spaceSlug);
  if (idx < 0) return pathname;
  return segments.slice(0, idx + 1).join("/");
}
