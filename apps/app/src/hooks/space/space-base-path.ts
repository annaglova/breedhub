/**
 * Compute the space base path from the current pathname and space slug.
 * "/my/pets/test-pet" + slug "pets" -> "/my/pets".
 * "/pets/foo"        + slug "pets" -> "/pets".
 * Returns undefined when the slug isn't present in the pathname.
 */
export function computeSpaceBasePath(
  pathname: string,
  slug?: string,
): string | undefined {
  if (!slug) return undefined;
  const marker = `/${slug}`;
  const idx = pathname.indexOf(marker);
  if (idx === -1) return undefined;
  const end = idx + marker.length;
  // Require boundary: end of string OR next char is "/".
  if (end < pathname.length && pathname[end] !== "/") return undefined;
  return pathname.slice(0, end);
}
