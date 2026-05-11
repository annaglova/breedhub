import { useAuth } from '@shared/core/auth';
import { useNotes } from './useNotes';
import type { EntityListHookResult } from './useEntities';

export function useEntityNotes(
  entity: string,
  entityId: string,
): EntityListHookResult {
  const { user, authenticated } = useAuth();

  return useNotes({
    filters: {
      entity,
      entity_id: entityId,
      created_by: user.id,
      deleted: false,
    },
    orderBy: { field: 'created_at', direction: 'desc' },
    recordsCount: 50,
    enabled: authenticated && !!entityId && !!user.id,
  });
}
