# [ARCHIVED] Dictionary Loading Strategy

> ⚠️ **СТАТУС: АРХІВНИЙ** - Документ виконав свою роль
>
> **Дата архівації:** 2024-11-25
>
> **Причина:** Детальна історія еволюції від offset до ID-First pagination.
> Всі core principles перенесені в [CORE_PRINCIPLES.md](./CORE_PRINCIPLES.md),
> практичні приклади в [STORE_CREATION_GUIDE.md](./STORE_CREATION_GUIDE.md),
> архітектурні деталі в [SPACE_STORE_ARCHITECTURE.md](./SPACE_STORE_ARCHITECTURE.md).

---

**Generated:** 2024-10-06
**Updated:** 2024-10-21

## Executive Summary

**Simple On-Demand Approach:** No pre-analysis needed. When user interacts with a DropdownInput/LookupInput:
1. Check RxDB cache
2. If not found → fetch from API
3. Save to RxDB
4. Return to UI

**Storage:**
- **Dictionaries** → ONE universal RxDB collection with composite keys (`table_name::id`)
- **Child tables** → Separate RxDB collections (varied schemas, loaded with parent)
- **Main entities** → Entity-specific collections (breed, animal, account), use SpaceStore.applyFilters()

**Key Principle:** Don't overthink it. Let the UI drive what gets cached.

---

## ⚠️ CRITICAL UPDATE (2025-10-21): ID-First Pagination

**Problem Discovered:** Partial cache + pagination = missing records!

**Symptom:**
- При scroll: 422 з 452 records (missing 30)
- При reload: 451 замість 452
- RxDB має partial cache з mixed ORDER BY
- Offset і Cursor обидва НЕ працюють з partial cache

**Solution:** **ID-First Pagination**

```typescript
// 1. Fetch IDs first (lightweight ~1KB)
const ids = await supabase.select('id, name').order(name).limit(30);

// 2. Check cache
const cached = await rxdb.find({ id: { $in: ids } });

// 3. Fetch only missing
const missing = ids.filter(id => !cached.has(id));
const fresh = await supabase.select('*').in('id', missing);

// 4. Merge
return [...cached, ...fresh].sort(by IDs order);
```

**📖 Детальна документація:** `/docs/ID_FIRST_PAGINATION.md`

**Benefits:**
- ✅ 452/452 records завжди (100% correctness)
- ✅ 70% traffic reduction (intelligent cache reuse)
- ✅ Works with ANY ORDER BY
- ✅ Works with millions of records + filters

**Impact:**
- ✅ SpaceStore.applyFilters - використовує ID-first
- ✅ LookupInput - simplified (trust SpaceStore)
- ⏳ DictionaryStore - optional migration

---

## 🔄 Main Entities Pattern (ID-First)

**Main entities use ID-First approach for optimal cache reuse:**

**SpaceStore.applyFilters:**
```typescript
applyFilters(entityType, filters, {
  limit: 30,
  cursor: 'BOXER',
  orderBy: { field: 'name', direction: 'asc' }
})
  → Fetch IDs from Supabase (WHERE name > 'BOXER')
  → Check RxDB cache by IDs
  → Fetch missing full records
  → Cache in RxDB
  → Return merged results
```

**Why Caching is Critical:**
- Tables: millions of records
- User filters: space_id → hundreds of records
- RxDB cache: intelligent partial cache
- Progressive: cache hit rate grows (0% → 97%)
- **Traffic reduction: 70%** ✅

### LookupInput Modes

**Dictionary mode (default):**
```typescript
<LookupInput
  referencedTable="pet_type"
  // Використовує DictionaryStore
/>
```

**Collection mode (main entities with ID-first):**
```typescript
<LookupInput
  dataSource="collection"
  referencedTable="breed"
  // Використовує SpaceStore.applyFilters()
  // ID-first pagination ✅
/>
```

---

## 1. Data Source Strategy

### 1.1 Config-Driven Approach

Each field with foreign key has **optional** `dataSource` property:

```json
{
  "name": "account_id",
  "component": "LookupInput",
  "referencedTable": "account",
  "dataSource": "collection"  // ← Explicitly: use RxDB collection
}

{
  "name": "pet_type_id",
  "component": "DropdownInput",
  "referencedTable": "pet_type"
  // No dataSource → default to "dictionary"
}
```

### 1.2 Data Source Types

| dataSource | Behavior | Use Case | Example Tables |
|------------|----------|----------|----------------|
| `"collection"` | Use existing RxDB collection | Main entities | breed, pet, account, contact |
| **not specified** | Use DictionaryStore (cache) | Dictionaries | pet_type, country, currency |

**Note:** `"server-search"` support will be added later when implementing edit forms.

### 1.3 Component Behavior

| Component | Default dataSource | Typical Usage |
|-----------|-------------------|---------------|
| **DropdownInput** | `"dictionary"` | Small dictionaries (< 1000 records) |
| **LookupInput** | `"collection"` | Main entities with search |

**Rule:**
- If `dataSource: "collection"` → use existing RxDB collection (for main entities only)
- If `dataSource` is **not specified** → use DictionaryStore (default for all dictionaries)

---

## 2. Dictionary Collection Schema

### 2.1 Universal Dictionaries Collection

**Design Principle:** Keep it simple - store only what's needed from config: `referencedFieldID` and `referencedFieldName`.

**Collection Name:** `dictionaries`

**Field Flexibility:**
- 99% tables use `id` + `name` fields
- Config specifies `referencedFieldID` and `referencedFieldName` for exceptions
- Examples: `country.code`, `breed.admin_name`, `currency.symbol`
- DictionaryStore normalizes any structure → universal schema

```typescript
const dictionarySchema: RxJsonSchema<DictionaryDocument> = {
  version: 0,
  primaryKey: {
    key: 'composite_id',
    fields: ['table_name', 'id'],
    separator: '::'
  },
  type: 'object',
  properties: {
    // Composite primary key
    composite_id: {
      type: 'string',
      maxLength: 100
    },

    // Table identifier
    table_name: {
      type: 'string',
      maxLength: 50
    },

    // From config: referencedFieldID (typically "id")
    id: {
      type: 'string',
      maxLength: 36
    },

    // From config: referencedFieldName (typically "name")
    name: {
      type: 'string',
      maxLength: 250
    },

    // Cache metadata
    cachedAt: {
      type: 'number',        // Unix timestamp
      multipleOf: 1,         // Required for indexed number fields
      minimum: 0,
      maximum: 9999999999999 // Max timestamp (year ~2286)
    }
  },
  required: ['composite_id', 'table_name', 'id', 'name', 'cachedAt'],
  indexes: [
    'table_name',            // Query all records from one table
    ['table_name', 'name'],  // Search by name within table
    'cachedAt'               // TTL cleanup
  ]
};
```

**Key Points:**
- ✅ Simple: Only 5 fields total
- ✅ Config-driven: Uses `referencedFieldID` and `referencedFieldName` from entity config
- ✅ No field analysis: Don't parse table structure, just use what config tells us
- ✅ Minimal storage: ~150 bytes per record

**Example Documents:**

```typescript
// Standard: id + name (99% cases)
{
  composite_id: "pet_type::uuid-123",
  table_name: "pet_type",
  id: "uuid-123",              // From table.id
  name: "Dog",                 // From table.name
  cachedAt: 1696598400000
}

// Exception: code + name
{
  composite_id: "country::UA",
  table_name: "country",
  id: "UA",                    // From table.code (not id!)
  name: "Ukraine",             // From table.name
  cachedAt: 1696598400000
}

// Exception: id + admin_name
{
  composite_id: "breed::uuid-789",
  table_name: "breed",
  id: "uuid-789",              // From table.id
  name: "Golden Retriever",    // From table.admin_name (not name!)
  cachedAt: 1696598400000
}

// Note: All normalized to same schema structure!
// Different source fields → same target fields (id, name)
```

**How Config Drives Field Mapping:**

```json
// Config tells us which fields to read:
{
  "name": "country_id",
  "referencedTable": "country",
  "referencedFieldID": "code",        // ← Read this field as ID
  "referencedFieldName": "name"       // ← Read this field as display name
}

// DictionaryStore reads: SELECT code, name FROM country
// Then normalizes: { id: record.code, name: record.name }
// Universal schema works for any table structure!
```

### 2.2 Child Tables Collections

**Child tables** (breed_division, breed_standard, user_quest, etc.) have unique schemas and need separate collections.

These are loaded when their parent entity is loaded (e.g., load `breed_division` when loading a breed).

---

## 3. Loading Strategy

### 3.1 Simple On-Demand Loading

**Trigger:** User interacts with DropdownInput or LookupInput

```typescript
// Example: User opens breed form, clicks on "Body Feature" dropdown
┌─────────────────────────────────────────────────────────┐
│  User Event: DropdownInput.onOpen("body_feature")      │
└─────────────────────────────────────────────────────────┘
                    ▼
┌─────────────────────────────────────────────────────────┐
│  1. Check RxDB cache                                    │
│     const cached = await db.dictionaries                │
│       .find({ selector: {                               │
│         table_name: 'body_feature',                     │
│         cachedAt: { $gt: Date.now() - TTL }          │
│       }})                                               │
└─────────────────────────────────────────────────────────┘
                    ▼
         ┌──────────────────────┐
         │  Cache HIT?          │
         └──────────────────────┘
           │               │
          YES              NO
           │               │
           ▼               ▼
    ┌──────────┐    ┌──────────────────┐
    │ Return   │    │ Fetch from API   │
    │ cached   │    │ /api/dict/       │
    │ data     │    │ body_feature     │
    └──────────┘    │ ?limit=30        │
                    └──────────────────┘
                           │
                           ▼
                    ┌──────────────────┐
                    │ Store in RxDB    │
                    │ Return to UI     │
                    └──────────────────┘
```

---

## 4. DictionaryStore Implementation

### 4.1 Store Structure

```typescript
// packages/rxdb-store/src/stores/dictionary-store.signal-store.ts

import { signal } from '@preact/signals-react';
import { RxCollection, RxDatabase } from 'rxdb';
import { getDatabase } from '../services/database.service';

interface DictionaryDocument {
  composite_id: string;  // "table_name::id"
  table_name: string;    // e.g., "pet_type"
  id: string;            // from referencedFieldID (typically "id")
  name: string;          // from referencedFieldName (typically "name")
  cachedAt: number;      // Unix timestamp for TTL
}

class DictionaryStore {
  private static instance: DictionaryStore;

  // State
  initialized = signal<boolean>(false);
  loading = signal<boolean>(false);
  loadingTables = signal<Set<string>>(new Set());

  // Database
  private db: RxDatabase | null = null;
  private dictionariesCollection: RxCollection<DictionaryDocument> | null = null;

  // Cache metadata
  private loadedTables = new Map<string, number>(); // table -> timestamp
  private readonly TTL = 86400000; // 24 hours

  private constructor() {}

  static getInstance(): DictionaryStore {
    if (!DictionaryStore.instance) {
      DictionaryStore.instance = new DictionaryStore();
    }
    return DictionaryStore.instance;
  }

  /**
   * Initialize dictionary store and create universal collection
   * Called by AppStore during app initialization
   *
   * NO PRELOADING - collections are created empty
   */
  async initialize() {
    if (this.initialized.value) return;

    this.loading.value = true;

    try {
      // Get database
      this.db = await getDatabase();

      // Create universal dictionaries collection (empty)
      if (!this.db.dictionaries) {
        await this.db.addCollections({
          dictionaries: {
            schema: dictionarySchema
          }
        });
      }

      this.dictionariesCollection = this.db.dictionaries;
      this.initialized.value = true;

      console.log('[DictionaryStore] Initialized (no preloading)');

    } catch (error) {
      console.error('[DictionaryStore] Initialization failed:', error);
      throw error;
    } finally {
      this.loading.value = false;
    }
  }

  /**
   * Load dictionary data from server and cache in RxDB
   *
   * @param tableName - Dictionary table name (e.g., 'pet_type')
   * @param idField - ID field name from config (default: 'id')
   * @param nameField - Display field name from config (default: 'name')
   * @param limit - Number of records to load (default: 100)
   * @param offset - Offset for pagination (default: 0)
   */
  async loadDictionary(
    tableName: string,
    idField: string = 'id',
    nameField: string = 'name',
    limit: number = 100,
    offset: number = 0
  ): Promise<DictionaryDocument[]> {
    // Add to loading set
    const currentLoading = this.loadingTables.value;
    currentLoading.add(tableName);
    this.loadingTables.value = new Set(currentLoading);

    try {
      // Fetch from Supabase using dynamic field names
      const { data, error } = await this.supabase
        .from(tableName)
        .select(`${idField}, ${nameField}`)
        .order(nameField, { ascending: true })
        .range(offset, offset + limit - 1);

      if (error) {
        throw new Error(`Failed to load ${tableName}: ${error.message}`);
      }

      // Transform and insert into RxDB
      // Normalize any structure into universal schema
      const documents: DictionaryDocument[] = (data || []).map(record => ({
        composite_id: `${tableName}::${record[idField]}`,
        table_name: tableName,
        id: record[idField],        // Can be: id, code, uuid, etc.
        name: record[nameField],    // Can be: name, title, label, symbol, etc.
        cachedAt: Date.now()
      }));

      // Bulk insert (RxDB handles conflicts)
      if (documents.length > 0) {
        await this.dictionariesCollection!.bulkInsert(documents);
      }

      // Mark as loaded
      this.loadedTables.set(tableName, Date.now());

      console.log(`[DictionaryStore] Loaded ${documents.length} records for ${tableName}`);

      return documents;

    } catch (error) {
      console.error(`[DictionaryStore] Failed to load ${tableName}:`, error);
      throw error;
    } finally {
      // Remove from loading set
      const updatedLoading = this.loadingTables.value;
      updatedLoading.delete(tableName);
      this.loadingTables.value = new Set(updatedLoading);
    }
  }

  /**
   * Get dictionary records for dropdown/lookup
   *
   * @param tableName - Dictionary table name
   * @param options - Query options
   */
  async getDictionary(
    tableName: string,
    options: {
      idField?: string;    // From config.referencedFieldID (default: 'id')
      nameField?: string;  // From config.referencedFieldName (default: 'name')
      search?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ records: DictionaryDocument[]; total: number; hasMore: boolean }> {
    if (!this.dictionariesCollection) {
      throw new Error('[DictionaryStore] Not initialized');
    }

    const {
      idField = 'id',      // Default to 'id' (99% cases)
      nameField = 'name',  // Default to 'name' (99% cases)
      search,
      limit = 30,
      offset = 0
    } = options;

    // Check if we have any cached records for this table
    const cachedCount = await this.dictionariesCollection
      .count({
        selector: {
          table_name: tableName,
          cachedAt: { $gt: Date.now() - this.TTL } // Not expired
        }
      })
      .exec();

    // If no cache or expired, load from server
    if (cachedCount === 0) {
      await this.loadDictionary(tableName, idField, nameField, limit, offset);
    }

    // Build query
    let query = this.dictionariesCollection.find({
      selector: {
        table_name: tableName
      }
    });

    // Add search filter
    if (search) {
      query = query.where('name').regex(new RegExp(search, 'i'));
    }

    // Get total count
    const totalDocs = await query.exec();
    const total = totalDocs.length;

    // Apply pagination
    const records = await query
      .skip(offset)
      .limit(limit)
      .exec();

    const hasMore = offset + limit < total;

    return {
      records: records.map(doc => doc.toJSON()),
      total,
      hasMore
    };
  }

  /**
   * Cleanup expired dictionary records
   * Call this periodically (e.g., on app start or every hour)
   */
  async cleanupExpired() {
    if (!this.dictionariesCollection) return;

    const expiredDocs = await this.dictionariesCollection
      .find({
        selector: {
          cachedAt: {
            $lt: Date.now() - this.TTL // Older than 24 hours
          }
        }
      })
      .exec();

    if (expiredDocs.length > 0) {
      console.log(`[DictionaryStore] Cleaning up ${expiredDocs.length} expired records`);

      for (const doc of expiredDocs) {
        await doc.remove();
      }
    }
  }
}

export const dictionaryStore = DictionaryStore.getInstance();
```

### 4.2 Integration with DropdownInput

**DropdownInput always uses DictionaryStore** (no dataSource check needed, it's for dictionaries only).

```typescript
// packages/ui/components/form-inputs/dropdown-input.tsx

import { dictionaryStore } from '@breedhub/rxdb-store';
import { useEffect, useState } from 'react';

export const DropdownInput = forwardRef<HTMLInputElement, DropdownInputProps>(
  ({
    referencedTable, // Which dictionary table to load
    options, // Static options (fallback)
    value,
    onValueChange,
    ...props
  }, ref) => {
    const [dynamicOptions, setDynamicOptions] = useState(options || []);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    // Load dictionary data when dropdown opens
    useEffect(() => {
      if (isOpen && referencedTable && dynamicOptions.length === 0) {
        loadDictionaryOptions();
      }
    }, [isOpen, referencedTable]);

    const loadDictionaryOptions = async () => {
      if (!referencedTable) return;

      setLoading(true);

      try {
        // Pass field names from config (with defaults)
        const { records } = await dictionaryStore.getDictionary(referencedTable, {
          idField: referencedFieldID || 'id',      // From config
          nameField: referencedFieldName || 'name', // From config
          limit: 30,
          offset: 0
        });

        // Transform to dropdown options
        const opts = records.map(record => ({
          value: record.id,    // Normalized in DictionaryStore
          label: record.name   // Normalized in DictionaryStore
        }));

        setDynamicOptions(opts);
      } catch (error) {
        console.error(`Failed to load dictionary ${referencedTable}:`, error);
      } finally {
        setLoading(false);
      }
    };

    // Rest of component implementation...
  }
);
```

### 4.3 Integration with LookupInput

**LookupInput checks `dataSource` to determine behavior:**

```typescript
// packages/ui/components/form-inputs/lookup-input.tsx

import { dictionaryStore, getDatabase } from '@breedhub/rxdb-store';
import { useEffect, useState } from 'react';

interface LookupInputProps {
  referencedTable: string;
  dataSource?: 'collection'; // Only 'collection' for now
  value?: string;
  onValueChange?: (value: string) => void;
  // ... other props
}

export const LookupInput = forwardRef<HTMLInputElement, LookupInputProps>(
  ({
    referencedTable,
    dataSource, // If specified → use collection, otherwise → use DictionaryStore
    value,
    onValueChange,
    ...props
  }, ref) => {
    const [options, setOptions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const loadOptions = async (query: string = '') => {
      setLoading(true);

      try {
        let records = [];

        if (dataSource === 'collection') {
          // Use existing RxDB collection (breed, pet, account, etc.)
          const db = await getDatabase();
          const collection = db[referencedTable];

          if (!collection) {
            throw new Error(`Collection ${referencedTable} not found`);
          }

          // Query collection with search
          const docs = await collection
            .find({
              selector: query ? {
                name: { $regex: new RegExp(query, 'i') }
              } : {}
            })
            .limit(30)
            .exec();

          records = docs.map(doc => ({
            id: doc.id,
            name: doc.name
          }));
        } else {
          // Default: Use DictionaryStore cache
          const result = await dictionaryStore.getDictionary(referencedTable, {
            search: query,
            limit: 30
          });
          records = result.records;
        }

        // Transform to options
        const opts = records.map(record => ({
          value: record.id,
          label: record.name
        }));

        setOptions(opts);
      } catch (error) {
        console.error(`Failed to load ${referencedTable}:`, error);
      } finally {
        setLoading(false);
      }
    };

    // Load on search
    useEffect(() => {
      const timer = setTimeout(() => {
        loadOptions(searchQuery);
      }, 300); // Debounce

      return () => clearTimeout(timer);
    }, [searchQuery]);

    // Rest of component implementation...
  }
);
```

---

## 5. Scroll Pagination Implementation

For large dictionaries (city, region, etc.) with 1000+ records, implement scroll pagination:

```typescript
// In DropdownInput component

const [hasMore, setHasMore] = useState(true);
const [offset, setOffset] = useState(0);
const dropdownListRef = useRef<HTMLDivElement>(null);

// Load more on scroll
const handleScroll = async (e: React.UIEvent<HTMLDivElement>) => {
  const target = e.currentTarget;
  const scrollBottom = target.scrollHeight - target.scrollTop - target.clientHeight;

  // Load more when scrolled to bottom (with 50px threshold)
  if (scrollBottom < 50 && hasMore && !loading) {
    await loadMoreOptions();
  }
};

const loadMoreOptions = async () => {
  if (!referencedTable || !hasMore) return;

  setLoading(true);

  try {
    const newOffset = offset + 30;
    const { records, hasMore: more } = await dictionaryStore.getDictionary(
      referencedTable,
      {
        limit: 30,
        offset: newOffset
      }
    );

    // Append new options
    const newOpts = records.map(record => ({
      value: record.id,
      label: record.name
    }));

    setDynamicOptions(prev => [...prev, ...newOpts]);
    setOffset(newOffset);
    setHasMore(more);
  } catch (error) {
    console.error(`Failed to load more from ${referencedTable}:`, error);
  } finally {
    setLoading(false);
  }
};

// In render
<div
  ref={dropdownListRef}
  className="max-h-[40vh] overflow-auto"
  onScroll={handleScroll}
>
  {dynamicOptions.map(option => (
    <div key={option.value}>{option.label}</div>
  ))}
  {loading && <div>Loading more...</div>}
</div>
```

---

## 6. API Endpoints Required

### 6.1 Get Dictionary Data

**Simple API:** Returns only `id` and `name` fields as specified in entity config.

```
GET /api/dictionaries/:tableName
Query params:
  - limit: number (default: 100)
  - offset: number (default: 0)
  - search: string (optional, for name filtering)

Response:
{
  "records": [
    {
      "id": "uuid-123",
      "name": "Dog"
    },
    {
      "id": "uuid-456",
      "name": "Cat"
    }
  ],
  "total": 150,
  "limit": 100,
  "offset": 0,
  "hasMore": true
}
```

**Backend Implementation Notes:**
- Query uses `referencedFieldID` and `referencedFieldName` from entity config
- For most dictionaries: `SELECT id, name FROM {tableName}`
- Add WHERE filter if search param provided: `WHERE name ILIKE '%{search}%'`
- Order by name: `ORDER BY name ASC`

### 6.2 Search Dictionary (Optional)

If you want dedicated search endpoint:

```
GET /api/dictionaries/:tableName/search
Query params:
  - q: string (search query)
  - limit: number (default: 30)

Response:
{
  "records": [
    { "id": "uuid", "name": "German Shepherd" }
  ],
  "total": 5
}
```

---

## 7. Implementation Status & Phases

### ✅ Completed
- **Universal dictionaries schema** - Created with composite keys, RxDB validation fixed
- **DictionaryStore implementation** - All core methods implemented (initialize, loadDictionary, getDictionary, cleanupExpired)
- **Deep merge fix** - Fixed config hierarchy rebuild to properly merge nested objects
- **Window exposure for debugging** - Added dictionaryStore, appStore, spaceStore to window in DEV mode
- **RxDB schema validation** - Fixed all validation errors (field naming, multipleOf, min/max constraints)
- **DictionaryStore initialization** - Verified: collection creates successfully, no errors
- **DropdownInput integration** - Added referencedTable/referencedFieldID/referencedFieldName props, loads from DictionaryStore
- **FiltersDialog integration** - Connected FilterFieldConfig to DropdownInput with state management
- **Dictionary loading tested** - Successfully tested with pet_type in breeds filter modal
- **Scroll pagination** - ✅ Implemented with addEventListener pattern in both DropdownInput and LookupInput
- **Search functionality** - ✅ Implemented with debounced search (300ms) and cache-first strategy in LookupInput
- **Batch loading optimization** - ✅ Optimized to load 30 records per batch (no excessive prefetching)
- **Bug fixes** - ✅ Fixed infinite loops, duplicate keys, scroll issues with offsetRef pattern
- **ILIKE search** - ✅ Case-insensitive search working correctly (337 vs 177 records for "red" explained)
- **Debug logs removed** - ✅ Clean console output

### ⏳ Needs Testing
- **LookupInput dataSource logic** - Component has referencedTable but dataSource prop not fully tested with collection vs dictionary modes
- **TTL cleanup** - Cleanup method implemented (14 days TTL) but not fully tested in production
- **Performance testing** - Load times, cache hit rates, memory usage need benchmarking

### ❌ Pending
- **API endpoints** - Currently using Supabase client directly (no separate API needed)
- **Config dataSource field** - Need to add `dataSource: "collection"` for main entities in config generation
- **LookupInput collection mode** - dataSource="collection" logic needs testing with main entities (breed, pet, account)
- **Server-search support** - Deferred to edit forms implementation (for very large dictionaries)

### Implementation Phases

#### Phase 1: Foundation ✅ COMPLETED
- [x] Analyze referenced tables
- [x] Create universal dictionaries schema
- [x] Implement DictionaryStore
- [x] Fix RxDB validation errors
- [x] Integrate with AppStore initialization

#### Phase 2: Integration ✅ COMPLETED
- [x] DictionaryStore initialization verified
- [x] Update DropdownInput to use DictionaryStore
- [x] Connect DropdownInput to FiltersDialog with state management
- [x] Test dictionary loading with real data (pet_type in breeds filter) ✨
- [x] Update LookupInput with search and scroll pagination
- [x] Implement debounced search (300ms) with cache-first strategy
- [x] Fix infinite loops with offsetRef pattern
- [x] Add duplicate filtering when appending data

#### Phase 3: Optimization ✅ MOSTLY COMPLETED
- [x] Add scroll pagination to components (addEventListener pattern)
- [x] Test search functionality (working with ILIKE case-insensitive search)
- [x] Optimize batch loading (30 records per load)
- [x] Remove debug logs for clean console output
- [ ] Verify TTL cleanup in production (14 days TTL implemented)
- [ ] Performance testing and optimization (load times, cache hit rates)

#### Phase 4: Finalization ⏳ IN PROGRESS
- [ ] Config updates with dataSource field for main entities
- [ ] Test LookupInput with dataSource="collection" mode
- [ ] Full integration testing across all entity forms
- [ ] Performance benchmarks (load times, cache hit rates, memory usage)
- [ ] Server-search support (for edit forms, later - deferred)

---

## 8. Memory & Performance Estimates

### 8.1 Memory Footprint

**Simplified Schema = Much Smaller Footprint**

```
Universal Dictionaries Collection:
  - 99 dictionary tables
  - ~2000 total records (avg 20 per table)
  - ~150 bytes per record (only 5 fields: composite_id, table_name, id, name, cachedAt)
  - Total: ~300 KB ✅

Child Tables (8 collections):
  - ~500 records each
  - ~0.5KB per record
  - Total: ~2 MB

Grand Total: ~2.3 MB for all dictionaries
```

**Comparison with original complex schema:**
- Original: ~4 MB (with code, order, active, _extended fields)
- Simplified: ~2.3 MB (only id + name)
- **Savings: 42% reduction** 🎉

### 8.2 Loading Performance

**On-Demand Loading:**
```
User opens dropdown → Check cache → Fetch if missing
  - Per table: 30 records
  - ~100ms per request
  - Subsequent opens: instant (from cache)
```

**App Startup:**
```
0ms: Start
├─ 100ms: Create empty dictionaries collection
└─ 100ms: Ready ✅

No blocking preload, no background loading.
UI is ready immediately.
```

---

## 9. Config Update Plan

### 9.1 Add `dataSource` Field to Main Entity References

**Main entities** that should have `dataSource: "collection"`:

```json
// From entity-categories.json
["breed", "pet", "account", "contact", "litter", "competition",
 "event", "project", "activity", "collection", "cover", "post",
 "invoice", "order", "product", "service_pact", "cashflow", "quest"]
```

**How to update configs:**

1. **Scan all entity JSON files** for fields with:
   - `isForeignKey: true`
   - `referencedTable` is one of main entities above

2. **Add `dataSource: "collection"` to those fields:**
   ```json
   {
     "name": "account_id",
     "component": "LookupInput",
     "isForeignKey": true,
     "referencedTable": "account",
     "dataSource": "collection"  // ← ADD THIS
   }
   ```

3. **For dictionaries - don't add `dataSource`** (default behavior):
   ```json
   {
     "name": "pet_type_id",
     "component": "DropdownInput",
     "isForeignKey": true,
     "referencedTable": "pet_type"
     // No dataSource → uses DictionaryStore by default
   }
   ```

**Note:** Support for large dictionaries with `dataSource: "server-search"` will be added later during edit forms implementation.

### 9.2 Automatic `dataSource` Generation

The `dataSource` field is added **automatically** by existing config generation scripts:

**1. In `generate-entity-configs.cjs` (lines 267-272):**
```javascript
// Add dataSource for main entities
const entityCategories = require('./entity-categories.json');
if (referencedTable && entityCategories.main.includes(referencedTable)) {
  config.dataSource = 'collection';
}
// For dictionaries - don't add dataSource (default behavior)
```

**2. In `analyze-fields.cjs` (lines 189-193):**
```javascript
// Add dataSource for main entities
if (entityCategories.main.includes(referencedTable)) {
  baseField.commonProps.dataSource = 'collection';
}
// For dictionaries - don't add dataSource (default behavior)
```

**To regenerate configs with `dataSource`:**
```bash
cd apps/config-admin
node scripts/generate-entity-configs.cjs
node scripts/analyze-fields.cjs
pnpm build  # Rebuild merged config
```

---

## 10. Next Steps

1. **Update Entity Configs**
   - Run script to add `dataSource: "collection"` for main entity fields
   - Rebuild merged config
   - Verify in dev tools

2. **Create API Endpoint**
   - `GET /api/dictionaries/:tableName?limit=30&offset=0&search=query`
   - Returns only `id` and `name` fields
   - Add to Supabase RPC functions or create Edge Function

3. **Implement DictionaryStore**
   - Follow structure in section 4.1
   - Add to `packages/rxdb-store/src/stores/`
   - Export from store index

4. **Update Components**
   - **DropdownInput**: Add `referencedTable` prop, integrate DictionaryStore
   - **LookupInput**: Add `dataSource` prop, implement switch logic (section 4.3)
   - Add scroll pagination to both

5. **Testing**
   - Test DropdownInput with pet_type, country, currency (DictionaryStore)
   - Test LookupInput with account, breed (RxDB collection)
   - Test LookupInput with city (server-search)
   - Verify cache works and TTL cleanup runs

6. **Performance Monitoring**
   - Measure first load time for each strategy
   - Verify cache hit rate
   - Monitor RxDB collection size

---

## 10. Related Documentation

- [Dictionary Caching Strategy](./DICTIONARY_CACHING_STRATEGY.md) - Original concept and hybrid approach
- [Filtering Implementation Plan](./FILTERING_IMPLEMENTATION_PLAN.md) - How filters use dictionaries
- [Session Restart Guide](./SESSION_RESTART.md) - Current development status

## 11. Summary

**Config-Driven Strategy:**

1. ✅ **Add `dataSource` field** to main entity fields in config
   - `dataSource: "collection"` → Use RxDB collection (breed, pet, account)
   - No `dataSource` → Default to DictionaryStore (pet_type, country, currency)
   - `dataSource: "server-search"` → Large dictionaries, no cache (city, region)

2. ✅ **One universal `dictionaries` collection** with composite keys for caching
   - Schema: `table_name::id`, 5 fields only (simple!)
   - 24-hour TTL for automatic cleanup

3. ✅ **Load on-demand** when user interacts with controls
   - DropdownInput → Always DictionaryStore
   - LookupInput → Switch based on `dataSource` prop

4. ✅ **20-30 records per page** with scroll pagination

5. ✅ **No preloading, no complexity** - load only when user needs it

6. ⏳ **Server-search for large dictionaries** - deferred until edit forms implementation

**The strategy is config-driven and interaction-driven.**

---

## 12. Virtual Dictionary Loading for Public Pages

**Updated:** 2025-11-20

### Problem

Public pages (breed, kennel, pet) відображають read-only дані з child таблиць:
- Breed public page → achievements, coat colors, sizes
- Компоненти не потребують повного довідника (не форми з dropdown)
- Показуємо тільки існуючі зв'язки (3-5 achievements, не всі 50)

**Завантаження повних довідників марнотратне:**
- ❌ Achievement довідник: 50 записів, але breed використовує тільки 3
- ❌ Coat color довідник: 500 записів, але breed використовує тільки 5
- ❌ City довідник: 50,000 записів, показуємо тільки kennels для цього breed

### Solution: Virtual Dictionary Pattern

**Ключова ідея:** Завантажувати тільки записи довідника які використовуються в child таблиці для конкретного parent.

```typescript
// ❌ Старий підхід: завантажити весь довідник
const allAchievements = await dictionaryStore.getDictionary('achievement'); // 50 записів

// ✅ Новий підхід: віртуальне завантаження
const virtualAchievements = await dictionaryStore.loadVirtualDictionary({
  childTable: 'achievement_in_breed',
  parentId: breedId,
  parentField: 'breed_id',
  foreignKey: 'achievement_id',
  dictionary: 'achievement'
});
// Результат: тільки 3 записи які дійсно використовуються
```

### Benefits

- ⚡ **100x швидше**: 3 записи замість 50 (для achievement)
- 📉 **Мінімальний трафік**: ~500 bytes замість 10KB
- 💾 **Ефективний кеш**: кешуємо тільки те що показуємо
- 🎯 **Точні дані**: тільки існуючі зв'язки

### Implementation

#### 1. DictionaryStore API Extension

```typescript
// В dictionary-store.signal-store.ts

/**
 * Virtual loading: завантажити тільки записи довідника які використовуються
 * в child таблиці для конкретного parent
 */
async loadVirtualDictionary(options: {
  childTable: string;      // achievement_in_breed
  parentId: string;        // breed UUID
  parentField: string;     // 'breed_id'
  foreignKey: string;      // 'achievement_id'
  dictionary: string;      // 'achievement'
  idField?: string;        // default: 'id'
  nameField?: string;      // default: 'name'
}): Promise<DictionaryDocument[]> {
  const {
    childTable,
    parentId,
    parentField,
    foreignKey,
    dictionary,
    idField = 'id',
    nameField = 'name'
  } = options;

  console.log(`[DictionaryStore] 🎯 Virtual loading ${dictionary} via ${childTable}`);

  // 1. Завантажити child records для цього parent
  const { data: childRecords, error } = await supabase
    .from(childTable)
    .select(foreignKey)
    .eq(parentField, parentId);

  if (error || !childRecords || childRecords.length === 0) {
    return [];
  }

  // 2. Витягнути унікальні IDs довідника
  const dictionaryIds = [
    ...new Set(
      childRecords
        .map(r => r[foreignKey])
        .filter(Boolean)
    )
  ];

  console.log(`[DictionaryStore] 📊 Found ${dictionaryIds.length} unique ${dictionary} IDs`);

  // 3. Використати існуючий getDictionaryByIds (з кешем)
  return this.getDictionaryByIds(dictionary, dictionaryIds, {
    idField,
    nameField
  });
}

/**
 * Завантажити записи довідника по конкретним IDs (з кешем)
 */
async getDictionaryByIds(
  tableName: string,
  ids: string[],
  options: { idField?: string; nameField?: string } = {}
): Promise<DictionaryDocument[]> {
  const { idField = 'id', nameField = 'name' } = options;

  if (ids.length === 0) return [];

  // 1. Перевірити кеш
  const cached = await this.collection!.find({
    selector: {
      table_name: tableName,
      id: { $in: ids }
    }
  }).exec();

  const cachedMap = new Map(cached.map(doc => [doc.id, doc.toJSON()]));

  // 2. Визначити відсутні IDs
  const missingIds = ids.filter(id => !cachedMap.has(id));

  // 3. Завантажити тільки відсутні
  if (missingIds.length > 0) {
    const freshRecords = await this.fetchDictionaryRecordsByIDs(
      tableName,
      idField,
      nameField,
      missingIds
    );

    // 4. Закешувати
    if (freshRecords.length > 0) {
      await this.collection!.bulkInsert(freshRecords);
    }

    // 5. Об'єднати
    return [
      ...Array.from(cachedMap.values()),
      ...freshRecords
    ];
  }

  return Array.from(cachedMap.values());
}
```

#### 2. React Hook для зручності

```typescript
// hooks/useVirtualDictionary.ts

interface UseVirtualDictionaryOptions {
  childTable: string;
  parentId: string | null;
  parentField: string;
  foreignKey: string;
  dictionary: string;
  enabled?: boolean;  // Intersection Observer control
}

export function useVirtualDictionary(options: UseVirtualDictionaryOptions) {
  const {
    childTable,
    parentId,
    parentField,
    foreignKey,
    dictionary,
    enabled = true
  } = options;

  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!enabled || !parentId) return;

    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        const records = await dictionaryStore.loadVirtualDictionary({
          childTable,
          parentId,
          parentField,
          foreignKey,
          dictionary
        });

        setData(records);
      } catch (err) {
        console.error('Virtual dictionary loading failed:', err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [enabled, parentId, childTable, parentField, foreignKey, dictionary]);

  return { data, loading, error };
}
```

#### 3. Intersection Observer для Lazy Loading

```typescript
// hooks/useIntersectionObserver.ts

interface UseIntersectionObserverOptions {
  threshold?: number;
  rootMargin?: string;
}

export function useIntersectionObserver(
  ref: RefObject<Element>,
  options: UseIntersectionObserverOptions = {}
): boolean {
  const { threshold = 0.1, rootMargin = '100px' } = options;
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect(); // Один раз завантажили → відключаємо
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [ref, threshold, rootMargin]);

  return isVisible;
}
```

### Usage Examples

#### Example 1: BreedAchievements Component

```typescript
// components/breed/BreedAchievements.tsx

import { useRef } from 'react';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';
import { useVirtualDictionary } from '@/hooks/useVirtualDictionary';

export const BreedAchievements = ({ breedId }: { breedId: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const isVisible = useIntersectionObserver(ref, {
    threshold: 0.1,
    rootMargin: '100px'  // Почати грузити за 100px до видимості
  });

  // Віртуальне завантаження тільки коли компонент видимий
  const { data: achievements, loading } = useVirtualDictionary({
    childTable: 'achievement_in_breed',
    parentId: breedId,
    parentField: 'breed_id',
    foreignKey: 'achievement_id',
    dictionary: 'achievement',
    enabled: isVisible  // Грузити тільки коли видимий!
  });

  return (
    <div ref={ref} className="breed-achievements">
      <h3>Achievements</h3>

      {loading && <Spinner />}

      {achievements.map(achievement => (
        <AchievementBadge
          key={achievement.id}
          name={achievement.name}
          icon={achievement.icon}
        />
      ))}
    </div>
  );
};
```

**Behavior:**
1. Компонент рендериться (off-screen) → не грузимо
2. Користувач скролить вниз → Intersection Observer спрацьовує
3. `isVisible = true` → завантажуємо тільки 3 achievements для цього breed
4. Кешуємо в RxDB → повторний візит миттєвий

#### Example 2: BreedCoatColors Component

```typescript
// components/breed/BreedCoatColors.tsx

export const BreedCoatColors = ({ breedId }: { breedId: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const isVisible = useIntersectionObserver(ref);

  const { data: coatColors, loading } = useVirtualDictionary({
    childTable: 'coat_color_in_breed',
    parentId: breedId,
    parentField: 'breed_id',
    foreignKey: 'coat_color_id',
    dictionary: 'coat_color',
    enabled: isVisible
  });

  return (
    <div ref={ref} className="breed-coat-colors">
      <h3>Coat Colors</h3>

      {loading && <Spinner />}

      <div className="color-grid">
        {coatColors.map(color => (
          <ColorSwatch
            key={color.id}
            name={color.name}
            hex={color.hex_code}
          />
        ))}
      </div>
    </div>
  );
};
```

**Performance:**
- Coat color довідник: 500 записів (~50KB)
- Breed використовує: 5 кольорів (~500 bytes)
- **Економія: 100x менше даних!** 🚀

#### Example 3: Multiple Virtual Dictionaries

```typescript
// components/breed/BreedPublicPage.tsx

export const BreedPublicPage = ({ breedId }: { breedId: string }) => {
  return (
    <div className="breed-public-page">
      <BreedHeader breedId={breedId} />

      {/* Кожен компонент грузить свій довідник коли стає видимим */}
      <BreedAchievements breedId={breedId} />
      <BreedCoatColors breedId={breedId} />
      <BreedSizes breedId={breedId} />
      <BreedBodyFeatures breedId={breedId} />

      {/* Всього завантажено: ~20-30 записів замість ~1000 */}
    </div>
  );
};
```

### Performance Comparison

#### Before Virtual Loading (Full Dictionaries):
```
Breed Public Page:
- achievement (50 records × 200 bytes) = 10KB
- coat_color (500 records × 150 bytes) = 75KB
- pet_size (30 records × 100 bytes) = 3KB
- body_feature (100 records × 150 bytes) = 15KB
Total: ~103KB, ~680 records
```

#### After Virtual Loading:
```
Breed Public Page:
- achievement (3 records × 200 bytes) = 600 bytes
- coat_color (5 records × 150 bytes) = 750 bytes
- pet_size (3 records × 100 bytes) = 300 bytes
- body_feature (4 records × 150 bytes) = 600 bytes
Total: ~2.2KB, ~15 records
```

**Result: 50x less data, 45x fewer records!** ⚡

### When to Use Virtual Loading

#### ✅ Use Virtual Loading:
- Public pages (breed, kennel, pet)
- Read-only components (badges, lists, galleries)
- Child table data (achievements, colors, sizes)
- Компоненти з Intersection Observer

#### ❌ Don't Use Virtual Loading:
- Edit forms з dropdown (потрібен повний список для вибору)
- Filters (користувач має бачити всі опції)
- Search/autocomplete (потрібні всі results)
- Admin panels з full CRUD

### Strategy by Component Type

| Component Type | Strategy | Loading | Example |
|---|---|---|---|
| Public Page | Virtual + Lazy | Intersection Observer | BreedAchievements |
| Edit Form | Full Dictionary | On-demand | BreedEditForm |
| Dropdown | Full Dictionary | On-open | DropdownInput |
| Lookup | ID-First Pagination | On-search | LookupInput |
| Filter | Full Dictionary | On-mount | FilterPanel |

### Integration with Existing Patterns

Virtual Loading доповнює існуючі стратегії:

1. **ID-First Pagination** (main entities)
   - Для breed, pet, account lists
   - Завантажує IDs → перевіряє кеш → грузить missing

2. **On-Demand Loading** (dictionaries)
   - Для dropdown controls
   - Завантажує повний довідник коли користувач відкриває dropdown

3. **Virtual Loading** (public pages) ← NEW!
   - Для read-only components
   - Завантажує тільки використовувані записи

### Caching Strategy

Virtual Loading використовує той самий universal dictionaries collection:

```typescript
{
  composite_id: "achievement::uuid-123",
  table_name: "achievement",
  id: "uuid-123",
  name: "Bronze Supporter",
  cachedAt: 1700000000000
}
```

**Cache Behavior:**
1. Перший візит breed page → завантажити 3 achievements → закешувати
2. Другий візит → RxDB cache hit (100%) → миттєво
3. Інший breed → завантажити його achievements → закешувати
4. Поступово кеш наповнюється найпопулярнішими записами
5. TTL 14 днів → автоматичне очищення старих записів

**Benefits:**
- 💾 Intelligent partial cache (популярні records кешуються природньо)
- ⚡ Progressive performance improvement (cache hit rate росте)
- 🎯 Тільки потрібні дані (не марнуємо пам'ять на unused records)

### Implementation Priority

#### Phase 1: DictionaryStore API (1-2 days)
- [ ] Add `loadVirtualDictionary()` method
- [ ] Add `getDictionaryByIds()` method
- [ ] Write unit tests
- [ ] Update documentation

#### Phase 2: React Hooks (1 day)
- [ ] Create `useVirtualDictionary` hook
- [ ] Create `useIntersectionObserver` hook
- [ ] Add TypeScript types
- [ ] Write usage examples

#### Phase 3: Breed Public Page (2-3 days)
- [ ] Migrate `BreedAchievements` component
- [ ] Migrate `BreedCoatColors` component
- [ ] Migrate `BreedSizes` component
- [ ] Migrate `BreedBodyFeatures` component
- [ ] Measure performance improvement

#### Phase 4: Other Public Pages (1 week)
- [ ] Kennel public page
- [ ] Pet public page
- [ ] Contact public page
- [ ] Event public page

### Monitoring & Metrics

Track performance improvement:

```typescript
// Before
console.time('Full Dictionary Load');
const data = await dictionaryStore.getDictionary('coat_color'); // 500 records
console.timeEnd('Full Dictionary Load'); // ~500ms

// After
console.time('Virtual Dictionary Load');
const data = await dictionaryStore.loadVirtualDictionary({...}); // 5 records
console.timeEnd('Virtual Dictionary Load'); // ~50ms
```

**Expected metrics:**
- Load time: 10x faster (500ms → 50ms)
- Data size: 100x smaller (75KB → 750 bytes)
- Cache hit rate: grows from 0% to 80-90%
- Network requests: 50% fewer (after cache warmup)

### Conclusion

Virtual Dictionary Loading:
- ⚡ Миттєвий старт public pages (0 dictionaries при завантаженні)
- 📉 Мінімальний трафік (тільки потрібні records)
- 💾 Розумний кеш (популярні records природньо кешуються)
- 🎯 Component-driven (кожен компонент грузить тільки своє)
- 📱 Мобільна оптимізація (Intersection Observer)

**Ключовий принцип: завантажуй тільки те що показуєш, коли показуєш.**

---
