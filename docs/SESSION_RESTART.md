# 🔄 SESSION RESTART - BREEDHUB PROJECT

## 📅 Останнє оновлення: 2025-10-06

## 🎯 ПОТОЧНИЙ СТАН

**Статус:** Ready for Development ✅

**Що працює:**
- Dynamic rows з view config (30 для breed/list, 60 для breed/grid, etc.)
- Manual pagination - scroll підгружає дані on-demand
- Checkpoint persistence - продовження після reload
- Batch UI updates - стрибки 30→60→90 без flickering
- Instant totalCount - миттєве відображення з localStorage cache
- Dynamic sorting - SortSelector з конфігу ✅
- Dynamic filters - FiltersDialog з динамічним рендерингом ✅
- Sort/Filter configs на space рівні (не view) ✅
- mainFilterField handling - виключення з filter modal ✅

**Поточна гілка:** `main`

---

## 🏗️ АРХІТЕКТУРА: Принцип роботи

### 🔥 Ключова ідея
**RxDB = Smart Cache (НЕ повна копія БД!)**

У нас таблиці з 9+ млн записів. Завантажуємо тільки те, що користувач бачить.

```
View Config (rows: 30)
  ↓
Initial Load: 30 записів
  ↓
RxDB Cache: ~200-500 записів max
  ↓
UI показує: 30, 60, 90... (scroll підгружає)
Total count: 452 (з Supabase metadata)
```

### Як працює Manual Pagination

1. **Initial Load (автоматично при відкритті сторінки)**
   - Завантажує `rows` записів з конфігу (напр. 30)
   - Зберігає в RxDB як smart cache
   - Показує totalCount з Supabase metadata

2. **Scroll Load (manual, on-demand)**
   - Користувач скролить до кінця списку
   - `handleLoadMore()` → `spaceStore.loadMore()` → `manualPull()`
   - Завантажує наступні `rows` записів (30)
   - Checkpoint зберігається в localStorage

3. **Checkpoint Persistence**
   - Checkpoint = `updated_at` останнього документа в RxDB
   - Зберігається в localStorage при кожному pull
   - При reload - продовжує з того місця, де зупинився

4. **Batch UI Updates**
   - INSERT events накопичуються в buffer
   - Flush коли досягнуто `expectedBatchSize` (30)
   - UI оновлюється одним батчем: 30→60→90

### Configuration Hierarchy

```
app_config
  └── workspaces (container)
      └── workspace
          └── spaces (container)
              └── space
                  ├── sort_fields (container) ← Sort configs at space level
                  ├── filter_fields (container) ← Filter configs at space level
                  ├── views (container)
                  │   └── view
                  │       └── fields (container) ← Display fields only
                  └── pages (container)
                      └── page
                          └── fields (container)
```

**Key principle:** Sort/filter configs live at space level, not view level
- Eliminates duplication across views (list, grid, tab)
- Enables URL query params to persist across view changes
- Logically correct: entity-level filters vs display-level views

---

## 📂 ОСНОВНІ ФАЙЛИ

### Core Services
```
packages/rxdb-store/src/
├── services/entity-replication.service.ts  # Manual pull, checkpoint logic
├── stores/space-store.signal-store.ts      # getViewRows(), loadMore(), getSortOptions(), getFilterFields()
├── stores/app-config.signal-store.ts       # childContainerMapping, config hierarchy
└── stores/base/entity-store.ts             # EntityStore з totalFromServer signal
```

### UI Components
```
apps/app/src/
├── components/
│   ├── space/
│   │   ├── SpaceComponent.tsx              # handleLoadMore, scroll integration
│   │   ├── SpaceView.tsx                   # Scroll handler, infinite scroll
│   │   ├── EntitiesCounter.tsx             # "Showing X of Y"
│   │   └── filters/
│   │       ├── FiltersDialog.tsx           # Dynamic filter rendering
│   │       ├── SortFilterSelector.tsx      # Sort + Filter button
│   │       ├── SortSelector.tsx            # Dynamic sort dropdown
│   │       └── FiltersSection.tsx          # Container for sort/filter
│   └── layout/
│       ├── Header.tsx                      # Top navigation
│       ├── Sidebar.tsx                     # Left navigation (spaces)
│       └── UserDrawer.tsx                  # Right drawer menu
└── hooks/useEntities.ts                    # Subscriptions на RxDB changes
```

### Config Scripts
```
apps/config-admin/scripts/
├── generate-entity-configs.cjs             # Generate entity JSON from DB schema
├── generate-sql-inserts.cjs                # Generate SQL from entity JSON files
├── rebuild-hierarchy.cjs                   # Rebuild nested config structures
└── update-db-from-json.cjs                 # Apply all updates sequentially
```

---

## 🚀 ШВИДКИЙ СТАРТ

```bash
# Запустити dev server
cd /Users/annaglova/projects/breedhub
pnpm dev:app

# Перевірити конфіги в БД
node apps/config-admin/scripts/test/check-db.cjs

# DevTools: Application → IndexedDB → rxdb-dexie-breed → rxdocuments
# Refresh database view щоб побачити актуальні дані!

# Очистити IndexedDB при schema changes:
# Console: indexedDB.deleteDatabase('rxdb-dexie-breedhub')
# Потім: F5
```

---

## 📚 ДЕТАЛЬНА ДОКУМЕНТАЦІЯ

### Реалізація
- `/docs/DYNAMIC_VIEW_ROWS_IMPLEMENTATION.md` - Dynamic rows implementation
- `/docs/LOCAL_FIRST_ROADMAP.md` - Загальний roadmap проекту
- `/docs/UNIVERSAL_STORE_IMPLEMENTATION.md` - Universal store architecture

### Архітектура
- `/docs/PROPERTY_BASED_CONFIG_ARCHITECTURE.md` - Конфігураційна система
- `/docs/SPACE_STORE_ARCHITECTURE.md` - SpaceStore архітектура
- `/docs/RXDB_INTEGRATION.md` - Інтеграція з RxDB

### Config Admin
- `/apps/config-admin/docs/SCRIPTS.md` - Config generation scripts
- `/apps/config-admin/docs/WORKFLOW.md` - Development workflow

---

## 🔍 КРИТИЧНІ ПРИНЦИПИ

1. **View config = single source of truth**
   - Визначає UI rows
   - Визначає replication batchSize
   - Різні views = різні batch sizes

2. **RxDB = smart кеш, НЕ повна БД**
   - Зберігає ~200-500 записів
   - Завантажуємо on-demand
   - 9 млн на клієнті = катастрофа ❌

3. **Manual pagination > Continuous replication**
   - Initial load: rows записів
   - Scroll: +rows записів
   - Checkpoint для продовження

4. **Total count з Supabase metadata**
   - Кешується в localStorage
   - Миттєве відображення в UI
   - Оновлюється при кожному pull

5. **Batch UI updates**
   - INSERT events буферизуються
   - Flush по досягненню batch size
   - Без flickering в UI

6. **Sort/Filter at space level, not view level**
   - Space = entity workspace (breeds, animals, etc.)
   - View = display mode (list, grid, tab)
   - Filters/sort apply to entity, not display

---

## 🎨 DYNAMIC FILTERS & SORTING

### Sort Options
**Config location:** `space.sort_fields`

```json
{
  "sort_fields": {
    "sort_name_asc": {
      "order": 1,
      "label": "Name A-Z",
      "field": "name",
      "direction": "asc"
    }
  }
}
```

**Usage:**
```typescript
// SpaceStore method
const sortOptions = spaceStore.getSortOptions(entityType, viewType);

// Returns:
[
  { id: 'sort_name_asc', label: 'Name A-Z', field: 'name', direction: 'asc' }
]
```

### Filter Fields
**Config location:** `space.filter_fields`

```json
{
  "filter_fields": {
    "breed_field_name": {
      "order": 1,
      "component": "TextInput",
      "displayName": "Name",
      "placeholder": "Enter name",
      "fieldType": "string",
      "operator": "contains",
      "mainFilterField": false
    }
  }
}
```

**Usage:**
```typescript
// SpaceStore methods
const filterFields = spaceStore.getFilterFields(entityType, viewType);
const mainFilter = spaceStore.getMainFilterField(entityType);

// filterFields excludes mainFilterField (used for search bar)
// mainFilter returns the field with mainFilterField: true
```

**Dynamic rendering:**
```tsx
import { TextInput, DropdownInput, DateInput } from '@ui/components/form-inputs';

const componentMap = {
  TextInput, DropdownInput, DateInput,
  TextareaInput, NumberInput, CheckboxInput,
  TimeInput, LookupInput, EmailInput,
  PasswordInput, FileInput, RadioInput, SwitchInput
};

{filterFields.map((field) => {
  const Component = componentMap[field.component];
  return <Component key={field.id} label={field.displayName} {...props} />;
})}
```

---

## 💡 ВАЖЛИВІ НОТАТКИ

- DevTools IndexedDB viewer НЕ оновлюється автоматично - треба Refresh!
- Checkpoint використовує `updated_at` з RxDB, не localStorage (для точності)
- BulkUpsert швидше за individual upserts
- Batch buffer запобігає UI flickering при масових вставках
- TotalCount з localStorage = instant UI feedback (50-200ms)
- Sort/Filter configs на space рівні, НЕ на view рівні
- mainFilterField виключається з filter modal (використовується для search bar)
- Component names в конфігу = точні назви компонентів (TextInput, НЕ "text")

---

## 🐛 TROUBLESHOOTING

**Проблема:** Scroll не підгружає дані
- Перевірити `hasMore` prop в SpaceView
- Перевірити `isLoadingMore` state
- Консоль: чи викликається `handleLoadMore`

**Проблема:** IndexedDB показує старі дані
- Клік правою → Refresh database в DevTools
- Або використай `await collection.count().exec()` в консолі

**Проблема:** Дублікати після reload
- Checkpoint queries RxDB для latest document
- Перевірити localStorage: `checkpoint_breed`

**Проблема:** RxDB schema hash mismatch
- Console: `indexedDB.deleteDatabase('rxdb-dexie-breedhub')`
- Refresh page (F5)
- Це нормально після зміни schema/config structure

**Проблема:** 4th menu item в header (user_config)
- Перевірити rebuild-hierarchy.cjs
- user_config має бути окремо від workspaces container
- Перезапустити rebuild-hierarchy script

---

## 📋 НАСТУПНА ЗАДАЧА: Dictionary Loading Strategy

**Статус:** Ready to Start
**Документація:** `/docs/DICTIONARY_LOADING_STRATEGY.md`
**Оцінка часу:** 3-4 дні роботи

### 🎯 Мета

Реалізувати систему кешування довідників (dictionaries) для DropdownInput та LookupInput компонентів:
- **Dictionaries** (120+ таблиць) → ONE universal RxDB collection
- **Main entities** (breed, pet, account) → Existing collections
- **On-demand loading** - завантажуємо тільки при відкритті dropdown
- **TTL cleanup** - автоматичне видалення старих записів

### 🏗️ Архітектура

```
Config (dataSource field)
  ↓
Component opens (DropdownInput/LookupInput)
  ↓
Check dataSource:
  - "collection" → Use existing RxDB collection (breed, pet, etc.)
  - not specified → Use DictionaryStore (pet_type, country, etc.)
  ↓
DictionaryStore:
  1. Check RxDB cache
  2. If not found → fetch from Supabase
  3. Save to RxDB with composite key (table_name::id)
  4. Return to UI
```

### 📐 Детальний План Імплементації

#### **День 1: Foundation (3-4 год)**

**1.1 Створити Schema (30 хв)**
```bash
File: packages/rxdb-store/src/collections/dictionaries.schema.ts
```

**Schema structure:**
```typescript
{
  primaryKey: {
    key: 'composite_id',
    fields: ['table_name', 'id'],
    separator: '::'
  },
  properties: {
    composite_id: string,  // "pet_type::uuid-123"
    table_name: string,     // "pet_type"
    id: string,             // "uuid-123"
    name: string,           // "Dog"
    _cached_at: number      // 1696598400000
  },
  indexes: ['table_name', ['table_name', 'name'], '_cached_at']
}
```

**1.2 Створити DictionaryStore Skeleton (1 год)**
```bash
File: packages/rxdb-store/src/stores/dictionary-store.signal-store.ts
```

**Methods:**
- `initialize()` - Створити колекцію dictionaries якщо не існує
- `loadDictionary(tableName, limit, offset)` - Fetch + RxDB bulkInsert
- `getDictionary(tableName, options)` - Read from RxDB cache
- `cleanupExpired()` - Видалити записи старші за TTL

**1.3 Інтегрувати з AppStore (30 хв)**
```typescript
// app-store.signal-store.ts
async initialize() {
  // ... existing code ...

  this.initialized.value = true;

  // Initialize DictionaryStore асинхронно (без await!)
  this.initializeDictionaryStore();
}

private async initializeDictionaryStore() {
  try {
    await dictionaryStore.initialize();
    console.log('[AppStore] DictionaryStore ready');
  } catch (error) {
    console.error('[AppStore] DictionaryStore init failed:', error);
  }
}
```

**1.4 Експорт (15 хв)**
```typescript
// packages/rxdb-store/src/index.ts
export { dictionaryStore } from './stores/dictionary-store.signal-store';
```

**1.5 Базове Тестування (1 год)**
- Перевірити що AppStore не падає
- Перевірити що колекція створюється
- Console logs для debugging

---

#### **День 2: Backend + Loading (4-5 год)**

**2.1 Supabase Client Integration (1 год)**
```typescript
// В DictionaryStore додати Supabase client (як в app-config.signal-store)
private supabase: SupabaseClient;

constructor() {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  this.supabase = createClient(supabaseUrl, supabaseKey);
}
```

**2.2 Implement loadDictionary() (2 год)**
```typescript
async loadDictionary(tableName: string, limit = 100, offset = 0) {
  // 1. Fetch з Supabase
  const { data, error } = await this.supabase
    .from(tableName)
    .select('id, name')
    .order('name', { ascending: true })
    .range(offset, offset + limit - 1);

  // 2. Transform для RxDB
  const documents = data.map(record => ({
    composite_id: `${tableName}::${record.id}`,
    table_name: tableName,
    id: record.id,
    name: record.name,
    _cached_at: Date.now()
  }));

  // 3. BulkInsert в RxDB
  await this.collection.bulkInsert(documents);

  return documents;
}
```

**2.3 Implement getDictionary() (1 год)**
```typescript
async getDictionary(tableName: string, options: {
  search?: string;
  limit?: number;
  offset?: number;
}) {
  // 1. Check cache
  const cachedCount = await this.collection
    .count({ selector: {
      table_name: tableName,
      _cached_at: { $gt: Date.now() - TTL }
    }})
    .exec();

  // 2. If no cache → load
  if (cachedCount === 0) {
    await this.loadDictionary(tableName, options.limit, options.offset);
  }

  // 3. Query з RxDB
  let query = this.collection.find({
    selector: { table_name: tableName }
  });

  if (options.search) {
    query = query.where('name').regex(new RegExp(options.search, 'i'));
  }

  const records = await query
    .skip(options.offset || 0)
    .limit(options.limit || 30)
    .exec();

  return records.map(doc => doc.toJSON());
}
```

**2.4 Тестування (1 год)**
- Відкрити console
- Викликати `dictionaryStore.getDictionary('pet_type')`
- Перевірити IndexedDB → dictionaries collection
- Перевірити що дані завантажилися

---

#### **День 3: Components Integration (3-4 год)**

**3.1 Оновити DropdownInput (1.5 год)**
```typescript
// packages/ui/components/form-inputs/dropdown-input.tsx

const [dynamicOptions, setDynamicOptions] = useState(options || []);
const [loading, setLoading] = useState(false);
const [isOpen, setIsOpen] = useState(false);

useEffect(() => {
  if (isOpen && referencedTable && dynamicOptions.length === 0) {
    loadDictionaryOptions();
  }
}, [isOpen, referencedTable]);

const loadDictionaryOptions = async () => {
  if (!referencedTable) return;

  setLoading(true);
  try {
    const { records } = await dictionaryStore.getDictionary(referencedTable, {
      limit: 30,
      offset: 0
    });

    const opts = records.map(r => ({
      value: r.id,
      label: r.name
    }));

    setDynamicOptions(opts);
  } catch (error) {
    console.error(`Failed to load ${referencedTable}:`, error);
  } finally {
    setLoading(false);
  }
};
```

**3.2 Оновити LookupInput (1.5 год)**
```typescript
// packages/ui/components/form-inputs/lookup-input.tsx

const loadOptions = async (query: string = '') => {
  setLoading(true);

  try {
    let records = [];

    if (dataSource === 'collection') {
      // Use existing RxDB collection
      const db = await getDatabase();
      const collection = db[referencedTable];

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
      // Default: Use DictionaryStore
      const result = await dictionaryStore.getDictionary(referencedTable, {
        search: query,
        limit: 30
      });
      records = result.records;
    }

    setOptions(records.map(r => ({
      value: r.id,
      label: r.name
    })));
  } finally {
    setLoading(false);
  }
};

// Debounce search
useEffect(() => {
  const timer = setTimeout(() => {
    loadOptions(searchQuery);
  }, 300);

  return () => clearTimeout(timer);
}, [searchQuery]);
```

**3.3 Тестування в UI (1 год)**
- Відкрити breed form
- Протестувати DropdownInput з pet_type (dictionary)
- Протестувати LookupInput з account (collection)
- Перевірити loading states
- Перевірити що дані кешуються

---

#### **День 4: Polish + TTL (2-3 год)**

**4.1 Implement TTL Cleanup (1 год)**
```typescript
async cleanupExpired() {
  if (!this.collection) return;

  const TTL = 14 * 24 * 60 * 60 * 1000; // 14 днів
  const expiryTime = Date.now() - TTL;

  const expiredDocs = await this.collection
    .find({
      selector: {
        _cached_at: { $lt: expiryTime }
      }
    })
    .exec();

  if (expiredDocs.length > 0) {
    console.log(`[DictionaryStore] Cleaning ${expiredDocs.length} expired records`);

    for (const doc of expiredDocs) {
      await doc.remove(); // Soft delete → RxDB cleanup видалить
    }
  }
}

// Викликати при initialize() і кожні 24 години
async initialize() {
  // ... existing code ...

  // Run cleanup
  await this.cleanupExpired();

  // Schedule periodic cleanup (every 24 hours)
  setInterval(() => {
    this.cleanupExpired();
  }, 24 * 60 * 60 * 1000);
}
```

**4.2 Error Handling (1 год)**
- Network errors
- Supabase errors
- RxDB errors
- Loading states
- Empty states

**4.3 Scroll Pagination (Опціонально, 1 год)**
```typescript
// In DropdownInput
const [hasMore, setHasMore] = useState(true);
const [offset, setOffset] = useState(0);

const handleScroll = async (e: React.UIEvent<HTMLDivElement>) => {
  const target = e.currentTarget;
  const scrollBottom = target.scrollHeight - target.scrollTop - target.clientHeight;

  if (scrollBottom < 50 && hasMore && !loading) {
    await loadMoreOptions();
  }
};

const loadMoreOptions = async () => {
  const newOffset = offset + 30;
  const result = await dictionaryStore.getDictionary(referencedTable, {
    limit: 30,
    offset: newOffset
  });

  setDynamicOptions(prev => [...prev, ...result.records]);
  setOffset(newOffset);
  setHasMore(result.hasMore);
};
```

---

### 📝 Відкриті Рішення

Перед стартом вирішити:

1. **TTL Period:**
   - Dictionaries: 14 днів ✅
   - Main entities: 30 днів (опціонально, пізніше)

2. **Data Source:**
   - Використовуємо Supabase client напряму (як в app-config)
   - Без окремого API endpoint для старту
   - Edge Function можна додати пізніше для оптимізації

3. **Cleanup Strategy:**
   - Тільки для dictionaries зараз
   - Main entities - окрема задача пізніше

### 🎯 Definition of Done

- [ ] DictionaryStore створює колекцію dictionaries
- [ ] getDictionary() завантажує з Supabase і кешує в RxDB
- [ ] DropdownInput завантажує опції з DictionaryStore
- [ ] LookupInput перемикається між collection/dictionary по dataSource
- [ ] TTL cleanup видаляє записи старші за 14 днів
- [ ] Тестовано з pet_type, country, currency (dictionaries)
- [ ] Тестовано з account, breed, contact (main entities)
- [ ] Loading states в UI
- [ ] Error handling

### 📚 Документація

- Детальна стратегія: `/docs/DICTIONARY_LOADING_STRATEGY.md`
- Entity configs з dataSource: `/apps/config-admin/src/data/entities/**/*.json`

---

**READY FOR DEVELOPMENT! 🚀**
