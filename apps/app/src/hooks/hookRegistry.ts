import { useAccounts } from './useAccounts';
import { useBreeds } from './useBreeds';
import { useContacts } from './useContacts';
import { useLitters } from './useLitters';
import { usePets } from './usePets';
import { useProjects } from './useProjects';

/**
 * Hook Registry - maps entity types to their data hooks
 *
 * Used by SpacePage to dynamically select the correct hook
 * based on entity type (from URL or props)
 *
 * Add new entity hooks here as they are created
 */
export const hookRegistry: Record<string, any> = {
  'account': useAccounts,
  'breed': useBreeds,
  'contact': useContacts,
  'litter': useLitters,
  'pet': usePets,
  'project': useProjects,
  // 'kennel': useKennels,  // TODO: create useKennels hook
  // ... add more as needed
};

/**
 * Get hook for entity type
 * Returns undefined if hook not found (allows graceful fallback)
 */
export function getEntityHook(entityType: string) {
  return hookRegistry[entityType];
}
