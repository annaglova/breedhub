# 📚 Dictionary Caching Strategy

## 🎯 Проблема

У нас є:
- **Dictionaries** (довідники): pet_type, coat_type, color, status, etc.
- **Child tables** (дочірні таблиці): breed_group, country, kennel, etc.
- **Lookup fields** в фільтрах/формах потребують options

**Питання:** Звідки брати options для dropdown/lookup полів?

**Варіанти:**
- ❌ **Fetch з БД кожен раз** - повільно
- ✅ **Cache в RxDB** - швидко, local-first
- ⚠️ **Static config** - тільки для малих stable довідників

---

## 🏗️ Гібридна Стратегія

### 1. **Категорії довідників**

#### A. **Critical Dictionaries** (Preload при ініціалізації)
Маленькі, стабільні, часто використовуються

```typescript
const CRITICAL_DICTIONARIES = [
  'pet_type',           // 5-10 records
  'breed_status',       // 3-5 records
  'achievement_type',   // 10-15 records
  'sex',               // 2-3 records
  'registration_type', // 5-10 records
];
```

**Characteristics:**
- Розмір: < 50 records
- Стабільні (рідко змінюються)
- Використовуються в 80% форм
- Total size: ~2-5 KB

**Коли завантажувати:** При app initialization, before user sees UI

---

#### B. **Common Dictionaries** (Lazy Load + Cache)
Середні, стабільні, іноді використовуються

```typescript
const COMMON_DICTIONARIES = [
  'breed_group',        // 50-100 records
  'coat_type',          // 20-50 records
  'color',              // 50-200 records
  'country',            // 200-300 records
  'kennel_status',      // 10-20 records
];
```

**Characteristics:**
- Розмір: 50-500 records
- Відносно стабільні
- Використовуються в 30-50% форм
- Total size: ~10-50 KB per dictionary

**Коли завантажувати:**
- При першому відкритті dropdown (lazy)
- Cache на 24 години
- Background refresh при app focus

---

#### C. **Large Lookups** (Search-based, no full cache)
Великі таблиці, динамічні

```typescript
const LARGE_LOOKUPS = [
  'breed',              // 400+ records
  'kennel',             // 1000+ records
  'animal',             // 10000+ records
  'user',               // 1000+ records
];
```

**Characteristics:**
- Розмір: > 500 records
- Динамічні (часто оновлюються)
- Потрібен search/filter
- Не можна кешувати повністю

**Як працювати:**
- Autocomplete з server search
- Cache останні 20 selected values
- Server-side pagination

---

### 2. **Hybrid Collections Strategy** ✨

#### A. **Dictionaries → ONE universal collection**

**Характеристика довідників:**
- Стандартна структура: `id, name, code, order, active`
- Маленькі таблиці (< 500 records кожна)
- Рідко змінюються
- Використовуються для dropdown options

**Приклади:** pet_type, coat_type, color, status, achievement_type, sex, etc.

**Рішення:** Одна `dictionaries` collection з composite key

```typescript
// Universal dictionary schema
const dictionarySchema = {
  version: 0,
  primaryKey: {
    key: 'composite_id',
    fields: ['table_name', 'id'],
    separator: '::' // pet_type::uuid-123
  },
  type: 'object',
  properties: {
    composite_id: { type: 'string' }, // "pet_type::uuid-123"
    table_name: { type: 'string' },   // "pet_type"
    id: { type: 'string' },           // "uuid-123"
    name: { type: 'string' },         // "Dog"
    code: { type: 'string' },         // "dog"
    order: { type: 'number' },        // 1
    active: { type: 'boolean' },      // true
    metadata: { type: 'object' },     // Extra fields
    _cached_at: { type: 'number' },   // Timestamp для TTL
    _category: { type: 'string' },    // "critical" | "common" | "large"
  },
  required: ['composite_id', 'table_name', 'id', 'name'],
  indexes: [
    'table_name',           // Query by table
    '_cached_at',           // TTL cleanup
    ['table_name', 'name'], // Search within table
  ]
};
```

**Переваги:**
- ✅ Тільки 1 collection замість 200
- ✅ Простіший код
- ✅ Легше керувати TTL
- ✅ Менше overhead

**Example records:**
```typescript
[
  {
    composite_id: "pet_type::uuid-dog",
    table_name: "pet_type",
    id: "uuid-dog",
    name: "Dog",
    code: "dog",
    order: 1,
    active: true,
    _cached_at: 1699000000000,
    _category: "critical"
  },
  {
    composite_id: "breed_group::uuid-sporting",
    table_name: "breed_group",
    id: "uuid-sporting",
    name: "Sporting Group",
    code: "sporting",
    order: 1,
    active: true,
    _cached_at: 1699000000000,
    _category: "common"
  }
]
```

---

#### B. **Child Tables → Separate collections**

**Характеристика дочірніх таблиць:**
- Різноманітна структура (різні поля для кожної таблиці)
- Можуть бути великими (> 1000 records)
- Часто оновлюються
- Використовуються для lookups і relations

**Приклади:** breed, kennel, country, breed_group, animal, litter, etc.

**Рішення:** Окремі RxDB колекції для кожної потрібної child table

```typescript
// Example: breed_group collection
const breedGroupSchema = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    description: { type: 'string' },
    pet_type_id: { type: 'string' },
    order: { type: 'number' },
    active: { type: 'boolean' },
    icon: { type: 'string' },
    metadata: { type: 'object' },
    _cached_at: { type: 'number' },
  },
  required: ['id', 'name'],
  indexes: ['name', 'pet_type_id', '_cached_at']
};

// Example: country collection
const countrySchema = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    code: { type: 'string' },        // ISO code
    phone_code: { type: 'string' },  // +1, +44, etc.
    flag_emoji: { type: 'string' },  // 🇺🇸
    continent: { type: 'string' },
    active: { type: 'boolean' },
    _cached_at: { type: 'number' },
  },
  required: ['id', 'name', 'code'],
  indexes: ['name', 'code', 'continent', '_cached_at']
};
```

**Коли створювати окрему колекцію:**
- ✅ Використовується часто в UI (> 10 разів на день)
- ✅ Потрібен offline access
- ✅ Має унікальні поля, що використовуються в фільтрах/формах
- ✅ Розмір < 5000 records

**Коли НЕ створювати (залишити server-side search):**
- ❌ Використовується рідко (< 1 раз на день)
- ❌ Дуже велика таблиця (> 10000 records)
- ❌ Швидко змінюється (real-time data)

---

### 3. **Collection Categories Summary**

| Type | Collections | Strategy | Example |
|------|-------------|----------|---------|
| **Dictionaries** | 1 universal | Composite key | pet_type, coat_type, color |
| **Common Child Tables** | ~10-20 separate | Standard schema | breed_group, country, kennel_status |
| **Large Child Tables** | No cache | Server search | breed, animal, kennel, user |
| **Main Entities** | Per entity type | Already exists | breed, animal, litter (main data) |

**Total RxDB collections:** ~25-30 замість 200+ ✅

---

### 4. **DictionaryStore Implementation**

```typescript
class DictionaryStore {
  private rxdb: RxDatabase;
  private supabase: SupabaseClient;
  private cacheTTL = 24 * 60 * 60 * 1000; // 24 hours

  // Table type classification
  private readonly dictionaryTables = new Set([
    'pet_type', 'coat_type', 'color', 'sex', 'status',
    'achievement_type', 'registration_type', 'title_type'
    // Add all dictionary tables
  ]);

  private readonly childTableCollections = new Set([
    'breed_group', 'country', 'kennel_status', 'litter_status'
    // Add child tables that have separate collections
  ]);

  /**
   * Determine table type and collection
   */
  private getTableInfo(tableName: string): {
    type: 'dictionary' | 'child' | 'large';
    collection: RxCollection | null;
  } {
    if (this.dictionaryTables.has(tableName)) {
      return {
        type: 'dictionary',
        collection: this.rxdb['dictionaries']
      };
    }

    if (this.childTableCollections.has(tableName)) {
      return {
        type: 'child',
        collection: this.rxdb[tableName]
      };
    }

    return {
      type: 'large',
      collection: null // No cache, server-side only
    };
  }

  /**
   * Preload critical dictionaries at app start
   */
  async preloadCriticalDictionaries(): Promise<void> {
    console.log('[DictionaryStore] Preloading critical dictionaries...');

    await Promise.all(
      CRITICAL_DICTIONARIES.map(name =>
        this.loadDictionary(name, { force: false })
      )
    );

    console.log('[DictionaryStore] Critical dictionaries loaded');
  }

  /**
   * Load dictionary/child table with cache
   */
  async loadDictionary(
    tableName: string,
    options: { force?: boolean; limit?: number } = {}
  ): Promise<DictionaryItem[]> {
    const { type, collection } = this.getTableInfo(tableName);

    if (!collection) {
      console.warn(`[DictionaryStore] No collection for ${tableName}, use server search`);
      return [];
    }

    // Check cache freshness
    if (!options.force) {
      const cached = await this.getCachedData(collection, tableName, type);
      if (cached.length > 0) {
        console.log(`[DictionaryStore] Using cached ${tableName}: ${cached.length} items`);
        return cached;
      }
    }

    // Fetch from Supabase
    console.log(`[DictionaryStore] Fetching ${tableName} from Supabase...`);
    const { data, error } = await this.supabase
      .from(tableName)
      .select('*') // Select all fields (different for child tables)
      .eq('active', true)
      .order('order', { ascending: true })
      .limit(options.limit || 500);

    if (error) {
      console.error(`[DictionaryStore] Error fetching ${tableName}:`, error);
      return [];
    }

    // Cache in RxDB
    if (data && data.length > 0) {
      await this.cacheData(collection, tableName, type, data);
      console.log(`[DictionaryStore] Cached ${tableName}: ${data.length} items`);
      return data;
    }

    return [];
  }

  /**
   * Get cached data (handles both dictionary and child table types)
   */
  private async getCachedData(
    collection: RxCollection,
    tableName: string,
    type: 'dictionary' | 'child'
  ): Promise<any[]> {
    const cutoff = Date.now() - this.cacheTTL;

    if (type === 'dictionary') {
      // Universal collection - filter by table_name
      const docs = await collection
        .find()
        .where('table_name').eq(tableName)
        .where('_cached_at').gt(cutoff)
        .exec();

      return docs.map(doc => {
        const data = doc.toJSON();
        // Strip internal fields
        const { composite_id, table_name, _cached_at, _category, ...item } = data;
        return item;
      });
    } else {
      // Separate collection - just check TTL
      const docs = await collection
        .find()
        .where('_cached_at').gt(cutoff)
        .exec();

      return docs.map(doc => doc.toJSON());
    }
  }

  /**
   * Cache data (handles both dictionary and child table types)
   */
  private async cacheData(
    collection: RxCollection,
    tableName: string,
    type: 'dictionary' | 'child',
    data: any[]
  ): Promise<void> {
    const now = Date.now();

    if (type === 'dictionary') {
      // Universal collection - add composite_id
      const records = data.map(item => ({
        composite_id: `${tableName}::${item.id}`,
        table_name: tableName,
        ...item,
        _cached_at: now,
        _category: CRITICAL_DICTIONARIES.includes(tableName) ? 'critical' : 'common'
      }));

      await collection.bulkUpsert(records);
    } else {
      // Separate collection - add _cached_at
      const records = data.map(item => ({
        ...item,
        _cached_at: now
      }));

      await collection.bulkUpsert(records);
    }
  }

  /**
   * Get options for dropdown/lookup
   */
  async getOptions(
    tableName: string,
    options: {
      searchTerm?: string;
      limit?: number;
      includeInactive?: boolean;
    } = {}
  ): Promise<Array<{ value: string; label: string; disabled?: boolean }>> {
    const items = await this.loadDictionary(tableName, { limit: options.limit });

    let filtered = items;

    // Filter by search term
    if (options.searchTerm) {
      const term = options.searchTerm.toLowerCase();
      filtered = items.filter(item =>
        item.name.toLowerCase().includes(term)
      );
    }

    // Convert to dropdown options
    return filtered.map(item => ({
      value: item.id,
      label: item.name,
      disabled: !item.active && !options.includeInactive
    }));
  }

  /**
   * Search large lookup tables (server-side)
   */
  async searchLookup(
    tableName: string,
    searchTerm: string,
    limit: number = 20
  ): Promise<Array<{ value: string; label: string }>> {
    if (!searchTerm || searchTerm.length < 2) {
      return [];
    }

    const { data, error } = await this.supabase
      .from(tableName)
      .select('id, name')
      .ilike('name', `%${searchTerm}%`)
      .limit(limit);

    if (error) {
      console.error(`[DictionaryStore] Search error for ${tableName}:`, error);
      return [];
    }

    return data?.map(item => ({
      value: item.id,
      label: item.name
    })) || [];
  }

  /**
   * Clear expired cache (both dictionaries and child tables)
   */
  async clearExpiredCache(): Promise<void> {
    const cutoff = Date.now() - this.cacheTTL;

    // Clear expired dictionaries from universal collection
    const dictCollection = this.rxdb['dictionaries'];
    if (dictCollection) {
      const expired = await dictCollection
        .find()
        .where('_cached_at').lt(cutoff)
        .exec();

      if (expired.length > 0) {
        await dictCollection.bulkRemove(expired.map(doc => doc.composite_id));
        console.log(`[DictionaryStore] Removed ${expired.length} expired dictionaries`);
      }
    }

    // Clear expired child tables
    for (const tableName of this.childTableCollections) {
      const collection = this.rxdb[tableName];
      if (!collection) continue;

      const expired = await collection
        .find()
        .where('_cached_at').lt(cutoff)
        .exec();

      if (expired.length > 0) {
        await collection.bulkRemove(expired.map(doc => doc.id));
        console.log(`[DictionaryStore] Removed ${expired.length} expired items from ${tableName}`);
      }
    }
  }

  /**
   * Background refresh for critical dictionaries
   */
  async backgroundRefresh(): Promise<void> {
    console.log('[DictionaryStore] Background refresh started...');

    await Promise.all(
      CRITICAL_DICTIONARIES.map(name =>
        this.loadDictionary(name, { force: true })
      )
    );

    console.log('[DictionaryStore] Background refresh completed');
  }
}
```

---

### 4. **Integration з FilterFields**

**У конфігу додаємо `lookupTable`:**

```json
{
  "filter_fields": {
    "breed_field_pet_type_id": {
      "order": 2,
      "component": "DropdownInput",
      "displayName": "Pet Type",
      "placeholder": "Select pet type",
      "fieldType": "uuid",
      "operator": "eq",
      "lookupTable": "pet_type",
      "lookupCategory": "critical"
    },
    "breed_field_breed_group_id": {
      "order": 3,
      "component": "LookupInput",
      "displayName": "Breed Group",
      "placeholder": "Search breed group",
      "fieldType": "uuid",
      "operator": "eq",
      "lookupTable": "breed_group",
      "lookupCategory": "common"
    }
  }
}
```

**SpaceStore.getFilterFields() оновлюється:**

```typescript
async getFilterFields(entityType: string): Promise<FilterFieldConfig[]> {
  // ... existing code ...

  for (const [fieldId, fieldConfig] of Object.entries(filterFields)) {
    const field = fieldConfig as any;

    // Load options for dropdown/lookup fields
    if (field.lookupTable) {
      const dictionaryStore = this.getDictionaryStore();

      if (field.lookupCategory === 'large') {
        // Large lookups use search, no preload
        field.options = [];
        field.searchable = true;
      } else {
        // Small/medium dictionaries - load options
        field.options = await dictionaryStore.getOptions(field.lookupTable);
      }
    }

    filterOptions.push({
      id: fieldId,
      displayName: field.displayName,
      component: field.component,
      placeholder: field.placeholder,
      fieldType: field.fieldType,
      operator: field.operator,
      order: field.order,
      options: field.options,
      lookupTable: field.lookupTable,
      searchable: field.searchable,
    });
  }

  return filterOptions;
}
```

---

### 5. **Компоненти з Search**

**LookupInput для великих таблиць:**

```typescript
interface LookupInputProps {
  label: string;
  lookupTable: string;
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
}

export function LookupInput({
  label,
  lookupTable,
  value,
  onValueChange,
  placeholder
}: LookupInputProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [options, setOptions] = useState<Option[]>([]);
  const [loading, setLoading] = useState(false);
  const dictionaryStore = useDictionaryStore();

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchTerm.length >= 2) {
        setLoading(true);
        const results = await dictionaryStore.searchLookup(
          lookupTable,
          searchTerm,
          20
        );
        setOptions(results);
        setLoading(false);
      } else {
        setOptions([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, lookupTable]);

  return (
    <Autocomplete
      label={label}
      value={value}
      onValueChange={onValueChange}
      options={options}
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      loading={loading}
      placeholder={placeholder}
    />
  );
}
```

---

## 📋 Implementation Plan

### Phase 1: Dictionary Collections Setup
- [ ] Create RxDB collections for dictionaries
- [ ] Define schema with TTL support
- [ ] Implement DictionaryStore class
- [ ] Add dictionary categories (critical/common/large)

### Phase 2: Preload Critical Dictionaries
- [ ] Identify critical dictionaries (< 50 records each)
- [ ] Preload at app initialization
- [ ] Show loading state during preload
- [ ] Test performance impact

### Phase 3: Lazy Load Common Dictionaries
- [ ] Load on first dropdown open
- [ ] Cache in RxDB with TTL
- [ ] Background refresh on app focus
- [ ] Clear expired cache periodically

### Phase 4: Search-based Lookups
- [ ] Implement searchLookup() with server query
- [ ] Create LookupInput component with autocomplete
- [ ] Debounced search (300ms)
- [ ] Cache last 20 selected values

### Phase 5: Config Integration
- [ ] Add `lookupTable` to filter config
- [ ] Add `lookupCategory` (critical/common/large)
- [ ] Update getFilterFields() to load options
- [ ] Update FiltersDialog to use options

### Phase 6: Optimization
- [ ] Monitor dictionary sizes
- [ ] Set appropriate TTL per category
- [ ] Implement background sync
- [ ] Add metrics/analytics

---

## 🎯 Decision Matrix

| Dictionary Type | Size | Strategy | Cache | Example |
|----------------|------|----------|-------|---------|
| Critical | < 50 | Preload | 24h | pet_type, sex, status |
| Common | 50-500 | Lazy + Cache | 24h | breed_group, color, country |
| Large | > 500 | Search only | Last 20 | breed, kennel, animal |

---

## 💡 Key Benefits

1. **Fast UX:** Critical dictionaries available instantly
2. **Memory efficient:** Don't cache everything
3. **Bandwidth efficient:** Cache with TTL
4. **Scalable:** Search-based for large tables
5. **Offline-ready:** Cached dictionaries work offline

---

## 🐛 Edge Cases

### Issue 1: New dictionary value added in DB
**Solution:** Background refresh + TTL expires cache

### Issue 2: User needs value not in cache
**Solution:** Search-based lookup always queries server

### Issue 3: Dictionary too large for dropdown
**Solution:** Auto-switch to LookupInput (search-based) if > 500 items

### Issue 4: Cold start performance
**Solution:** Show skeleton UI during preload, lazy load non-critical

---

## 📊 Final Architecture

### Collections Structure

```
RxDB Database
├── dictionaries (1 universal collection)
│   ├── pet_type::uuid-1 (Dog)
│   ├── pet_type::uuid-2 (Cat)
│   ├── coat_type::uuid-1 (Short)
│   └── ... (~150+ dictionary tables)
│
├── breed_group (separate collection)
│   ├── uuid-sporting (Sporting Group)
│   └── ... (~50 records)
│
├── country (separate collection)
│   ├── uuid-usa (United States)
│   └── ... (~200 records)
│
└── ... (~10-15 child table collections)
```

### Memory Footprint Estimate

| Type | Collections | Records | Size per record | Total Size |
|------|-------------|---------|----------------|-----------|
| Dictionaries | 1 | ~2000 | 0.5 KB | ~1 MB |
| Child Tables | 15 | ~5000 | 1 KB | ~5 MB |
| **Total** | **~16** | **~7000** | **-** | **~6 MB** |

**Conclusion:** Розумний кешинг, не перевантажуємо клієнт ✅

---

## 🎯 Key Decisions Summary

1. **Dictionaries → ONE universal collection** ✅
   - Стандартна структура (id, name, code, order, active)
   - Composite key: `table_name::id`
   - ~150 довідникових таблиць в одній колекції

2. **Child Tables → Separate collections** ✅
   - Різні поля для кожної таблиці
   - Тільки для часто використовуваних (10-20 таблиць)
   - Уникаємо кешування великих таблиць (> 5000 records)

3. **Large Tables → Server-side search** ✅
   - Не кешуємо взагалі
   - Autocomplete з Supabase
   - Cache лише останні 20 selected values

4. **TTL = 24 hours** ✅
   - Background refresh для critical
   - Automatic cleanup expired data

---

**Ready to implement! 🚀**

