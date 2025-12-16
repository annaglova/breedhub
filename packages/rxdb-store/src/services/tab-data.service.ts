/**
 * TabDataService - Universal tab data loading orchestrator
 *
 * Routes to appropriate loading strategy based on dataSource config.
 * Maintains Local-First architecture: all data through RxDB.
 *
 * @see docs/TAB_DATA_SERVICE_ARCHITECTURE.md
 */

import { spaceStore, type OrderBy } from '../stores/space-store.signal-store';
import { dictionaryStore } from '../stores/dictionary-store.signal-store';
import type {
  DataSourceConfig,
  OrderConfig,
  MergedDictionaryItem,
  EnrichedChildItem,
  PaginationOptions,
  PaginatedResult,
} from '../types/tab-data.types';

class TabDataService {
  /**
   * Load tab data based on config
   *
   * Routes to appropriate loading strategy while maintaining Local-First.
   * Never calls Supabase directly - always through SpaceStore/DictionaryStore.
   *
   * @param parentId - Parent entity ID (e.g., breed ID)
   * @param dataSource - DataSource configuration from tab config
   * @returns Loaded and processed data array
   */
  async loadTabData(
    parentId: string,
    dataSource: DataSourceConfig
  ): Promise<any[]> {
    if (!parentId) {
      console.warn('[TabDataService] parentId is required');
      return [];
    }

    if (!dataSource || !dataSource.type) {
      console.warn('[TabDataService] dataSource with type is required');
      return [];
    }

    switch (dataSource.type) {
      case 'child':
        return this.loadChild(parentId, dataSource);

      case 'child_view':
        return this.loadChildView(parentId, dataSource);

      case 'child_with_dictionary':
        return this.loadChildWithDictionary(parentId, dataSource);

      case 'main_filtered':
        return this.loadMainFiltered(parentId, dataSource);

      case 'rpc':
        return this.loadRpc(parentId, dataSource);

      default:
        console.error(`[TabDataService] Unknown dataSource type: ${(dataSource as any).type}`);
        return [];
    }
  }

  /**
   * Load tab data with pagination support (ID-First architecture)
   *
   * Uses composite cursor for stable, consistent pagination.
   * Routes to appropriate loading strategy while maintaining Local-First.
   *
   * @param parentId - Parent entity ID (e.g., breed ID)
   * @param dataSource - DataSource configuration from tab config
   * @param pagination - Pagination options (cursor, limit)
   * @returns Paginated result with records, hasMore, nextCursor
   */
  async loadTabDataPaginated(
    parentId: string,
    dataSource: DataSourceConfig,
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<any>> {
    if (!parentId) {
      console.warn('[TabDataService] parentId is required');
      return { records: [], total: 0, hasMore: false, nextCursor: null };
    }

    if (!dataSource || !dataSource.type) {
      console.warn('[TabDataService] dataSource with type is required');
      return { records: [], total: 0, hasMore: false, nextCursor: null };
    }

    switch (dataSource.type) {
      case 'child':
        return this.loadChildPaginated(parentId, dataSource, pagination);

      case 'child_view':
        return this.loadChildViewPaginated(parentId, dataSource, pagination);

      case 'child_with_dictionary':
        // Dictionary merge doesn't support pagination (needs all records for merge)
        const dictResult = await this.loadChildWithDictionary(parentId, dataSource);
        return { records: dictResult, total: dictResult.length, hasMore: false, nextCursor: null };

      case 'main_filtered':
        return this.loadMainFilteredPaginated(parentId, dataSource, pagination);

      case 'rpc':
        // RPC doesn't support pagination
        const rpcResult = await this.loadRpc(parentId, dataSource);
        return { records: rpcResult, total: rpcResult.length, hasMore: false, nextCursor: null };

      default:
        console.error(`[TabDataService] Unknown dataSource type: ${(dataSource as any).type}`);
        return { records: [], total: 0, hasMore: false, nextCursor: null };
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Loading Strategies
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Type: child - Simple child table
   *
   * Loads child records directly from SpaceStore.
   * Data flow: SpaceStore.loadChildRecords() → RxDB → return
   */
  private async loadChild(
    parentId: string,
    dataSource: DataSourceConfig
  ): Promise<any[]> {
    const config = dataSource.childTable;

    if (!config) {
      console.error('[TabDataService] childTable config is required for type: child');
      return [];
    }

    return spaceStore.loadChildRecords(parentId, config.table, {
      limit: config.limit,
      orderBy: config.orderBy?.[0]?.field,
      orderDirection: config.orderBy?.[0]?.direction,
    });
  }

  /**
   * Type: child_view - VIEW for partitioned tables
   *
   * Same as child, but table is a VIEW with pre-joined data.
   * VIEW handles JOINs at database level (for partitioned tables).
   * Data flow: SpaceStore.loadChildRecords() → RxDB → return
   */
  private async loadChildView(
    parentId: string,
    dataSource: DataSourceConfig
  ): Promise<any[]> {
    // Implementation identical to child - VIEW is treated as regular table
    return this.loadChild(parentId, dataSource);
  }

  /**
   * Type: child - with ID-First pagination
   *
   * Uses SpaceStore.applyChildFilters() for proper cursor-based pagination.
   */
  private async loadChildPaginated(
    parentId: string,
    dataSource: DataSourceConfig,
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<any>> {
    const config = dataSource.childTable;

    if (!config) {
      console.error('[TabDataService] childTable config is required for type: child');
      return { records: [], total: 0, hasMore: false, nextCursor: null };
    }

    // Build OrderBy from config
    const orderBy: OrderBy = {
      field: config.orderBy?.[0]?.field || 'id',
      direction: config.orderBy?.[0]?.direction || 'asc',
      tieBreaker: { field: 'id', direction: 'asc' }
    };

    const finalLimit = pagination?.limit ?? config.limit ?? 30;
    console.log('[TabDataService] loadChildPaginated:', {
      paginationLimit: pagination?.limit,
      configLimit: config.limit,
      finalLimit,
      cursor: pagination?.cursor
    });

    // Use unified ID-First loading
    return spaceStore.applyChildFilters(
      parentId,
      config.table,
      {}, // No additional filters
      {
        limit: pagination?.limit ?? config.limit ?? 30,
        cursor: pagination?.cursor ?? null,
        orderBy,
      }
    );
  }

  /**
   * Type: child_view - Direct keyset pagination (NOT ID-First)
   *
   * VIEWs with JOINs are slow with `WHERE id IN (...)`.
   * Instead, use direct query with `WHERE parent_id = X` and cursor pagination.
   * This is more efficient because VIEW is optimized for parent_id filtering.
   */
  private async loadChildViewPaginated(
    parentId: string,
    dataSource: DataSourceConfig,
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<any>> {
    const config = dataSource.childTable;

    if (!config) {
      console.error('[TabDataService] childTable config is required for type: child_view');
      return { records: [], total: 0, hasMore: false, nextCursor: null };
    }

    const limit = pagination?.limit ?? config.limit ?? 30;
    const cursor = pagination?.cursor ?? null;
    const orderField = config.orderBy?.[0]?.field || 'placement';
    const orderDirection = config.orderBy?.[0]?.direction || 'asc';

    console.log('[TabDataService] loadChildViewPaginated (direct):', {
      table: config.table,
      parentId,
      limit,
      cursor,
      orderField
    });

    // Direct query to VIEW (more efficient than ID-First for JOINed VIEWs)
    return spaceStore.loadChildViewDirect(
      parentId,
      config.table,
      config.parentField,
      {
        limit,
        cursor,
        orderBy: {
          field: orderField,
          direction: orderDirection,
          tieBreaker: { field: 'id', direction: 'asc' }
        }
      }
    );
  }

  /**
   * Type: main_filtered - with ID-First pagination
   *
   * Uses SpaceStore.applyFilters() which already supports cursor pagination.
   */
  private async loadMainFilteredPaginated(
    parentId: string,
    dataSource: DataSourceConfig,
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<any>> {
    const config = dataSource.mainEntity;

    if (!config) {
      console.error('[TabDataService] mainEntity config is required for type: main_filtered');
      return { records: [], total: 0, hasMore: false, nextCursor: null };
    }

    return spaceStore.applyFilters(
      config.entity,
      { [config.filterField]: parentId },
      {
        limit: pagination?.limit ?? config.limit ?? 30,
        cursor: pagination?.cursor ?? null,
        orderBy: config.orderBy?.[0]
          ? {
              field: config.orderBy[0].field,
              direction: config.orderBy[0].direction,
              tieBreaker: { field: 'id', direction: 'asc' }
            }
          : undefined,
      }
    );
  }

  /**
   * Type: child_with_dictionary - Child + Dictionary merge
   *
   * Loads child records and dictionary, then merges based on config.
   * If showAll: true - returns all dictionary items with _achieved flag
   * If showAll: false - returns child records enriched with dictionary data
   *
   * Data flow:
   * 1. SpaceStore.loadChildRecords() → child records
   * 2. DictionaryStore.getDictionary() → dictionary items
   * 3. Merge/enrich based on showAll flag
   */
  private async loadChildWithDictionary(
    parentId: string,
    dataSource: DataSourceConfig
  ): Promise<MergedDictionaryItem[] | EnrichedChildItem[]> {
    const childConfig = dataSource.childTable;
    const dictConfig = dataSource.dictionary;

    if (!childConfig) {
      console.error('[TabDataService] childTable config is required for type: child_with_dictionary');
      return [];
    }

    if (!dictConfig) {
      console.error('[TabDataService] dictionary config is required for type: child_with_dictionary');
      return [];
    }

    if (!dictConfig.linkField) {
      console.error('[TabDataService] dictionary.linkField is required');
      return [];
    }

    // 1. Load child records via SpaceStore (Local-First)
    const childRecords = await spaceStore.loadChildRecords(
      parentId,
      childConfig.table,
      { limit: childConfig.limit || 100 }
    );

    // 2. Load dictionary via DictionaryStore (Local-First with ID-First)
    // Ensure DictionaryStore is initialized
    if (!dictionaryStore.initialized.value) {
      await dictionaryStore.initialize();
    }

    const { records: dictRecords } = await dictionaryStore.getDictionary(
      dictConfig.table,
      {
        idField: dictConfig.idField,
        nameField: dictConfig.nameField,
        additionalFields: dictConfig.additionalFields,
        limit: 200, // Dictionaries are usually small
      }
    );

    // 3. Apply dictionary filter (e.g., { entity: 'breed' })
    let filteredDict = dictRecords;
    if (dictConfig.filter && Object.keys(dictConfig.filter).length > 0) {
      filteredDict = this.applyFilter(dictRecords, dictConfig.filter);
    }

    // 4. Sort dictionary by orderBy
    if (dictConfig.orderBy && dictConfig.orderBy.length > 0) {
      filteredDict = this.sortRecords(filteredDict, dictConfig.orderBy);
    }

    // 5. Merge or enrich based on showAll flag
    if (dictConfig.showAll) {
      return this.mergeDictWithChildren(
        filteredDict,
        childRecords,
        dictConfig.linkField
      );
    }

    return this.enrichChildrenWithDict(
      childRecords,
      filteredDict,
      dictConfig.linkField
    );
  }

  /**
   * Type: main_filtered - Main entity with filter
   *
   * Queries main entity collection with filter by parent.
   * Uses SpaceStore.applyFilters() with ID-First pagination.
   *
   * Data flow: SpaceStore.applyFilters() → RxDB → return
   */
  private async loadMainFiltered(
    parentId: string,
    dataSource: DataSourceConfig
  ): Promise<any[]> {
    const config = dataSource.mainEntity;

    if (!config) {
      console.error('[TabDataService] mainEntity config is required for type: main_filtered');
      return [];
    }

    const result = await spaceStore.applyFilters(
      config.entity,
      { [config.filterField]: parentId },
      {
        limit: config.limit || 30,
        orderBy: config.orderBy?.[0]
          ? {
              field: config.orderBy[0].field,
              direction: config.orderBy[0].direction,
            }
          : undefined,
      }
    );

    return result.records || [];
  }

  /**
   * Type: rpc - Supabase RPC function
   *
   * Calls Supabase RPC for complex aggregations.
   * TODO: Add RxDB caching layer for RPC results
   */
  private async loadRpc(
    parentId: string,
    dataSource: DataSourceConfig
  ): Promise<any[]> {
    const config = dataSource.rpc;

    if (!config) {
      console.error('[TabDataService] rpc config is required for type: rpc');
      return [];
    }

    // Replace $parentId placeholder in params
    const params: Record<string, any> = {};
    if (config.params) {
      for (const [key, value] of Object.entries(config.params)) {
        params[key] = value === '$parentId' ? parentId : value;
      }
    }

    try {
      const { supabase } = await import('../supabase/client');
      const { data, error } = await supabase.rpc(config.function, params);

      if (error) {
        console.error(`[TabDataService] RPC error:`, error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error(`[TabDataService] RPC failed:`, error);
      return [];
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Helper Methods
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Apply filter to records
   *
   * Handles both flat records and DictionaryStore format (with `additional` field)
   */
  private applyFilter(
    records: any[],
    filter: Record<string, any>
  ): any[] {
    return records.filter((record) => {
      for (const [key, value] of Object.entries(filter)) {
        // Check in `additional` field first (DictionaryStore format)
        // Then check direct field
        const recordValue = record.additional?.[key] ?? record[key];
        if (recordValue !== value) {
          return false;
        }
      }
      return true;
    });
  }

  /**
   * Sort records by orderBy config
   *
   * Handles both flat records and DictionaryStore format (with `additional` field)
   */
  private sortRecords(
    records: any[],
    orderBy: OrderConfig[]
  ): any[] {
    return [...records].sort((a, b) => {
      for (const order of orderBy) {
        // Check in `additional` field first (DictionaryStore format)
        const aVal = a.additional?.[order.field] ?? a[order.field] ?? 0;
        const bVal = b.additional?.[order.field] ?? b[order.field] ?? 0;

        if (aVal !== bVal) {
          const comparison = aVal < bVal ? -1 : 1;
          return order.direction === 'asc' ? comparison : -comparison;
        }
      }
      return 0;
    });
  }

  /**
   * Merge dictionary with children (showAll: true)
   *
   * Returns all dictionary items with _achieved flag and _achievedRecord.
   * Used for tabs like achievements where we show all levels.
   */
  private mergeDictWithChildren(
    dictRecords: any[],
    childRecords: any[],
    linkField: string
  ): MergedDictionaryItem[] {
    // Build map of achieved items by dictionary ID
    const achievedMap = new Map<string, any>();

    for (const child of childRecords) {
      // linkField value is in `additional` (SpaceStore child format)
      const dictId = child.additional?.[linkField] ?? child[linkField];
      if (dictId) {
        achievedMap.set(dictId, child);
      }
    }

    // Map dictionary items with achieved status
    return dictRecords.map((dict) => {
      const achieved = achievedMap.get(dict.id);

      return {
        // Flatten dictionary data (id, name from dict, rest from additional)
        id: dict.id,
        name: dict.name,
        ...(dict.additional || {}),
        // Achievement status
        _achieved: !!achieved,
        _achievedRecord: achieved || null,
      };
    });
  }

  /**
   * Enrich children with dictionary data (showAll: false)
   *
   * Returns child records with _dictionary lookup attached.
   * Used for tabs where we only show achieved items with extra info.
   */
  private enrichChildrenWithDict(
    childRecords: any[],
    dictRecords: any[],
    linkField: string
  ): EnrichedChildItem[] {
    // Build map of dictionary items by ID
    const dictMap = new Map(dictRecords.map((d) => [d.id, d]));

    return childRecords.map((child) => {
      const dictId = child.additional?.[linkField] ?? child[linkField];
      const dict = dictId ? dictMap.get(dictId) : null;

      return {
        ...child,
        _dictionary: dict
          ? {
              id: dict.id,
              name: dict.name,
              ...(dict.additional || {}),
            }
          : null,
      };
    });
  }
}

// Singleton export
export const tabDataService = new TabDataService();
