/**
 * Hook to check if entity is loaded and ready to render.
 * Does NOT block on dictionary/collection lookups — those fill in asynchronously.
 * Only checks if the entity object itself exists.
 *
 * @param entityType - Type of entity ('pet', 'breed', 'litter', etc.)
 * @param entity - The entity object
 * @returns true when entity data is available
 */
export function useEntityFullyLoaded(
  entityType: string | undefined,
  entity: any
): boolean {
  return !!entity;
}
