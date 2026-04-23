/**
 * Tab Data Types
 *
 * Config-driven data loading for tabs.
 * TabDataService reads config and routes to appropriate loading strategy.
 *
 * @see docs/TAB_DATA_SERVICE_ARCHITECTURE.md
 */

/**
 * Order configuration for sorting
 */
export interface OrderConfig {
  /** Field name to sort by */
  field: string;
  /** Sort direction */
  direction: 'asc' | 'desc';
  /**
   * Optional tie-breaker for stable keyset pagination when the primary
   * order field has duplicates. Required for VIEWs that don't expose an
   * `id` column (otherwise Supabase returns 42703 on
   * `.order('id', ...)`). For tables it defaults to `id` downstream.
   */
  tieBreaker?: {
    field: string;
    direction?: 'asc' | 'desc';
  };
}

/**
 * Child table configuration
 * Used for types: child, child_with_dictionary
 */
export interface ChildTableConfig {
  /** Table name (or VIEW name for partitioned tables) */
  table: string;
  /** Field linking to parent entity (e.g., 'breed_id') */
  parentField: string;
  /** Fields to select (optional, default: all) */
  select?: string[];
  /** Ordering configuration */
  orderBy?: OrderConfig[];
  /** Limit records (default: 50) */
  limit?: number;
  /** Whether this table is a database VIEW (uses direct keyset pagination instead of ID-First) */
  isView?: boolean;
}

/**
 * Mapping table configuration for entity_child fast-path loading.
 * Used when entity rows are reached through a separate mapping table.
 *
 * Convention: mapping table columns reference the target entity as
 * `{entity}_id` + optional `{entity}_breed_id` (child mapping standard).
 * Caller must specify both names explicitly — no hardcoded fallbacks.
 */
export interface ReadFromConfig {
  /** Mapping table name (e.g., 'pet_child', 'pet_in_litter') */
  table: string;
  /** Field in mapping table that points to parent entity (e.g., 'parent_id', 'litter_id') */
  parentField: string;
  /** Column in mapping row holding the target entity id (e.g., 'pet_id') */
  entityIdField: string;
  /** Column in mapping row holding the target entity partition value (e.g., 'pet_breed_id') */
  entityPartitionField?: string;
}

/**
 * Dictionary configuration for merge operations
 * Used for type: child_with_dictionary
 */
export interface DictionaryMergeConfig {
  /** Dictionary table name */
  table: string;
  /** ID field in dictionary (default: 'id') */
  idField?: string;
  /** Name field in dictionary (default: 'name') */
  nameField?: string;
  /** Additional fields to fetch from dictionary */
  additionalFields?: string[];
  /** Filter to apply on dictionary records */
  filter?: Record<string, unknown>;
  /** Ordering for dictionary items */
  orderBy?: OrderConfig[];
  /**
   * Show all dictionary items with achieved status (true)
   * vs only return achieved child records (false)
   */
  showAll?: boolean;
  /** Field in child table that links to dictionary ID (e.g., 'achievement_id') */
  linkField: string;
}

/**
 * Main entity filter configuration
 * Used for type: main_filtered
 */
export interface MainEntityConfig {
  /** Entity type (e.g., 'kennel', 'pet') */
  entity: string;
  /** Field that references parent entity */
  filterField: string;
  /** Ordering configuration */
  orderBy?: OrderConfig[];
  /** Limit records (default: 30) */
  limit?: number;
}

/**
 * RPC configuration for Supabase functions
 * Used for type: rpc
 */
export interface RpcConfig {
  /** Supabase RPC function name */
  function: string;
  /** Parameters map ($parentId will be replaced with actual parentId) */
  params?: Record<string, string>;
  /** Cache key prefix for RxDB storage */
  cacheKey?: string;
  /** Cache TTL in seconds */
  cacheTTL?: number;
}

/**
 * DataSource type determines loading strategy
 */
export type DataSourceType =
  | 'child'                 // Simple child table (set isView: true for VIEWs)
  | 'child_with_dictionary' // Child + dictionary merge
  | 'main_filtered'         // Main entity with filter
  | 'entity_child'          // Entity record linked via parent field (e.g., pet children via father_id/mother_id)
  | 'rpc';                  // Supabase RPC function

/**
 * Main DataSource configuration
 *
 * @example Child with dictionary (achievements)
 * ```json
 * {
 *   "type": "child_with_dictionary",
 *   "childTable": {
 *     "table": "achievement_in_breed",
 *     "parentField": "breed_id"
 *   },
 *   "dictionary": {
 *     "table": "achievement",
 *     "additionalFields": ["int_value", "position", "description", "entity"],
 *     "filter": { "entity": "breed" },
 *     "orderBy": [{ "field": "position", "direction": "asc" }],
 *     "showAll": true,
 *     "linkField": "achievement_id"
 *   }
 * }
 * ```
 *
 * @example Child view (patrons with contact) - uses isView flag for direct keyset pagination
 * ```json
 * {
 *   "type": "child",
 *   "childTable": {
 *     "isView": true,
 *     "table": "top_patron_in_breed_with_contact",
 *     "parentField": "breed_id",
 *     "orderBy": [{ "field": "placement", "direction": "asc" }],
 *     "limit": 20
 *   }
 * }
 * ```
 */
export interface DataSourceConfig {
  /** Type determines loading strategy */
  type: DataSourceType;

  /** Child table config (for child, child_with_dictionary, entity_child) */
  childTable?: ChildTableConfig;

  /** Mapping table config for entity_child fast path */
  readFrom?: ReadFromConfig;

  /** Dictionary config (for child_with_dictionary) */
  dictionary?: DictionaryMergeConfig;

  /** Main entity config (for main_filtered) */
  mainEntity?: MainEntityConfig;

  /** RPC config (for rpc) */
  rpc?: RpcConfig;

  /**
   * Auto-fill fields when creating records (for entity_child).
   * Keys are target field names, values use "$parent.fieldName" to resolve from parent entity.
   * Example: { "father_breed_id": "$parent.breed_id", "pet_type_id": "$parent.pet_type_id" }
   */
  prefill?: Record<string, string>;
}

/**
 * Result from useTabData hook
 */
export interface TabDataResult<T = any> {
  /** Loaded data array */
  data: T[];
  /** Loading state */
  isLoading: boolean;
  /** Error if any */
  error: Error | null;
  /** Manual refetch function */
  refetch: () => Promise<void>;
}

/**
 * Options for useTabData hook
 */
export interface UseTabDataOptions {
  /** Parent entity ID (e.g., breed ID) */
  parentId: string | null | undefined;
  /** DataSource configuration from tab config */
  dataSource: DataSourceConfig;
  /** Enable/disable the hook (default: true) */
  enabled?: boolean;
}

/**
 * Generic tab-data record shape.
 * Used when service orchestration knows it's working with object rows,
 * but the exact entity schema is config-driven.
 */
export interface TabDataRecord extends Record<string, unknown> {}

/**
 * Child-table row shape returned by SpaceStore child loaders.
 */
export interface ChildTabDataRecord extends TabDataRecord {
  id: string;
  additional?: Record<string, unknown> & {
    date?: string;
  };
}

/**
 * Dictionary row shape returned by DictionaryStore.
 */
export interface DictionaryTabDataRecord extends TabDataRecord {
  id: string;
  name: string;
  additional?: Record<string, unknown>;
}

/**
 * Flattened dictionary payload attached to enriched child rows.
 */
export interface EnrichedDictionaryValue extends TabDataRecord {
  id: string;
  name: string;
}

/**
 * Merged dictionary item with achievement status
 * Output format when dictionary.showAll is true
 */
export interface MergedDictionaryItem extends TabDataRecord {
  /** Dictionary item ID */
  id: string;
  /** Dictionary item name */
  name: string;
  /** Common flattened dictionary fields used by timeline/support tabs */
  description?: string;
  int_value?: number;
  /** Whether this item is achieved (has child record) */
  _achieved: boolean;
  /** The child record if achieved, null otherwise */
  _achievedRecord: ChildTabDataRecord | null;
}

/**
 * Enriched child item with dictionary lookup
 * Output format when dictionary.showAll is false
 */
export interface EnrichedChildItem extends ChildTabDataRecord {
  /** Looked up dictionary data */
  _dictionary: EnrichedDictionaryValue | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Pagination Types (ID-First Architecture)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Pagination options for ID-First loading
 */
export interface PaginationOptions {
  /** Number of records per page (default: 30) */
  limit?: number;
  /** Composite cursor as JSON string (from previous page) */
  cursor?: string | null;
}

/**
 * Paginated result from ID-First loading
 */
export interface PaginatedResult<T = any> {
  /** Records for current page */
  records: T[];
  /** Total count (may be approximate) */
  total: number;
  /** Whether more records are available */
  hasMore: boolean;
  /** Cursor for next page (JSON string) */
  nextCursor: string | null;
}

/**
 * Result from useInfiniteTabData hook
 */
export interface InfiniteTabDataResult<T = any> {
  /** Accumulated data from all loaded pages */
  data: T[];
  /** Initial loading state (first page) */
  isLoading: boolean;
  /** Loading more state (subsequent pages) */
  isLoadingMore: boolean;
  /** Whether more records are available */
  hasMore: boolean;
  /** Error if any */
  error: Error | null;
  /** Total records loaded */
  total: number;
  /** Load next page */
  loadMore: () => Promise<void>;
  /** Reset and reload from beginning */
  refetch: () => Promise<void>;
}

/**
 * Options for useInfiniteTabData hook
 */
export interface UseInfiniteTabDataOptions extends UseTabDataOptions {
  /** Records per page (default: 30) */
  pageSize?: number;
}
