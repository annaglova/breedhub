# 🔄 SESSION RESTART - BREEDHUB PROJECT

## 📅 Останнє оновлення: 2025-10-23

## 🎯 ПОТОЧНИЙ СТАН

**Статус:** ID-First Complete, PWA Phase 1 Complete ✅

**Що працює (Backend):**
- ✅ **SpaceStore.applyFilters()** - ID-First implementation complete
- ✅ **DictionaryStore.getDictionary()** - ID-First + Hybrid Search complete (2025-10-22)
- ✅ **Service fields bug fixed** - mapToRxDBFormat excludes _meta, _attachments, _rev
- ✅ **Race condition fixed** - isLoadingRef prevents duplicate scroll requests
- ✅ **Replication enabled** - works seamlessly with ID-First
- ✅ **LookupInput (collection mode)** - використовує ID-First через applyFilters()
- ✅ **LookupInput (dictionary mode)** - використовує ID-First через DictionaryStore
- ✅ Testing: 452/452 breeds loaded, 70% traffic reduction confirmed

**Що працює (UI):**
- ✅ Dynamic rows з view config (30 для breed/list, 60 для breed/grid, etc.)
- ✅ Manual pagination - scroll підгружає дані on-demand (через replication, НЕ ID-First)
- ✅ Checkpoint persistence - продовження після reload
- ✅ Batch UI updates - стрибки 30→60→90 без flickering
- ✅ Instant totalCount - миттєве відображення з localStorage cache
- ✅ Dynamic sorting - SortSelector з конфігу
- ✅ Dynamic filters - FiltersDialog з динамічним рендерингом (UI only, not functional)
- ✅ Sort/Filter configs на space рівні (не view)
- ✅ mainFilterField handling - виключення з filter modal
- ✅ **DropdownInput** - cursor pagination + X button для очищення (2025-10-22)
- ✅ **LookupInput** - debounce 500ms + X button + без миготіння (2025-10-22)
- ✅ **Online/Offline indicator** - на аватарці користувача (2025-10-22)
- ✅ **PWA Phase 1** - базова офлайн підтримка (2025-10-23)

**Що НЕ працює (Integration Gap):**
- ❌ **SpaceView filtering** - SearchBar + FiltersDialog не підключені до applyFilters()
- ❌ **URL query params** - не використовуються для фільтрації
- ⚠️ **Офлайн режим для контролів** - НЕ ТЕСТУВАЛИ (DictionaryStore, DropdownInput, LookupInput)

**Поточна гілка:** `main`

---

## 🚀 ID-FIRST PAGINATION: Production Ready ✅

**Implemented:** 2025-10-21
**Status:** ✅ Complete & Tested

### Проблема: Service Fields Bug (NOT Pagination!)

**Реальна проблема:**
- ❌ Service fields (`_meta`, `_attachments`, `_rev`) передавалися в `bulkUpsert()`
- ❌ Викликало validation error (status 422)
- ❌ 1 record ("UNKNOWN" breed) не збережений → 451/452

**Рішення:**
- ✅ Fixed `mapToRxDBFormat()` в SpaceStore
- ✅ Fixed `mapSupabaseToRxDB()` в EntityReplicationService
- ✅ Явно виключаємо service fields перед `bulkUpsert()`

### ID-First Architecture

**Чому ID-First (не простий cursor)?**

Базуючись на use case:
- ✅ Користувачі **часто** відкривають lookups (не 1-2 рази)
- ✅ ~20 таблиць/довідників з **тисячами записів**
- ✅ **Partial cache - реальна проблема** (фільтри, пошук, сортування)
- ✅ Spaces майже завжди мають **тисячі записів**

**4-Phase ID-First:**

```typescript
// 1. Lightweight: IDs + sort field (~1KB for 30 records)
const idsData = await supabase
  .select('id, name')
  .match(filters)
  .gt('name', cursor)
  .order('name')
  .limit(30);

// 2. Check RxDB cache
const cached = await rxdb.find({ id: { $in: ids } });

// 3. Fetch only missing full records
const missingIds = ids.filter(id => !cached.has(id));
const fresh = await supabase.select('*').in('id', missingIds);
await rxdb.bulkUpsert(fresh);

// 4. Merge + maintain order from IDs query
return mergeAndSort(cached, fresh, ids);
```

**Benefits:**
- ✅ 70% less traffic with warm cache (progressive: 0% → 97%)
- ✅ Works with ANY ORDER BY
- ✅ Works with ANY filters
- ✅ Intelligent cache reuse across different filter combinations
- ✅ 452/452 records завжди!

**Економія (15 batches × 30 records = 450 total):**
```
Keyset (simple cursor):     450KB always

ID-First (progressive):
  Batch 1:  31KB (0% cache)
  Batch 2:  16KB (50% cache)
  Batch 3:  9KB (73% cache)
  Batch 15: 2KB (97% cache)
  ────────────────────
  Total: ~150KB (70% savings!)
```

### Implementation Complete ✅

**SpaceStore.applyFilters():**
- ✅ 4-phase ID-First implementation
- ✅ Helper methods: `fetchIDsFromSupabase()`, `fetchRecordsByIDs()`
- ✅ Fixed `mapToRxDBFormat()` - service fields excluded
- ✅ Offline fallback built-in

**LookupInput:**
- ✅ Race condition fixed with `isLoadingRef`
- ✅ Removed `skipCache` parameter
- ✅ Simplified append logic (no manual deduplication)
- ✅ Works with `dataSource="collection"` mode

**EntityReplicationService:**
- ✅ Fixed `mapSupabaseToRxDB()` - service fields excluded
- ✅ Re-enabled and working with ID-First

**Testing Results:**
- ✅ 452/452 breeds loaded (all records)
- ✅ Reload works perfectly
- ✅ Scroll pagination works smoothly
- ✅ No race conditions
- ✅ Replication + ID-First work together

**Детальна документація:** `/docs/ID_FIRST_PAGINATION.md`

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
- `/docs/OFFSET_BASED_PAGINATION.md` - 🔥 **Offset-based scroll для UI (ACTIVE)**
- `/docs/FILTERING_IMPLEMENTATION_PLAN.md` - Filtering & search implementation
- `/docs/DICTIONARY_LOADING_STRATEGY.md` - Dictionary loading strategy
- `/docs/LOCAL_FIRST_ROADMAP.md` - Загальний roadmap проекту
- `/docs/UNIVERSAL_STORE_IMPLEMENTATION.md` - Universal store architecture

### Архітектура
- `/docs/PROPERTY_BASED_CONFIG_ARCHITECTURE.md` - Конфігураційна система
- `/docs/SPACE_STORE_ARCHITECTURE.md` - SpaceStore архітектура

### Config Admin
- `/apps/config-admin/docs/SCRIPTS.md` - Config generation scripts
- `/apps/config-admin/docs/WORKFLOW.md` - Development workflow

### Архів
- `/docs/archive/DYNAMIC_VIEW_ROWS_IMPLEMENTATION.md` - ⚠️ Checkpoint-based replication (ARCHIVED)

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

## 📋 ЗАВЕРШЕНІ ЗАДАЧІ

### ✅ **PWA Phase 1 - Offline Support** - COMPLETED 2025-10-23

**Статус:** ✅ Production Ready
**Документація:** Basic PWA implementation with Service Worker

**Що зроблено:**

**1. PWA Icons:**
- ✅ Created icon-192x192.png (4.9KB) from logo.svg
- ✅ Created icon-512x512.png (26KB) from logo.svg
- ✅ Stored in apps/app/public/icons/

**2. Vite PWA Plugin Configuration:**
- ✅ Configured vite-plugin-pwa in vite.config.ts
- ✅ Web App Manifest with Ukrainian description "Управління породами тварин"
- ✅ Theme color #9333EA (purple, brand color)
- ✅ Standalone display mode for native app look
- ✅ Auto-update Service Worker registration type

**3. Service Worker Registration:**
- ✅ Registered in main.tsx with event handlers
- ✅ onOfflineReady - logs when app ready to work offline
- ✅ onNeedRefresh - logs when new content available
- ✅ onRegistered - logs successful registration
- ✅ onRegisterError - logs registration errors

**4. Workbox Caching Strategy:**
- ✅ NetworkFirst strategy for API (dev.dogarray.com)
- ✅ NetworkFirst strategy for Supabase (*.supabase.co)
- ✅ 24-hour cache expiration with 100 entries max
- ✅ 10-second network timeout
- ✅ Offline fallback to index.html
- ✅ Navigate fallback for offline navigation

**5. Dev Mode Support:**
- ✅ PWA enabled in development mode
- ✅ Service Worker regenerates on config changes
- ✅ Module type for modern ESM support

**Results:**
- ✅ No more browser default offline page "Ви не в мережі"
- ✅ App works offline with cached data
- ✅ API requests cached for 24 hours
- ✅ Automatic Service Worker updates
- ✅ PWA manifest with proper icons

**Files Modified:**
- `/apps/app/vite.config.ts` - VitePWA plugin configuration
- `/apps/app/src/main.tsx` - Service Worker registration
- `/apps/app/src/vite-env.d.ts` - PWA type definitions

**Files Added:**
- `/apps/app/public/icons/icon-192x192.png`
- `/apps/app/public/icons/icon-512x512.png`

**Next Steps (Optional):**
- **Phase 2 (SHOULD HAVE):** Custom offline page, deeper RxDB integration
- **Phase 3 (NICE TO HAVE):** Background sync, push notifications

---

### ✅ **DictionaryStore ID-First Migration + UI Improvements** - COMPLETED 2025-10-22

**Статус:** ✅ Production Ready
**Документація:** `/docs/DICTIONARY_LOADING_STRATEGY.md`

**Що зроблено:**

**1. DictionaryStore ID-First Migration:**
- ✅ Migrated from offset-based → cursor-based (keyset) pagination
- ✅ 4-phase ID-First implementation (fetchIDsFromSupabase → checkCache → fetchByIDs → merge)
- ✅ Hybrid Search: starts_with (70%) + contains (30%) with A-Z sorting
- ✅ 70% traffic reduction with cache reuse
- ✅ Works with DictionaryStore universal collection

**2. DropdownInput Improvements:**
- ✅ Migrated to cursor pagination (was using offset)
- ✅ Added X button to clear value (read-only input fix)
- ✅ Dynamic icon: X when selected, ChevronDown when empty
- ✅ Scroll pagination works perfectly

**3. LookupInput Improvements:**
- ✅ Debounced search (500ms) - no flickering
- ✅ Separate inputValue/searchQuery states
- ✅ Proper editing mode tracking (isEditing)
- ✅ X button clears value (without auto-opening dropdown)
- ✅ User can type freely without value jumping back
- ✅ Cursor pagination for dictionary mode

**4. Online/Offline Indicator:**
- ✅ AvatarWithStatus component
- ✅ useOnlineStatus hook (navigator.onLine tracking)
- ✅ Real-time status indicator on user avatar
- ✅ 🟢 Green = Online, 🔴 Gray = Offline
- ✅ Auto-scales based on avatar size

**Results:**
- ✅ All dropdown/lookup inputs use ID-First with 70% traffic savings
- ✅ Hybrid search provides better UX (starts_with priority)
- ✅ No input flickering, smooth debounced search
- ✅ Clean UI with clear buttons
- ✅ Real-time online/offline status visible

**Files Modified:**
- `/packages/rxdb-store/src/stores/dictionary-store.signal-store.ts`
- `/packages/ui/components/form-inputs/dropdown-input.tsx`
- `/packages/ui/components/form-inputs/lookup-input.tsx`
- `/packages/ui/components/avatar.tsx`
- `/apps/app/src/hooks/useOnlineStatus.ts`
- `/apps/app/src/components/layout/Header.tsx`

---

### ✅ **ID-First Pagination Implementation** - COMPLETED 2025-10-21

**Статус:** ✅ Production Ready
**Документація:** `/docs/ID_FIRST_PAGINATION.md`

**Що зроблено:**
- ✅ SpaceStore.applyFilters() - 4-phase ID-First implementation
- ✅ Helper methods: fetchIDsFromSupabase(), fetchRecordsByIDs(), mapToRxDBFormat()
- ✅ Fixed service fields bug (_meta, _attachments, _rev exclusion)
- ✅ LookupInput race condition fix (isLoadingRef)
- ✅ Removed skipCache parameter
- ✅ EntityReplicationService mapSupabaseToRxDB() fix
- ✅ Replication re-enabled and working with ID-First
- ✅ Complete testing: 452/452 records, no race conditions

**Results:**
- ✅ 452/452 records loaded (all breeds)
- ✅ 70% traffic reduction with warm cache
- ✅ Works with any ORDER BY
- ✅ Works with any filters
- ✅ Reload works perfectly
- ✅ Scroll pagination smooth

---

### ✅ **Dictionary Loading Strategy** - COMPLETED

**Статус:** ✅ Completed
**Документація:** `/docs/DICTIONARY_LOADING_STRATEGY.md`

**Що зроблено:**
- ✅ DictionaryStore з universal RxDB collection
- ✅ DropdownInput інтеграція з scroll pagination
- ✅ LookupInput з двома режимами (dictionary / collection)
- ✅ Search з debounce (300ms) і cache-first стратегія
- ✅ Scroll pagination (30 записів за раз)
- ✅ TTL cleanup (14 днів)
- ✅ Batch loading optimization
- ✅ ILIKE case-insensitive search

---

### ✅ **Виправлені Issues (2025-10-21)**

#### **Issue 1: Service Fields Bug** - FIXED ✅

**Проблема:** Service fields (`_meta`, `_attachments`, `_rev`) передавалися в `bulkUpsert()`, викликали validation error (status 422).

**Рішення:**
```typescript
// Fixed mapToRxDBFormat() and mapSupabaseToRxDB()
const serviceFields = ['_meta', '_attachments', '_rev'];
for (const key in supabaseDoc) {
  if (serviceFields.includes(key)) continue;
  // ... mapping
}
delete mapped._meta;
delete mapped._attachments;
delete mapped._rev;
```

**Статус:** ✅ Fixed in SpaceStore + EntityReplicationService

---

#### **Issue 2: Race Condition in LookupInput** - FIXED ✅

**Проблема:** Scroll дублював batches через multiple simultaneous requests.

**Рішення:**
```typescript
const isLoadingRef = useRef(false);

if (isLoadingRef.current) {
  console.log('[LookupInput] Already loading, skipping');
  return;
}
isLoadingRef.current = true;
// ... loading logic
isLoadingRef.current = false;
```

**Статус:** ✅ Fixed in LookupInput

---

#### **Issue 3: Regex синтаксис для RxDB** - FIXED ✅

**Проблема:** RxDB не підтримує inline flags `(?i)` для regex.

**Рішення:**
```typescript
// Було:
const regexPattern = `(?i)${escapedValue}`;
return query.where(fieldName).regex(regexPattern); // ❌

// Стало:
const regex = new RegExp(escapedValue, 'i');
return query.where(fieldName).regex(regex); // ✅
```

**Статус:** ✅ Fixed in applyRxDBFilter()

---

#### **Issue 4: Field config resolution** - FIXED ✅

**Проблема:** Field config не знаходився бо ключі з prefix (`breed_field_name`), а filters без (`name`).

**Рішення:**
```typescript
let fieldConfig = fieldConfigs[fieldKey];
if (!fieldConfig) {
  const prefixedKey = `${entityType}_field_${fieldKey}`;
  fieldConfig = fieldConfigs[prefixedKey];
}
```

**Статус:** ✅ Fixed in filterLocalEntities()

---

## 📋 АКТУАЛЬНІ ЗАДАЧІ

### 🎯 **ПРІОРИТЕТ 1: Міграція DictionaryStore на ID-First**

**Статус:** 🔴 Not Started
**Документація:** `/docs/DICTIONARY_LOADING_STRATEGY.md`
**Файл:** `/packages/rxdb-store/src/stores/dictionary-store.ts`

**Проблема:**
DictionaryStore використовує старий offset-based підхід, НЕ ID-First:
```typescript
// Current (offset-based):
const { data } = await supabase
  .from(tableName)
  .select('*')
  .range(offset, offset + limit - 1); // ❌ Old approach
```

**Рішення:**
Перенести на ID-First як в SpaceStore:
```typescript
// New (ID-First):
// 1. Fetch IDs
const idsData = await supabase.select('id, name').range(offset, offset + limit - 1);
// 2. Check cache
const cached = await rxdb.find({ id: { $in: ids } });
// 3. Fetch missing
const missing = ids.filter(id => !cached.has(id));
const fresh = await supabase.select('*').in('id', missing);
```

**Переваги:**
- ✅ 70% traffic reduction для dictionaries
- ✅ Cache reuse між різними відкриттями lookup
- ✅ Консистентний підхід (SpaceStore + DictionaryStore)

**Tasks:**
- [ ] Додати метод `fetchDictionaryIDsFromSupabase()`
- [ ] Додати метод `fetchDictionaryRecordsByIDs()`
- [ ] Оновити `getDictionary()` на ID-First
- [ ] Тестування: перевірити що всі 452 breeds завантажуються
- [ ] Тестування: перевірити traffic reduction

---

### 🎯 **ПРІОРИТЕТ 2: Підключити фільтрацію до SpaceView**

**Статус:** 🔴 Not Started
**Файли:**
- `/apps/app/src/components/space/SpaceComponent.tsx`
- `/apps/app/src/components/space/filters/SearchBar.tsx` (створити)
- `/apps/app/src/components/space/filters/FiltersDialog.tsx`

**Проблема:**
- SearchBar є в UI, але не викликає фільтрацію
- FiltersDialog рендерить форму, але Apply не працює
- URL query params не використовуються

**Рішення:**

**Крок 1: SearchBar integration**
```typescript
// SearchBar.tsx
const handleSearch = debounce((value: string) => {
  // Update URL param
  searchParams.set('Name', value);
  setSearchParams(searchParams);

  // Trigger filtering через SpaceStore
  spaceStore.applyFilters(entityType, { name: value });
}, 500);
```

**Крок 2: FiltersDialog integration**
```typescript
// FiltersDialog.tsx
const handleApply = () => {
  // Update ALL URL params
  Object.entries(filters).forEach(([key, value]) => {
    searchParams.set(key, value);
  });
  setSearchParams(searchParams);

  // Trigger filtering
  spaceStore.applyFilters(entityType, filters);
};
```

**Крок 3: URL as Single Source of Truth**
```typescript
// SpaceComponent.tsx
useEffect(() => {
  const filters = Object.fromEntries(searchParams);
  if (Object.keys(filters).length > 0) {
    spaceStore.applyFilters(entityType, filters);
  }
}, [searchParams]);
```

**Tasks:**
- [ ] Створити SearchBar компонент з debounce
- [ ] Підключити FiltersDialog.handleApply() → applyFilters()
- [ ] Додати URL params synchronization
- [ ] Тестування: пошук по name
- [ ] Тестування: фільтри + пошук разом
- [ ] Тестування: reload сторінки зберігає фільтри

---

### 🎯 **ПРІОРИТЕТ 3: Оновити useEntities hook**

**Статус:** 🔴 Not Started
**Файл:** `/apps/app/src/hooks/useEntities.ts`

**Проблема:**
useEntities використовує entityStore.entityList (manual replication), НЕ applyFilters()

**Рішення:**
Додати підтримку filters parameter:
```typescript
export function useEntities({
  entityType,
  filters = {}  // ← NEW
}: UseEntitiesParams) {

  useEffect(() => {
    if (Object.keys(filters).length > 0) {
      // Use applyFilters for filtered data
      const result = await spaceStore.applyFilters(entityType, filters);
      setData({ entities: result.records, total: result.total });
    } else {
      // Use entityList for unfiltered (manual replication)
      const allEntities = entityStore.entityList.value;
      setData({ entities: allEntities, total: totalFromServer });
    }
  }, [filters]);
}
```

**Tasks:**
- [ ] Додати filters parameter
- [ ] Додати conditional logic (filtered vs unfiltered)
- [ ] Тестування з фільтрами
- [ ] Тестування без фільтрів (backward compatibility)

---

### 🎯 **ПРІОРИТЕТ 4: Документація**

**Статус:** 🟡 Partial
**Файли:**
- `/docs/ID_FIRST_PAGINATION.md` - ✅ Complete
- `/docs/FILTERING_IMPLEMENTATION_PLAN.md` - 🟡 Needs update
- `/docs/DICTIONARY_LOADING_STRATEGY.md` - ❌ Needs update for ID-First

**Tasks:**
- [ ] Оновити DICTIONARY_LOADING_STRATEGY.md для ID-First
- [ ] Додати приклади інтеграції SearchBar + FiltersDialog
- [ ] Оновити архітектурні діаграми

---

## 🎯 NEXT STEPS (in order)

1. **Migrate DictionaryStore to ID-First** (ПРІОРИТЕТ 1)
   - Найбільший impact: ~20 dictionaries з тисячами records
   - Користувачі часто відкривають lookups → 70% savings реалізуються одразу

2. **Connect SearchBar + FiltersDialog** (ПРІОРИТЕТ 2)
   - Розблокує фільтрацію в SpaceView
   - Критично для user experience

3. **Update useEntities hook** (ПРІОРИТЕТ 3)
   - Дозволить SpaceView використовувати filtered data
   - Backward compatible з існуючим кодом

4. **Documentation** (ПРІОРИТЕТ 4)
   - Постійний процес
   - Оновлювати паралельно з implementation

---
