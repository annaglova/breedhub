import { useMemo } from 'react';
import { useAuth } from '@shared/core/auth';
import { useNotes } from './useNotes';
import type { EntityListHookResult } from './useEntities';

const ORDER_BY = { field: 'created_at', direction: 'desc' as const };

const FIELD_CONFIGS = {
  entity: { fieldType: 'string', operator: 'eq' },
  entity_id: { fieldType: 'uuid', operator: 'eq' },
  created_by: { fieldType: 'uuid', operator: 'eq' },
};

export function useEntityNotes(
  entity: string,
  entityId: string,
): EntityListHookResult {
  const { user, authenticated } = useAuth();

  const filters = useMemo(
    () => ({ entity, entity_id: entityId, created_by: user.id }),
    [entity, entityId, user.id],
  );

  return useNotes({
    filters,
    orderBy: ORDER_BY,
    recordsCount: 50,
    enabled: authenticated && !!entityId && !!user.id,
    fieldConfigs: FIELD_CONFIGS,
  });
}
