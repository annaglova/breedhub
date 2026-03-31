/**
 * Post-save hooks for entities.
 * Called after create/update to trigger server-side business logic (RPC).
 * Keeps SpaceStore clean — niche logic lives here, not in the orchestrator.
 */

import { supabase } from '../supabase/client';

const LITTER_FIELDS = ['father_id', 'mother_id', 'father_breed_id', 'mother_breed_id', 'date_of_birth'];

/**
 * Run post-save hooks for an entity.
 * Called after SpaceStore.create() and SpaceStore.update().
 * Fire-and-forget — errors are logged but don't break the save flow.
 */
export async function runPostSaveHooks(
  entityType: string,
  entityId: string,
  entity: Record<string, any>,
  changedFields?: string[]
): Promise<void> {
  try {
    if (entityType === 'pet') {
      await petPostSaveHooks(entityId, entity, changedFields);
    }
  } catch (error) {
    console.error(`[EntityHooks] Post-save hook failed for ${entityType}:`, error);
  }
}

/**
 * Pet-specific post-save hooks.
 */
async function petPostSaveHooks(
  petId: string,
  entity: Record<string, any>,
  changedFields?: string[]
): Promise<void> {
  // Link pet to litter when father + mother + date_of_birth are present
  // On create: always check (changedFields is undefined)
  // On update: only if litter-relevant fields changed
  const shouldCheckLitter = !changedFields || changedFields.some(f => LITTER_FIELDS.includes(f));

  if (shouldCheckLitter && entity.father_id && entity.mother_id && entity.date_of_birth && entity.breed_id) {
    const { data, error } = await supabase.rpc('link_pet_to_litter', {
      p_pet_id: petId,
      p_pet_breed_id: entity.breed_id,
    });

    if (error) {
      console.error('[EntityHooks] link_pet_to_litter error:', error.message);
    } else if (data && !data.skipped) {
      console.log('[EntityHooks] link_pet_to_litter:', data.action, data.litter_id,
        data.created ? '(new litter)' : '');
    }
  }
}
