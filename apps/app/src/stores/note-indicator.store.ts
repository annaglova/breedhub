import { signal } from "@preact/signals-react";

const state = signal<Record<string, Set<string>>>({});

export const noteIndicatorStore = {
  state,
  setIds(entityType: string, ids: Set<string>) {
    state.value = { ...state.value, [entityType]: ids };
  },
  has(entityType: string, entityId: string): boolean {
    return state.value[entityType]?.has(entityId) ?? false;
  },
};
