export interface WireReconnectRefreshOptions<TStore> {
  syncQueueService: {
    onReconnect: (handler: () => void) => void;
  };
  entityStores: Map<string, TStore>;
  hasActiveData: (entityType: string, store: TStore) => boolean;
  refreshEntity: (entityType: string) => void;
  logPrefix?: string;
}

export function wireReconnectRefresh<TStore>(
  options: WireReconnectRefreshOptions<TStore>,
): void {
  const logPrefix = options.logPrefix || "[SpaceStore]";

  options.syncQueueService.onReconnect(() => {
    for (const [entityType, store] of options.entityStores.entries()) {
      if (!options.hasActiveData(entityType, store)) {
        continue;
      }

      console.log(`${logPrefix} Reconnect refresh: ${entityType}`);
      options.refreshEntity(entityType);
    }
  });
}
