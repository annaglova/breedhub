# Tab Data Service Architecture

**Created:** 2025-12-11
**Status:** Draft - Ready for Implementation

---

## Overview

TabDataService - окремий сервіс для універсального завантаження даних табів на основі конфігурації. Працює як orchestrator між SpaceStore та DictionaryStore, зберігаючи local-first архітектуру.

### Мотивація

**Проблема:**
- Кожен таб компонент має власну логіку завантаження даних
- Дублювання коду між компонентами
- Складно підтримувати консистентність
- Нові таби = новий код замість конфігурації

**Рішення:**
- Config-driven підхід: JSON конфіг визначає що і як завантажувати
- Єдиний сервіс обробляє всі типи табів
- Компоненти стають "тупими" - тільки рендеринг
- Local-first: все через RxDB, ніколи напряму в Supabase

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Tab Component                         │
│                  (BreedAchievementsTab, etc.)               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      useTabData Hook                         │
│                   (React hook wrapper)                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    TabDataService                            │
│              (Orchestrator - NEW)                            │
│                                                              │
│  - Parses dataSource config                                  │
│  - Routes to appropriate data loading strategy               │
│  - Merges data from multiple sources                         │
│  - Handles dictionary lookups                                │
└─────────────────────────────────────────────────────────────┘
                    │                   │
                    ▼                   ▼
┌──────────────────────────┐  ┌──────────────────────────┐
│      SpaceStore          │  │    DictionaryStore       │
│                          │  │                          │
│  - loadChildRecords()    │  │  - getDictionary()       │
│  - applyFilters()        │  │                          │
│  - getChildRecords()     │  │                          │
└──────────────────────────┘  └──────────────────────────┘
            │                           │
            ▼                           ▼
┌─────────────────────────────────────────────────────────────┐
│                         RxDB                                 │
│              (Local-First Cache)                             │
│                                                              │
│  breed_children, pet_children, dictionary collections        │
└─────────────────────────────────────────────────────────────┘
            │
            ▼ (ID-First: fetch missing only)
┌─────────────────────────────────────────────────────────────┐
│                       Supabase                               │
│                   (Source of Truth)                          │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Source Types

### 1. `child` - Simple Child Table

Прості дочірні записи без додаткових lookups.

```json
{
  "type": "child",
  "childTable": {
    "table": "breed_division",
    "parentField": "breed_id",
    "orderBy": [{ "field": "name", "direction": "asc" }],
    "limit": 50
  }
}
```

**Data Flow:**
```
SpaceStore.loadChildRecords() → RxDB breed_children → UI
```

**Use Cases:**
- breed_division
- breed_color
- Simple lists without lookups

---

### 2. `child_with_dictionary` - Child Table + Dictionary Merge

Дочірні записи з lookup в dictionary таблицю. Опціонально показує всі dictionary items з позначенням achieved.

```json
{
  "type": "child_with_dictionary",
  "childTable": {
    "table": "achievement_in_breed",
    "parentField": "breed_id"
  },
  "dictionary": {
    "table": "achievement",
    "idField": "id",
    "nameField": "name",
    "additionalFields": ["int_value", "position", "description", "entity"],
    "filter": { "entity": "breed" },
    "orderBy": [{ "field": "position", "direction": "asc" }],
    "showAll": true,
    "linkField": "achievement_id"
  }
}
```

**Data Flow:**
```
1. SpaceStore.loadChildRecords() → child records
2. DictionaryStore.getDictionary() → dictionary items
3. TabDataService.merge() → merged result with _achieved flag
```

**Output Format (when showAll: true):**
```typescript
[
  {
    id: "dict-1",
    name: "Bronze Level",
    int_value: 1000,
    position: 1,
    _achieved: true,
    _achievedRecord: { id: "child-1", date: "2024-01-15", ... }
  },
  {
    id: "dict-2",
    name: "Silver Level",
    int_value: 5000,
    position: 2,
    _achieved: false,
    _achievedRecord: null
  }
]
```

**Use Cases:**
- achievement_in_breed (support levels)
- badge_in_pet
- Any child table linked to dictionary

---

### 3. `child_view` - VIEW for Partitioned Tables

Для партиційованих таблиць де PostgREST не підтримує embedded resources. Використовує VIEW з pre-joined даними.

```json
{
  "type": "child_view",
  "childTable": {
    "table": "top_patron_in_breed_with_contact",
    "parentField": "breed_id",
    "orderBy": [{ "field": "placement", "direction": "asc" }],
    "limit": 20
  }
}
```

**Data Flow:**
```
SpaceStore.loadChildRecords() → RxDB (VIEW data with embedded contact) → UI
```

**VIEW Structure:**
```sql
CREATE VIEW top_patron_in_breed_with_contact AS
SELECT
  p.*,
  jsonb_build_object('id', c.id, 'name', c.name, ...) as contact
FROM top_patron_in_breed p
LEFT JOIN contact c ON c.id = p.contact_id;
```

**Use Cases:**
- top_patron_in_breed (partitioned)
- Any partitioned table needing JOINs

---

### 4. `main_filtered` - Main Entity with Filter

Запит до main entity колекції з фільтром по parent. Використовує існуючий `applyFilters()` з ID-First.

```json
{
  "type": "main_filtered",
  "mainEntity": {
    "entity": "kennel",
    "filterField": "top_breed_id",
    "orderBy": [{ "field": "rating", "direction": "desc" }],
    "limit": 10
  }
}
```

**Data Flow:**
```
SpaceStore.applyFilters('kennel', { top_breed_id: parentId }) → RxDB kennel → UI
```

**Use Cases:**
- Top Kennels for breed
- Top Pets for breed
- Related main entities

---

### 5. `rpc` - Supabase RPC Function

Для складних aggregations або computed data через SQL функції.

```json
{
  "type": "rpc",
  "rpc": {
    "function": "get_breed_statistics",
    "params": {
      "p_breed_id": "$parentId"
    },
    "cacheKey": "breed_stats",
    "cacheTTL": 300
  }
}
```

**Data Flow:**
```
Supabase RPC → Cache in RxDB (optional) → UI
```

**Use Cases:**
- Statistics tab
- Aggregated reports
- Complex computed data

---

## TypeScript Interfaces

```typescript
// packages/rxdb-store/src/types/tab-data.types.ts

/**
 * Order configuration
 */
interface OrderConfig {
  field: string;
  direction: 'asc' | 'desc';
}

/**
 * Child table configuration
 */
interface ChildTableConfig {
  /** Table name (or VIEW name) */
  table: string;
  /** Field linking to parent entity */
  parentField: string;
  /** Fields to select (optional, default: all) */
  select?: string[];
  /** Ordering */
  orderBy?: OrderConfig[];
  /** Limit records */
  limit?: number;
}

/**
 * Dictionary configuration for merge operations
 */
interface DictionaryConfig {
  /** Dictionary table name */
  table: string;
  /** ID field (default: 'id') */
  idField?: string;
  /** Name field (default: 'name') */
  nameField?: string;
  /** Additional fields to fetch */
  additionalFields?: string[];
  /** Filter to apply on dictionary */
  filter?: Record<string, any>;
  /** Ordering for dictionary items */
  orderBy?: OrderConfig[];
  /** Show all dictionary items (mark achieved) vs only achieved */
  showAll?: boolean;
  /** Field in child table that links to dictionary ID */
  linkField: string;
}

/**
 * Main entity filter configuration
 */
interface MainEntityConfig {
  /** Entity type (e.g., 'kennel', 'pet') */
  entity: string;
  /** Field that references parent entity */
  filterField: string;
  /** Ordering */
  orderBy?: OrderConfig[];
  /** Limit records */
  limit?: number;
}

/**
 * RPC configuration
 */
interface RpcConfig {
  /** Supabase function name */
  function: string;
  /** Parameters ($parentId will be replaced) */
  params?: Record<string, string>;
  /** Cache key prefix */
  cacheKey?: string;
  /** Cache TTL in seconds */
  cacheTTL?: number;
}

/**
 * Main DataSource configuration
 */
interface DataSourceConfig {
  /** Type determines loading strategy */
  type: 'child' | 'child_with_dictionary' | 'child_view' | 'main_filtered' | 'rpc';

  /** Child table config (for child, child_with_dictionary, child_view) */
  childTable?: ChildTableConfig;

  /** Dictionary config (for child_with_dictionary) */
  dictionary?: DictionaryConfig;

  /** Main entity config (for main_filtered) */
  mainEntity?: MainEntityConfig;

  /** RPC config (for rpc) */
  rpc?: RpcConfig;
}

/**
 * Result from useTabData hook
 */
interface TabDataResult<T = any> {
  data: T[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Options for useTabData hook
 */
interface UseTabDataOptions {
  parentId: string | null | undefined;
  dataSource: DataSourceConfig;
  enabled?: boolean;
}
```

---

## TabDataService Implementation

```typescript
// packages/rxdb-store/src/services/tab-data.service.ts

import { spaceStore } from '../stores/space-store.signal-store';
import { dictionaryStore } from '../stores/dictionary-store.signal-store';
import type { DataSourceConfig } from '../types/tab-data.types';

class TabDataService {

  /**
   * Load tab data based on config
   * Routes to appropriate loading strategy
   */
  async loadTabData(
    parentId: string,
    dataSource: DataSourceConfig
  ): Promise<any[]> {

    if (!parentId) {
      console.warn('[TabDataService] parentId is required');
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
   * Type: child - Simple child table
   */
  private async loadChild(parentId: string, dataSource: DataSourceConfig): Promise<any[]> {
    const config = dataSource.childTable!;

    return spaceStore.loadChildRecords(parentId, config.table, {
      limit: config.limit,
      orderBy: config.orderBy?.[0]?.field,
      orderDirection: config.orderBy?.[0]?.direction
    });
  }

  /**
   * Type: child_view - VIEW for partitioned tables
   * Same as child, but table is a VIEW with embedded data
   */
  private async loadChildView(parentId: string, dataSource: DataSourceConfig): Promise<any[]> {
    // Implementation identical to child - VIEW is treated as regular table
    return this.loadChild(parentId, dataSource);
  }

  /**
   * Type: child_with_dictionary - Child + Dictionary merge
   */
  private async loadChildWithDictionary(parentId: string, dataSource: DataSourceConfig): Promise<any[]> {
    const childConfig = dataSource.childTable!;
    const dictConfig = dataSource.dictionary!;

    // 1. Load child records via SpaceStore (Local-First)
    const childRecords = await spaceStore.loadChildRecords(
      parentId,
      childConfig.table,
      { limit: childConfig.limit || 100 }
    );

    // 2. Load dictionary via DictionaryStore (Local-First)
    const { records: dictRecords } = await dictionaryStore.getDictionary(
      dictConfig.table,
      {
        idField: dictConfig.idField,
        nameField: dictConfig.nameField,
        additionalFields: dictConfig.additionalFields,
        limit: 200 // Dictionaries are usually small
      }
    );

    // 3. Apply dictionary filter (e.g., { entity: 'breed' })
    let filteredDict = dictRecords;
    if (dictConfig.filter) {
      filteredDict = this.applyFilter(dictRecords, dictConfig.filter);
    }

    // 4. Sort dictionary by orderBy
    if (dictConfig.orderBy && dictConfig.orderBy.length > 0) {
      filteredDict = this.sortRecords(filteredDict, dictConfig.orderBy);
    }

    // 5. Merge based on showAll flag
    if (dictConfig.showAll) {
      return this.mergeDictWithChildren(
        filteredDict,
        childRecords,
        dictConfig.linkField
      );
    }

    // If not showAll, just return child records with dictionary lookup
    return this.enrichChildrenWithDict(childRecords, filteredDict, dictConfig.linkField);
  }

  /**
   * Type: main_filtered - Main entity with filter
   */
  private async loadMainFiltered(parentId: string, dataSource: DataSourceConfig): Promise<any[]> {
    const config = dataSource.mainEntity!;

    const result = await spaceStore.applyFilters(
      config.entity,
      { [config.filterField]: parentId },
      {
        limit: config.limit || 30,
        orderBy: config.orderBy?.[0] ? {
          field: config.orderBy[0].field,
          direction: config.orderBy[0].direction
        } : undefined
      }
    );

    return result.records || [];
  }

  /**
   * Type: rpc - Supabase RPC function
   */
  private async loadRpc(parentId: string, dataSource: DataSourceConfig): Promise<any[]> {
    const config = dataSource.rpc!;

    // Replace $parentId in params
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

  // ─────────────────────────────────────────────────────────────
  // Helper Methods
  // ─────────────────────────────────────────────────────────────

  /**
   * Apply filter to records
   */
  private applyFilter(records: any[], filter: Record<string, any>): any[] {
    return records.filter(record => {
      for (const [key, value] of Object.entries(filter)) {
        // Check in additional field (DictionaryStore format)
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
   */
  private sortRecords(records: any[], orderBy: Array<{ field: string; direction: 'asc' | 'desc' }>): any[] {
    return [...records].sort((a, b) => {
      for (const order of orderBy) {
        // Check in additional field first (DictionaryStore format)
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
   * Returns all dictionary items with _achieved flag
   */
  private mergeDictWithChildren(
    dictRecords: any[],
    childRecords: any[],
    linkField: string
  ): any[] {
    // Build map of achieved items by dictionary ID
    const achievedMap = new Map<string, any>();

    for (const child of childRecords) {
      // linkField value is in additional (e.g., additional.achievement_id)
      const dictId = child.additional?.[linkField] ?? child[linkField];
      if (dictId) {
        achievedMap.set(dictId, child);
      }
    }

    // Map dictionary items with achieved status
    return dictRecords.map(dict => {
      const achieved = achievedMap.get(dict.id);
      return {
        // Flatten dictionary data
        id: dict.id,
        name: dict.name,
        ...dict.additional,
        // Achievement status
        _achieved: !!achieved,
        _achievedRecord: achieved || null
      };
    });
  }

  /**
   * Enrich children with dictionary data (showAll: false)
   */
  private enrichChildrenWithDict(
    childRecords: any[],
    dictRecords: any[],
    linkField: string
  ): any[] {
    const dictMap = new Map(dictRecords.map(d => [d.id, d]));

    return childRecords.map(child => {
      const dictId = child.additional?.[linkField] ?? child[linkField];
      const dict = dictId ? dictMap.get(dictId) : null;

      return {
        ...child,
        _dictionary: dict ? {
          id: dict.id,
          name: dict.name,
          ...dict.additional
        } : null
      };
    });
  }
}

// Singleton export
export const tabDataService = new TabDataService();
```

---

## useTabData Hook

```typescript
// packages/rxdb-store/src/hooks/useTabData.ts

import { useState, useEffect, useCallback, useRef } from 'react';
import { tabDataService } from '../services/tab-data.service';
import { spaceStore } from '../stores/space-store.signal-store';
import type { DataSourceConfig, TabDataResult, UseTabDataOptions } from '../types/tab-data.types';

/**
 * Universal hook for loading tab data from config
 *
 * Uses TabDataService to route to appropriate loading strategy
 * while maintaining Local-First architecture (all data through RxDB)
 *
 * @example
 * ```tsx
 * const { data, isLoading, error } = useTabData({
 *   parentId: breedId,
 *   dataSource: tabConfig.dataSource,
 *   enabled: !!breedId
 * });
 * ```
 */
export function useTabData<T = any>({
  parentId,
  dataSource,
  enabled = true
}: UseTabDataOptions): TabDataResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const loadingRef = useRef(false);
  const mountedRef = useRef(true);

  const loadData = useCallback(async () => {
    // Skip if disabled or missing required params
    if (!enabled || !parentId || !dataSource) {
      setData([]);
      setIsLoading(false);
      return;
    }

    // Prevent duplicate loads
    if (loadingRef.current) {
      return;
    }

    loadingRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      // Wait for SpaceStore initialization
      let retries = 20;
      while (!spaceStore.initialized.value && retries > 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
        retries--;
      }

      if (!spaceStore.initialized.value) {
        throw new Error('SpaceStore not initialized');
      }

      // Load data via TabDataService
      const records = await tabDataService.loadTabData(parentId, dataSource);

      if (mountedRef.current) {
        setData(records as T[]);
        setIsLoading(false);
      }
    } catch (err) {
      console.error('[useTabData] Error:', err);
      if (mountedRef.current) {
        setError(err as Error);
        setIsLoading(false);
      }
    } finally {
      loadingRef.current = false;
    }
  }, [parentId, dataSource, enabled]);

  // Load on mount and when params change
  useEffect(() => {
    mountedRef.current = true;
    loadData();

    return () => {
      mountedRef.current = false;
    };
  }, [loadData]);

  // Manual refetch
  const refetch = useCallback(async () => {
    loadingRef.current = false;
    await loadData();
  }, [loadData]);

  return {
    data,
    isLoading,
    error,
    refetch
  };
}
```

---

## Usage Examples

### Before (Manual Logic)

```tsx
// BreedAchievementsTab.tsx - BEFORE (много кода)
export function BreedAchievementsTab() {
  // 1. Load children manually
  const { data: childRecords } = useChildRecords({
    parentId: breedId,
    tableType: 'achievement_in_breed'
  });

  // 2. Load dictionary manually
  const [dictRecords, setDictRecords] = useState([]);
  useEffect(() => {
    dictionaryStore.getDictionary('achievement', {
      additionalFields: ['int_value', 'position', 'description', 'entity']
    }).then(({ records }) => {
      const filtered = records.filter(r => r.additional?.entity === 'breed');
      setDictRecords(filtered);
    });
  }, []);

  // 3. Merge manually
  const achievements = useMemo(() => {
    // ... 30 lines of merge logic
  }, [childRecords, dictRecords]);

  return <Timeline items={achievements} />;
}
```

### After (Config-Driven)

```tsx
// BreedAchievementsTab.tsx - AFTER (clean)
export function BreedAchievementsTab({ dataSource }: { dataSource: DataSourceConfig }) {
  const { data, isLoading, error } = useTabData({
    parentId: breedId,
    dataSource,
    enabled: !!breedId
  });

  if (isLoading) return <Loader />;
  if (error) return <Error message={error.message} />;

  // data is already merged and ready!
  const timelineItems = data.map(item => ({
    id: item.id,
    title: item.name,
    active: item._achieved,
    date: item._achievedRecord?.additional?.date
  }));

  return <Timeline items={timelineItems} />;
}
```

### Tab Config (JSON)

```json
{
  "slug": "achievements",
  "component": "BreedAchievementsTab",
  "dataSource": {
    "type": "child_with_dictionary",
    "childTable": {
      "table": "achievement_in_breed",
      "parentField": "breed_id"
    },
    "dictionary": {
      "table": "achievement",
      "additionalFields": ["int_value", "position", "description", "entity"],
      "filter": { "entity": "breed" },
      "orderBy": [{ "field": "position", "direction": "asc" }],
      "showAll": true,
      "linkField": "achievement_id"
    }
  }
}
```

---

## File Structure

```
packages/rxdb-store/src/
├── services/
│   └── tab-data.service.ts     ← NEW: Orchestrator service
├── hooks/
│   └── useTabData.ts           ← NEW: React hook
├── types/
│   └── tab-data.types.ts       ← NEW: TypeScript interfaces
├── stores/
│   ├── space-store.signal-store.ts    ← Existing (unchanged)
│   └── dictionary-store.signal-store.ts ← Existing (unchanged)
└── index.ts                    ← Export new items
```

---

## Key Principles

### 1. Local-First Always
```
TabDataService → SpaceStore/DictionaryStore → RxDB → (Supabase if needed)
```
Never direct Supabase calls from TabDataService.

### 2. Config-Driven
All tab behavior defined in JSON config. No hardcoded logic in components.

### 3. Single Responsibility
- **SpaceStore**: Entity data, child records, ID-First loading
- **DictionaryStore**: Dictionary lookups, ID-First with staleness
- **TabDataService**: Orchestration, merging, routing

### 4. Incremental Adoption
Existing tabs can migrate gradually. Old `useChildRecords` still works.

---

## Migration Path

1. **Phase 1**: Create TabDataService + useTabData (this doc)
2. **Phase 2**: Migrate BreedAchievementsTab to use new approach
3. **Phase 3**: Migrate BreedPatronsTab (needs VIEW migration first)
4. **Phase 4**: Migrate remaining tabs
5. **Phase 5**: Remove old manual logic from components

---

## Related Documents

- [CORE_PRINCIPLES.md](./CORE_PRINCIPLES.md) - Local-First architecture
- [CHILD_TABLES_ARCHITECTURE.md](./CHILD_TABLES_ARCHITECTURE.md) - Child collections
- [ID_FIRST_PAGINATION.md](./ID_FIRST_PAGINATION.md) - ID-First pattern
- [TAB_DATA_SERVICE_TODO.md](./TAB_DATA_SERVICE_TODO.md) - Implementation checklist
