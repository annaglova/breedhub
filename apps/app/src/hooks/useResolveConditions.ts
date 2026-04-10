import { useEffect, useState } from 'react';

interface ConditionResolver {
  resolve: (entityType: string, entityId: string, entity?: Record<string, any>) => Promise<boolean>;
  message: string;
}

/**
 * Registry of condition resolvers.
 * Each key is a condition name used in field config `readonlyWhen`.
 * Add new conditions here as needed.
 *
 * Resolvers use RxDB local data (local-first).
 */
const CONDITION_RESOLVERS: Record<string, ConditionResolver> = {
  hasChildren: {
    resolve: async (_entityType: string, _entityId: string, entity?: Record<string, any>) => {
      // Denormalized boolean on pet record — set by trg_pet_sync_pet_child trigger.
      // No async queries needed, no RxDB cache dependency.
      return entity?.has_children === true;
    },
    message: 'Cannot be changed because the pet has children',
  },
};

interface UseResolveConditionsResult {
  conditions: Record<string, boolean>;
  messages: Record<string, string>;
  loading: boolean;
}

/**
 * Resolves readonlyWhen conditions for entity fields.
 *
 * Collects unique condition names from field configs,
 * resolves each via RxDB local data, returns a map of results.
 */
export function useResolveConditions(
  entityType: string,
  entity?: Record<string, any> | null,
  conditionNames?: string[],
): UseResolveConditionsResult {
  const [conditions, setConditions] = useState<Record<string, boolean>>({});
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const entityId = entity?.id;
  // Stable key for the conditions list
  const conditionsKey = conditionNames?.sort().join(',') || '';

  useEffect(() => {
    if (!entityId || !conditionsKey) {
      setConditions({});
      setMessages({});
      return;
    }

    const uniqueConditions = conditionsKey.split(',').filter(Boolean);
    if (uniqueConditions.length === 0) return;

    let cancelled = false;
    setLoading(true);

    Promise.all(
      uniqueConditions.map(async (name) => {
        const resolver = CONDITION_RESOLVERS[name];
        if (!resolver) {
          console.warn(`[useResolveConditions] Unknown condition: ${name}`);
          return { name, value: false, message: '' };
        }
        const value = await resolver.resolve(entityType, entityId, entity ?? undefined);
        return { name, value, message: resolver.message };
      })
    ).then((results) => {
      if (cancelled) return;
      const conds: Record<string, boolean> = {};
      const msgs: Record<string, string> = {};
      for (const { name, value, message } of results) {
        conds[name] = value;
        if (value) msgs[name] = message;
      }
      setConditions(conds);
      setMessages(msgs);
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [entityType, entityId, conditionsKey]);

  return { conditions, messages, loading };
}
