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
}

/**
 * Child table configuration
 * Used for types: child, child_with_dictionary, child_view
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
  filter?: Record<string, any>;
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
  | 'child'                 // Simple child table
  | 'child_with_dictionary' // Child + dictionary merge
  | 'child_view'            // VIEW for partitioned tables
  | 'main_filtered'         // Main entity with filter
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
 * @example Child view (patrons with contact)
 * ```json
 * {
 *   "type": "child_view",
 *   "childTable": {
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

  /** Child table config (for child, child_with_dictionary, child_view) */
  childTable?: ChildTableConfig;

  /** Dictionary config (for child_with_dictionary) */
  dictionary?: DictionaryMergeConfig;

  /** Main entity config (for main_filtered) */
  mainEntity?: MainEntityConfig;

  /** RPC config (for rpc) */
  rpc?: RpcConfig;
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
 * Merged dictionary item with achievement status
 * Output format when dictionary.showAll is true
 */
export interface MergedDictionaryItem {
  /** Dictionary item ID */
  id: string;
  /** Dictionary item name */
  name: string;
  /** Additional fields from dictionary */
  [key: string]: any;
  /** Whether this item is achieved (has child record) */
  _achieved: boolean;
  /** The child record if achieved, null otherwise */
  _achievedRecord: any | null;
}

/**
 * Enriched child item with dictionary lookup
 * Output format when dictionary.showAll is false
 */
export interface EnrichedChildItem {
  /** Child record fields */
  [key: string]: any;
  /** Looked up dictionary data */
  _dictionary: {
    id: string;
    name: string;
    [key: string]: any;
  } | null;
}
