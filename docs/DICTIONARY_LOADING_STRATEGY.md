# Dictionary Loading Strategy

**Generated:** 2025-10-06

## Executive Summary

**Simple On-Demand Approach:** No pre-analysis needed. When user interacts with a DropdownInput/LookupInput:
1. Check RxDB cache
2. If not found → fetch from API
3. Save to RxDB
4. Return to UI

**Storage:**
- **Dictionaries** → ONE universal RxDB collection with composite keys (`table_name::id`)
- **Child tables** → Separate RxDB collections (varied schemas, loaded with parent)
- **Main entities** → Already have collections, use server-side search (LookupInput)

**Key Principle:** Don't overthink it. Let the UI drive what gets cached.

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
| `"dictionary"` or **not specified** | Use DictionaryStore (cache) | Standard dictionaries | pet_type, country, currency |
| `"server-search"` | Server-side search, no cache | Large dictionaries (10000+ records) | city, region, geo_names |

### 1.3 Component Behavior

| Component | Default dataSource | Typical Usage |
|-----------|-------------------|---------------|
| **DropdownInput** | `"dictionary"` | Small dictionaries (< 1000 records) |
| **LookupInput** | `"collection"` | Main entities with search |

**Rule:** If `dataSource` is not specified → use `"dictionary"` (DictionaryStore).

---

## 2. Dictionary Collection Schema

### 2.1 Universal Dictionaries Collection

**Design Principle:** Keep it simple - store only what's needed from config: `referencedFieldID` and `referencedFieldName`.

**Collection Name:** `dictionaries`

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
    _cached_at: {
      type: 'number' // Unix timestamp
    }
  },
  required: ['composite_id', 'table_name', 'id', 'name'],
  indexes: [
    'table_name', // Query all records from one table
    ['table_name', 'name'], // Search by name within table
    '_cached_at' // TTL cleanup
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
// pet_type record
{
  composite_id: "pet_type::uuid-123",
  table_name: "pet_type",
  id: "uuid-123",              // referencedFieldID: "id"
  name: "Dog",                 // referencedFieldName: "name"
  _cached_at: 1696598400000
}

// country record
{
  composite_id: "country::uuid-456",
  table_name: "country",
  id: "uuid-456",              // referencedFieldID: "id"
  name: "Ukraine",             // referencedFieldName: "name"
  _cached_at: 1696598400000
}

// sys_language record
{
  composite_id: "sys_language::uuid-789",
  table_name: "sys_language",
  id: "uuid-789",              // referencedFieldID: "id"
  name: "English",             // referencedFieldName: "name"
  _cached_at: 1696598400000
}
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
│         _cached_at: { $gt: Date.now() - TTL }          │
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
  _cached_at: number;    // Unix timestamp for TTL
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
   * @param limit - Number of records to load (default: 100)
   * @param offset - Offset for pagination (default: 0)
   */
  async loadDictionary(
    tableName: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<DictionaryDocument[]> {
    // Add to loading set
    const currentLoading = this.loadingTables.value;
    currentLoading.add(tableName);
    this.loadingTables.value = new Set(currentLoading);

    try {
      // Fetch from API
      const response = await fetch(
        `/api/dictionaries/${tableName}?limit=${limit}&offset=${offset}`
      );

      if (!response.ok) {
        throw new Error(`Failed to load ${tableName}: ${response.statusText}`);
      }

      const data = await response.json();
      const records: any[] = data.records || [];

      // Transform and insert into RxDB
      // Only take fields specified in config: referencedFieldID and referencedFieldName
      const documents: DictionaryDocument[] = records.map(record => ({
        composite_id: `${tableName}::${record.id}`,
        table_name: tableName,
        id: record.id,              // referencedFieldID (from config)
        name: record.name,          // referencedFieldName (from config)
        _cached_at: Date.now()
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
   * @param options - Query options (search, limit, offset)
   */
  async getDictionary(
    tableName: string,
    options: {
      search?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ records: DictionaryDocument[]; total: number; hasMore: boolean }> {
    if (!this.dictionariesCollection) {
      throw new Error('[DictionaryStore] Not initialized');
    }

    const { search, limit = 30, offset = 0 } = options;

    // Check if we have any cached records for this table
    const cachedCount = await this.dictionariesCollection
      .count({
        selector: {
          table_name: tableName,
          _cached_at: { $gt: Date.now() - this.TTL } // Not expired
        }
      })
      .exec();

    // If no cache or expired, load from server
    if (cachedCount === 0) {
      await this.loadDictionary(tableName, limit, offset);
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
          _cached_at: {
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
        // Always use DictionaryStore for DropdownInput
        const { records } = await dictionaryStore.getDictionary(referencedTable, {
          limit: 30,
          offset: 0
        });

        // Transform to dropdown options
        const opts = records.map(record => ({
          value: record.id,
          label: record.name
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
  dataSource?: 'collection' | 'dictionary' | 'server-search';
  value?: string;
  onValueChange?: (value: string) => void;
  // ... other props
}

export const LookupInput = forwardRef<HTMLInputElement, LookupInputProps>(
  ({
    referencedTable,
    dataSource = 'collection', // Default for LookupInput
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

        // Strategy based on dataSource
        switch (dataSource) {
          case 'collection': {
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
            break;
          }

          case 'dictionary': {
            // Use DictionaryStore cache
            const result = await dictionaryStore.getDictionary(referencedTable, {
              search: query,
              limit: 30
            });
            records = result.records;
            break;
          }

          case 'server-search': {
            // Server-side search for large dictionaries
            const response = await fetch(
              `/api/dictionaries/${referencedTable}/search?q=${query}&limit=30`
            );
            const data = await response.json();
            records = data.records;
            break;
          }
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

## 7. Implementation Phases

### Phase 1: Foundation (Week 1)
- [x] Analyze referenced tables
- [ ] Create universal dictionaries schema
- [ ] Implement DictionaryStore
- [ ] Create API endpoints

### Phase 2: Integration (Week 2)
- [ ] Integrate DictionaryStore with AppStore initialization
- [ ] Implement Tier 1 preloading
- [ ] Update DropdownInput to use DictionaryStore
- [ ] Test with pet_type, country, currency

### Phase 3: Optimization (Week 3)
- [ ] Implement Tier 2 background loading
- [ ] Implement Tier 3 lazy loading
- [ ] Add scroll pagination
- [ ] Implement search functionality

### Phase 4: Finalization (Week 4)
- [ ] Handle 63 unknown tables
- [ ] Implement TTL cleanup
- [ ] Performance testing
- [ ] Documentation

---

## 8. Memory & Performance Estimates

### 8.1 Memory Footprint

**Simplified Schema = Much Smaller Footprint**

```
Universal Dictionaries Collection:
  - 99 dictionary tables
  - ~2000 total records (avg 20 per table)
  - ~150 bytes per record (only 5 fields: composite_id, table_name, id, name, _cached_at)
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

4. **Optional: Large dictionaries** can use `dataSource: "server-search"`:
   ```json
   {
     "name": "city_id",
     "component": "LookupInput",
     "isForeignKey": true,
     "referencedTable": "city",
     "dataSource": "server-search"  // Large dictionary, server-side only
   }
   ```

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

5. ✅ **No preloading, no tiers, no complexity**

**The strategy is config-driven and interaction-driven.**
