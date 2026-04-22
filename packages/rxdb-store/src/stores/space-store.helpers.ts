export interface WireReconnectRefreshOptions<TStore> {
  syncQueueService: {
    onReconnect: (handler: () => void) => void;
  };
  entityStores: Map<string, TStore>;
  hasActiveData: (entityType: string, store: TStore) => boolean;
  refreshEntity: (entityType: string) => void;
  logPrefix?: string;
}

interface MaybeSingleResult<TData> {
  data: TData | null;
  error: unknown;
}

interface FetchEntityBySlugQuery<TData> {
  eq(column: string, value: unknown): FetchEntityBySlugQuery<TData>;
  or(condition: string): FetchEntityBySlugQuery<TData>;
  maybeSingle(): PromiseLike<MaybeSingleResult<TData>>;
}

interface FetchEntityBySlugSelectBuilder<TData> {
  select(columns: string): FetchEntityBySlugQuery<TData>;
}

export interface FetchEntityBySlugSupabaseClient {
  from(table: string): FetchEntityBySlugSelectBuilder<Record<string, unknown>>;
}

interface RouteLookupRecord {
  entity_id?: string | null;
  entity_partition_id?: string | null;
  partition_field?: string | null;
}

export interface FetchEntityBySlugFlowOptions<TRecord> {
  supabase: unknown;
  entityType: string;
  slug: string;
  loadCachedBySlug: (entityType: string, slug: string) => Promise<TRecord | null>;
  loadEntityById: (
    entityType: string,
    id: string,
    partitionId?: string,
    partitionField?: string,
  ) => Promise<TRecord | null>;
  cacheEntity: (
    entityType: string,
    data: Record<string, unknown>,
  ) => Promise<void>;
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

export async function fetchEntityBySlugFlow<TRecord>(
  options: FetchEntityBySlugFlowOptions<TRecord>,
): Promise<TRecord | null> {
  const supabase = options.supabase as FetchEntityBySlugSupabaseClient;
  const cached = await options.loadCachedBySlug(options.entityType, options.slug);
  if (cached) {
    return cached;
  }

  try {
    const { data: routeData, error } = await supabase
      .from("routes")
      .select("entity_id, entity_partition_id, partition_field")
      .eq("slug", options.slug)
      .maybeSingle();
    const route = routeData as RouteLookupRecord | null;

    if (error) {
      throw error;
    }

    if (route?.entity_id) {
      const data = await options.loadEntityById(
        options.entityType,
        route.entity_id,
        route.entity_partition_id ?? undefined,
        route.partition_field ?? undefined,
      );

      if (data) {
        return data;
      }
    }
  } catch (err) {
    console.warn("[SpaceStore] Route lookup failed, falling back to slug query:", err);
  }

  try {
    const { data, error } = await supabase
      .from(options.entityType)
      .select("*")
      .eq("slug", options.slug)
      .or("deleted.is.null,deleted.eq.false")
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    await options.cacheEntity(options.entityType, data);
    return data as TRecord;
  } catch (err) {
    console.error("[SpaceStore] Error fetching by slug from Supabase:", err);
    return null;
  }
}
