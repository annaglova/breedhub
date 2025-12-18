import { useBreeds } from './useBreeds';
import { usePets } from './usePets';

/**
 * Hook Registry - maps entity types to their data hooks
 *
 * Used by SpacePage to dynamically select the correct hook
 * based on entity type (from URL or props)
 *
 * Add new entity hooks here as they are created
 */
export const hookRegistry: Record<string, any> = {
  'breed': useBreeds,
  'pet': usePets,
  // 'kennel': useKennels,  // TODO: create useKennels hook
  // 'litter': useLitters,  // TODO: create useLitters hook
  // ... add more as needed
};

/**
 * Get hook for entity type
 * Returns undefined if hook not found (allows graceful fallback)
 */
export function getEntityHook(entityType: string) {
  return hookRegistry[entityType];
}
