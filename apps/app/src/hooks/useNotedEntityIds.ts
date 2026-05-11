import { useEffect, useMemo } from "react";
import { useAuth } from "@shared/core/auth";
import { useNotes } from "./useNotes";
import { noteIndicatorStore } from "@/stores/note-indicator.store";

const ORDER_BY = { field: "created_at", direction: "desc" as const };
const FIELD_CONFIGS = {
  entity: { fieldType: "string", operator: "eq" },
  created_by: { fieldType: "uuid", operator: "eq" },
};

export function useNotedEntityIds(entityType: string): void {
  const { user, authenticated } = useAuth();

  const filters = useMemo(
    () => ({ entity: entityType, created_by: user.id }),
    [entityType, user.id],
  );

  const { data } = useNotes({
    filters,
    orderBy: ORDER_BY,
    recordsCount: 500,
    enabled: authenticated && !!entityType && !!user.id,
    fieldConfigs: FIELD_CONFIGS,
  });

  useEffect(() => {
    const ids = new Set<string>();
    for (const note of (data?.entities ?? []) as Array<{ entity_id?: string }>) {
      if (note?.entity_id) ids.add(note.entity_id);
    }
    noteIndicatorStore.setIds(entityType, ids);
  }, [entityType, data?.entities]);
}
