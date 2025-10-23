# 🔄 SESSION RESTART - BREEDHUB PROJECT

## 📅 Останнє оновлення: 2025-10-23

## 🎯 ПОТОЧНИЙ СТАН

**Статус:** ID-First Ready, Migration to SpaceView Needed ⚠️

**Що працює (Backend):**
- ✅ **SpaceStore.applyFilters()** - ID-First implementation complete (готово, НЕ використовується ❌)
- ✅ **DictionaryStore.getDictionary()** - ID-First + Hybrid Search + Offline (2025-10-23)
- ✅ **Service fields bug fixed** - mapToRxDBFormat excludes _meta, _attachments, _rev
- ✅ **Race condition fixed** - isLoadingRef prevents duplicate scroll requests
- ✅ **LookupInput (collection mode)** - використовує ID-First через applyFilters()
- ✅ **LookupInput (dictionary mode)** - використовує ID-First через DictionaryStore
- ✅ **Offline support** - DictionaryStore + SpaceStore офлайн fallback з гібридним пошуком
- ✅ Testing: 452/452 breeds loaded, 70% traffic reduction confirmed

**Що працює (UI):**
- ✅ Dynamic rows з view config (30 для breed/list, 60 для breed/grid, etc.)
- ⚠️ **Manual pagination** - scroll через spaceStore.loadMore() (manual replication, **НЕ працює з фільтрами**)
- ✅ Checkpoint persistence - продовження після reload
- ✅ Batch UI updates - стрибки 30→60→90 без flickering
- ✅ Instant totalCount - миттєве відображення з localStorage cache
- ✅ Dynamic sorting - SortSelector з конфігу (рендер є, функціонал нема)
- ✅ Dynamic filters - FiltersDialog з динамічним рендерингом (**UI only, Apply не працює**)
- ✅ Sort/Filter configs на space рівні (не view)
- ✅ mainFilterField handling - виключення з filter modal
- ✅ **DropdownInput** - cursor pagination + X button + offline (2025-10-23)
- ✅ **LookupInput** - debounce 500ms + X button + offline (2025-10-23)
- ✅ **Online/Offline indicator** - на аватарці користувача (2025-10-22)
- ✅ **PWA Phase 1** - базова офлайн підтримка + WebSocket spam fix (2025-10-23)

**🚨 КРИТИЧНА ПРОБЛЕМА - Дві паралельні системи:**
- ❌ **SpaceView** використовує Manual Replication (loadMore) - **НЕ працює з фільтрами**
- ✅ **applyFilters()** готовий з ID-First - **НЕ використовується в SpaceView**
- ❌ **SearchBar** рендериться, але **не підключений** до фільтрації
- ❌ **FiltersDialog Apply** рендериться, але **callback нікуди**
- ❌ **URL query params** НЕ використовуються для фільтрації
- ❌ **useEntities** читає entityStore.entityList (з manual replication)

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

### 🚨 **КРИТИЧНИЙ ПРІОРИТЕТ: Міграція SpaceView на ID-First**

**Статус:** 🔴 Not Started
**Проблема:** SpaceView використовує manual replication через loadMore(), який НЕ працює з фільтрами

### 🎯 **ПРІОРИТЕТ 1: Міграція DictionaryStore на ID-First**

**Статус:** ✅ Complete (2025-10-23)
**Результат:**
- ✅ ID-First з cursor pagination
- ✅ Hybrid search (70% starts_with + 30% contains)
- ✅ Offline fallback з RxDB cache
- ✅ 70% traffic reduction
- ✅ Tested: 452/452 breeds loaded

---

### 🎯 **ПРІОРИТЕТ 2: Міграція SpaceView scroll на ID-First**

**Статус:** 🔴 Not Started
**Проблема:** SpaceView використовує `spaceStore.loadMore()` (manual replication) → НЕ працює з фільтрами

**Поточний flow (ЗАСТАРІЛИЙ ❌):**
```
SpaceComponent → useEntities → entityStore.entityList ← manual replication
     ↓
SpaceView.handleLoadMore → spaceStore.loadMore() → manualPull()
```

**Новий flow (ID-FIRST ✅):**
```
SpaceComponent → URL params → filters state
     ↓
useEntities → spaceStore.applyFilters(filters, cursor) ← ID-First
     ↓
SpaceView.handleLoadMore → load next page з cursor
```

**Файли для зміни:**
- `/apps/app/src/hooks/useEntities.ts` - перейти на applyFilters()
- `/apps/app/src/components/space/SpaceComponent.tsx` - додати filters state з URL
- `/apps/app/src/components/space/SpaceView.tsx` - cursor pagination

**Tasks:**
- [ ] Створити новий useEntitiesFiltered hook або оновити існуючий
- [ ] Додати cursor state management
- [ ] Підключити handleLoadMore до applyFilters() з cursor
- [ ] Видалити залежність від entityStore.entityList
- [ ] Тестування: scroll без фільтрів
- [ ] Тестування: scroll з фільтрами

---

### 🎯 **ПРІОРИТЕТ 3: Підключити SearchBar + FiltersDialog + URL params**

**Статус:** 🔴 Not Started
**Залежить від:** ПРІОРИТЕТ 2 (SpaceView міграція)

**Проблема:**
- SearchBar рендериться, але `searchValue` не передається нікуди
- FiltersDialog має `onApply` callback, але він не підключений
- URL params не використовуються

**Рішення:**

**Крок 1: URL as Single Source of Truth**
```typescript
// SpaceComponent.tsx
const [searchParams, setSearchParams] = useSearchParams();

// Read filters from URL on mount/change
useEffect(() => {
  const urlFilters = Object.fromEntries(searchParams);
  setFiltersState(urlFilters);
}, [searchParams]);
```

**Крок 2: SearchBar integration**
```typescript
// SpaceComponent.tsx (рядок 347-354)
const handleSearchChange = useDebounce((value: string) => {
  const newParams = new URLSearchParams(searchParams);
  if (value) {
    newParams.set('name', value);
  } else {
    newParams.delete('name');
  }
  setSearchParams(newParams);
}, 500);
```

**Крок 3: FiltersDialog integration**
```typescript
// SpaceComponent.tsx
const handleFiltersApply = (filterValues: Record<string, any>) => {
  const newParams = new URLSearchParams(searchParams);

  // Add all filter values to URL
  Object.entries(filterValues).forEach(([key, value]) => {
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
  });

  setSearchParams(newParams);
};

// Pass to FiltersDialog
<FiltersDialog
  onApply={handleFiltersApply}
  ...
/>
```

**Tasks:**
- [ ] Додати URL params читання в SpaceComponent
- [ ] Підключити SearchBar onChange → URL params
- [ ] Підключити FiltersDialog onApply → URL params
- [ ] Додати debounce для search (500ms)
- [ ] Тестування: search оновлює URL
- [ ] Тестування: filters оновлюють URL
- [ ] Тестування: reload зберігає фільтри з URL

---

### ⚙️ **ЩО ЗАЛИШИТИ З РЕПЛІКАЦІЇ**

**Статус:** 🟡 Requires Analysis

**Проблема:** Зараз manual replication (loadMore) використовується для scroll, але це конфліктує з ID-First

**Реплікація КОРИСНА для:**
- ✅ **Background sync** - завантажує дані коли app idle (warm cache)
- ✅ **Initial seed** - перші 30-60 records при відкритті space (instant UI)
- ✅ **Real-time updates** - subscribe на Supabase realtime (якщо потрібно)
- ✅ **Offline persistence** - накопичує records в RxDB для offline режиму

**Реплікація НЕ КОРИСНА для:**
- ❌ **Scroll pagination** - loadMore() не працює з фільтрами (замінити на ID-First)
- ❌ **Filtered data** - replication завантажує ВСЕ, не відфільтроване (замінити на ID-First)
- ❌ **Dynamic sorting** - replication має fixed ORDER BY (замінити на ID-First)

**Рекомендація:**
```typescript
// ✅ ЗАЛИШИТИ: Background sync для warm cache
setInterval(async () => {
  if (isIdle && isOnline) {
    await spaceStore.backgroundSync(entityType); // завантажує chunks для cache
  }
}, 60000); // кожну хвилину

// ❌ ПРИБРАТИ: loadMore() для scroll
// handleLoadMore → spaceStore.loadMore() ← DELETE

// ✅ ЗАМІНИТИ: ID-First для scroll
handleLoadMore → applyFilters(filters, nextCursor)
```

**Tasks:**
- [ ] Проаналізувати EntityReplicationService - що залишити
- [ ] Розділити background sync vs pagination
- [ ] Видалити loadMore() з SpaceComponent
- [ ] Додати backgroundSync() для warm cache (опціонально)

---

## 🎯 NEXT STEPS (in order)

**🚨 КРИТИЧНО:**
1. **Migrate SpaceView to ID-First** (ПРІОРИТЕТ 2)
   - Розблокує фільтрацію + сортування в SpaceView
   - Зараз спейс НЕ працює з фільтрами
   - Estimated: 4-6 годин

2. **Connect SearchBar + FiltersDialog + URL** (ПРІОРИТЕТ 3)
   - Підключити UI до applyFilters()
   - URL params for shareable links
   - Estimated: 2-3 години

3. **Cleanup Replication** (ЩО ЗАЛИШИТИ З РЕПЛІКАЦІЇ)
   - Видалити loadMore() з scroll flow
   - Додати backgroundSync (опціонально)
   - Estimated: 1-2 години

**ОПЦІОНАЛЬНО:**
4. **PWA Phase 2** - Deeper offline support, custom offline page
5. **Testing & Optimization** - Performance metrics, cache hit rates

---
