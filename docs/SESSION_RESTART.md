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

## 🚨 КРИТИЧНА МІГРАЦІЯ: Keyset Pagination (Cursor-Based)

**Виявлено:** 2025-10-21

### Проблема з Offset Pagination

**Симптом:**
- При scroll в LookupInput підгрузилось **422 з 452** breeds
- **Пропущено 30 records** (перші по алфавіту: AFGHAN, AKITA...)

**Корінь проблеми:**
```
RxDB містить mixed data з різних ORDER BY:
- Initial replication: ORDER BY updated_at (30 records)
- SpaceView scroll: ORDER BY varies
- LookupInput: ORDER BY name

skip(30) в RxDB = skip 30 в ЛОКАЛЬНІЙ колекції (довільні records)
range(30, 59) в Supabase = позиції 30-59 в ПОВНІЙ таблиці (452 records)

→ Позиція 30 в RxDB ≠ Позиція 30 в Supabase!
→ Пропущені records! ❌
```

**Детальний аналіз:** `/docs/KEYSET_PAGINATION.md`

### Рішення: Keyset Pagination

**Замість offset** використовуємо **cursor** (значення останнього record):

```typescript
// OLD (offset-based) ❌
applyFilters('breed', { name: query }, {
  limit: 30,
  offset: 30  // ← Проблема!
})

// NEW (cursor-based) ✅
applyFilters('breed', { name: query }, {
  limit: 30,
  cursor: 'BOXER',  // ← Cursor = last seen name
  orderBy: { field: 'name', direction: 'asc' }
})

// SQL:
WHERE name > 'BOXER' ORDER BY name LIMIT 30
// Працює однаково в RxDB і Supabase! ✅
```

### План Міграції

**Фаза 1: SpaceStore.applyFilters** 🔨
- Замінити `offset` на `cursor` parameter
- `filterLocalEntities`: `.where(field).gt(cursor)` замість `.skip(offset)`
- `fetchFilteredFromSupabase`: `.gt(field, cursor)` замість `.range(offset, ...)`
- Return `nextCursor` (last record value)

**Фаза 2: LookupInput** 🔨
- Замінити `offsetRef` на `cursorRef`
- При append: передавати cursor замість offset
- При reset (new search): cursor = null
- Зберігати `lastRecord.name` як cursor

**Фаза 3: DictionaryStore**
- Той самий pattern як SpaceStore
- `getDictionary(tableName, { cursor, limit })`

**Фаза 4: Testing**
- Всі 452 breeds завантажуються ✅
- Offline mode працює
- Search + scroll працюють разом

**Статус:** 🔨 Міграція в процесі (Фаза 1-2)

**Пов'язані документи:**
- `/docs/KEYSET_PAGINATION.md` - повний аналіз + імплементація
- `/docs/DICTIONARY_LOADING_STRATEGY.md` - warning про міграцію

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

## 📋 ПОТОЧНІ ЗАДАЧІ

### ✅ **Завершено: Dictionary Loading Strategy**

**Статус:** Completed ✅
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

**Що залишилось:**
- ⏳ Performance benchmarks
- ⏳ Config updates з dataSource field для main entities
- ⏳ LookupInput collection mode повне тестування

---

### 🚀 **Поточна задача: SpaceStore Filtering & Search**

**Статус:** In Progress 🔄
**Документація:** `/docs/FILTERING_IMPLEMENTATION_PLAN.md`
**Пріоритет:** HIGH

### 🎯 Мета

Реалізувати універсальну систему фільтрації і пошуку для SpaceStore, яка буде використовуватися:
1. **SpaceView** - пошук та фільтри для списків entities (breeds, pets, accounts)
2. **LookupInput (collection mode)** - пошук по main entities з підгрузкою

### 🏗️ Архітектура

```
URL Query Params (Single Source of Truth)
  ↓
SpaceStore.applyFilters(entityType, filters, options)
  ↓
├─ Try RxDB Local Search First
│  └─ Build RxDB query with filters (AND logic)
│
├─ If not enough results
│  └─ Fetch from Supabase with filters
│     └─ Cache in RxDB
│
└─ Return { records, total, hasMore }

Used by:
- SearchBar → updates URL param 'Name' (debounced 500ms)
- FiltersDialog → updates multiple URL params (on Apply)
- LookupInput → calls applyFilters() for collection mode
```

### 📐 План імплементації

#### **Phase 1: SpaceStore.applyFilters() Core (Priority 1)**

**Що треба зробити:**
```typescript
// Add to SpaceStore
async applyFilters(
  entityType: string,
  filters: Record<string, any>,  // { name: 'golden', pet_type_id: 'uuid' }
  options?: {
    limit?: number;
    offset?: number;
    fieldConfigs?: Record<string, FilterFieldConfig>;
  }
): Promise<{ records: any[]; total: number; hasMore: boolean }>
```

**Ключові особливості:**
1. **Operator detection** - автоматично визначається по field type:
   - `string` → ILIKE (search)
   - `uuid` → eq (exact match)
   - `number` → eq/gt/lt
   - `date` → gte/lte

2. **AND logic** - всі фільтри комбінуються через AND

3. **RxDB → Supabase strategy**:
   - Спочатку шукаємо локально в RxDB
   - Якщо мало результатів → підгружаємо з Supabase
   - Кешуємо результати

4. **Використовується в:**
   - SpaceView (search + filters)
   - LookupInput (collection mode search)

#### **Phase 2: SearchBar Component (Priority 2)**

**Що треба зробити:**
- Компонент SearchBar з debounce (500ms)
- Оновлює URL query param `Name`
- SpaceView підписується на URL зміни
- Викликає `spaceStore.applyFilters({ name: searchValue })`

#### **Phase 3: FiltersDialog + URL params (Priority 3)**

**Що треба зробити:**
- FiltersDialog з multiple filters
- Apply button → оновлює всі URL params одночасно
- Cancel → скидає форму до URL state
- URL = Single Source of Truth

#### **Phase 4: LookupInput Integration (Priority 4)**

**Що треба зробити:**
```typescript
// LookupInput викликає SpaceStore.applyFilters()
if (dataSource === 'collection') {
  const { records, hasMore } = await spaceStore.applyFilters(
    referencedTable,
    { [referencedFieldName]: searchQuery },
    { limit: 30, offset: currentOffset }
  );
}
```

### 📚 Документація

**Основні документи:**
- `/docs/FILTERING_IMPLEMENTATION_PLAN.md` - Детальний план фільтрації
- `/docs/DICTIONARY_LOADING_STRATEGY.md` - Dictionary loading (completed)

**Пов'язані теми:**
- URL Query Params як Single Source of Truth
- AND-only filter logic
- RxDB-first, Supabase-second strategy
- Scroll pagination
- Debounced search

---

### ✅ Виправлені Issues (2025-10-21)

#### **Issue 1: Regex синтаксис для RxDB** - FIXED ✅

**Проблема:** RxDB не підтримує inline flags `(?i)` для regex.

**Рішення:**
```typescript
// Було:
const regexPattern = `(?i)${escapedValue}`;
return query.where(fieldName).regex(regexPattern); // ❌ Error

// Стало:
const regex = new RegExp(escapedValue, 'i');
return query.where(fieldName).regex(regex); // ✅ Works
```

**Статус:** Виправлено в `applyRxDBFilter()` (space-store.signal-store.ts:1850)

---

#### **Issue 2: Field config resolution** - FIXED ✅

**Проблема:** Field config не знаходився бо ключі з prefix (`breed_field_name`), а filters без (`name`).

**Рішення:**
```typescript
// Спробувати обидва варіанти
let fieldConfig = fieldConfigs[fieldKey];
if (!fieldConfig) {
  const prefixedKey = `${entityType}_field_${fieldKey}`;
  fieldConfig = fieldConfigs[prefixedKey];
}
```

**Статус:** Виправлено в `filterLocalEntities()` (space-store.signal-store.ts:1673-1684)

---

### ⚠️ Known Issues

#### **Issue 1: Config operator замість auto-detect**

**Проблема:** У config `breed_field_name` стоїть `operator: "eq"` замість `"ilike"`.

**Лог:**
```
🎯 Using explicit operator from config: eq  ← ❌ WRONG для string search!
🔍 Applying filter: operator: 'eq', value: 'ch'
📦 Local query returned 0 results  ← нічого не знайшов (exact match)
```

**Рішення:**
1. Видалити `operator: "eq"` з config для name field
2. Дозволити auto-detect: `string` → `ilike`
3. Або змінити на `operator: "ilike"`

**Статус:** Треба виправити в DB config

---

#### **Issue 2: Scroll pagination для LookupInput (collection mode)**

**Проблема:** Scroll не підгружає дані - завжди перші 30 records.

**Причина:**
```typescript
// applyFilters не використовує offset для Supabase fetch
if (localResults.length < limit && !offset) { // ← !offset блокує scroll!
  fetchFromSupabase();
}
```

**План виправлення:** Реалізувати offset-based scroll як в DictionaryStore (дивись нижче).

---

### 🚀 Поточна задача: Scroll Pagination для Collection Mode

**Статус:** Ready to Implement 🔨
**Пріоритет:** HIGH
**Документація:** `/docs/OFFSET_BASED_PAGINATION.md` 📖

---

## 🎯 ФІНАЛЬНЕ РІШЕННЯ: Offset-based для ВСІХ випадків scroll

### ❌ Чому НЕ replication для UI scroll?

**Проблема:** Checkpoint-based replication НЕ сумісна з фільтрами!

```typescript
// Checkpoint corruption example:
Initial: фільтр "golden", checkpoint = null
Pull 1: знайшов "Golden Retriever" (updated_at: 2025-01-01)
Checkpoint = 2025-01-01

User змінює фільтр на "lab"
Pull 2: .gt('updated_at', '2025-01-01').ilike('name', '%lab%')
Result: ПРОПУСТИТЬ всі Labradors створені ДО 2025-01-01! ❌
```

**Висновки:**
- ❌ Replication створює gaps при зміні фільтрів
- ❌ Checkpoint = "останній FILTERED запис", а не загальний
- ❌ Складна логіка для простого use case

### ✅ Рішення: Offset-based для UI scroll

**Переваги:**
- ✅ Універсальний - працює з/без фільтрів
- ✅ Простий - просто offset++
- ✅ Надійний - no checkpoint corruption
- ✅ Передбачуваний - no gaps

### 🔄 Де залишається replication?

**Replication використовується для:**
- ✅ Background sync (оновлення в фоні)
- ✅ Real-time updates (websockets)
- ✅ Offline sync (майбутнє)

**НЕ використовується для:**
- ❌ UI scroll pagination
- ❌ Search results loading
- ❌ Filtered data loading

---

## 🎯 Архітектура Offset-Based Scroll

### Принципи

**1. Кешування - обов'язкове!**
- Filtered results → cache в RxDB
- Офлайн-first робота
- TTL cleanup (майбутнє) - видалення застарілих

**2. Offset-based pagination**
- LookupInput scroll → applyFilters з offset
- SpaceView scroll БЕЗ фільтрів → loadMore (replication)
- SpaceView scroll З фільтрами → applyFilters з offset

**3. Чому кешування критично:**
- Тисячі records (breed: 450+, animal: тисячі)
- Сталі фільтри - користувач шукає "golden" знову і знову
- Обмежений вибір - юзер цікавиться 10-20 породами, не всіма
- **Постійно кидати запити в БД - НІ!** ❌

---

### Оновлена логіка applyFilters()

```typescript
async applyFilters(
  entityType: string,
  filters: Record<string, any>,
  options?: { limit?: number; offset?: number }
): Promise<{ records: any[]; total: number; hasMore: boolean }> {

  const limit = options?.limit || 30;
  const offset = options?.offset || 0;

  // 1. Try RxDB cache first (з offset!)
  const localResults = await this.filterLocalEntities(
    entityType,
    filters,
    limit,
    offset  // ← використати skip(offset)
  );

  // 2. If not enough OR scroll pagination → fetch from Supabase
  const needsRemoteFetch =
    localResults.length < limit ||  // Not enough in cache
    offset > 0;                     // Scroll pagination

  if (needsRemoteFetch) {
    const remoteResults = await this.fetchFilteredFromSupabase(
      entityType,
      filters,
      limit,
      offset  // ← використати .range(offset, offset + limit - 1)
    );

    // 3. ✅ CACHE results в RxDB (як DictionaryStore!)
    await collection.bulkUpsert(remoteResults);
  }

  // 4. Get server total for hasMore
  const serverTotal = await this.getFilteredCount(entityType, filters);
  const hasMore = offset + limit < serverTotal;

  return {
    records: combined & deduplicated,
    total: serverTotal,
    hasMore
  };
}
```

---

### Що треба додати/виправити

**1. filterLocalEntities - додати skip()**
```typescript
query = query
  .skip(offset)   // ← ДОДАТИ
  .limit(limit);
```

**2. fetchFilteredFromSupabase - додати .range()**
```typescript
// Було:
query = query.limit(limit);

// Треба (як DictionaryStore):
query = query.range(offset, offset + limit - 1);
```

**3. getFilteredCount - для hasMore**
```typescript
private async getFilteredCount(
  entityType: string,
  filters: Record<string, any>
): Promise<number> {
  const { count } = await supabase
    .from(entityType)
    .select('*', { count: 'exact', head: true })
    // apply filters з operator detection

  return count || 0;
}
```

---

### Use Cases

**LookupInput (collection mode) - search:**
```
User types "golden"
  ↓
applyFilters(breed, {name: 'golden'}, {limit: 30, offset: 0})
  ↓
Check RxDB cache → 5 results
  ↓
Fetch from Supabase .range(0, 29) → 30 results
  ↓
Cache в RxDB ✅
  ↓
Return { records: 30, hasMore: true }
  ↓
User scrolls
  ↓
applyFilters(breed, {name: 'golden'}, {offset: 30})
  ↓
Fetch .range(30, 59) → cache → return
```

**SpaceView scroll БЕЗ фільтрів:**
```
User відкриває /breeds/list
  ↓
Initial: applyFilters(breed, {}, {offset: 0})
  ↓
Scroll: applyFilters(breed, {}, {offset: 30, 60, 90...})
  ↓
Cache + offset-based pagination ✅
```

**SpaceView scroll З фільтрами:**
```
User на /breeds/list?Name=golden
  ↓
Initial: applyFilters(breed, {name: 'golden'}, {offset: 0})
  ↓
Scroll: applyFilters(breed, {name: 'golden'}, {offset: 30})
  ↓
User змінює фільтр → offset resets to 0 ✅
```

---

**READY TO IMPLEMENT! 🚀**

---

## 🔨 ПЛАН ІМПЛЕМЕНТАЦІЇ (Incremental Approach)

### **КРОК 1: Minimal Viable Fix** ⏱️ 5 хвилин
**Мета:** Зробити scroll робочим ЗАРАЗ

**Файл:** `/packages/rxdb-store/src/stores/space-store.signal-store.ts`

**Зміни:**

**1. filterLocalEntities - додати skip (line ~1704)**
```typescript
const docs = await query
  .skip(offset)   // ← ADD THIS
  .limit(limit)
  .exec();
```

**2. fetchFilteredFromSupabase - замінити limit на range (line ~1771)**
```typescript
// Було:
query = query.limit(limit);

// Стало:
const { data, error } = await query
  .range(offset, offset + limit - 1);  // ← CHANGE THIS
```

**3. applyFilters - змінити умову (line ~1599)**
```typescript
// Було:
if (localResults.length < limit && !offset) {

// Стало:
const needsRemoteFetch =
  localResults.length < limit ||
  offset > 0;

if (needsRemoteFetch) {
```

**Результат:** ✅ Scroll працює! Можна тестувати в LookupInput.

---

### **КРОК 2: Proper hasMore Detection** ⏱️ 10 хвилин
**Мета:** Додати getFilteredCount для точного hasMore

**Що додаємо:**

**4. Новий метод getFilteredCount**
```typescript
private async getFilteredCount(
  entityType: string,
  filters: Record<string, any>
): Promise<number> {
  const { supabase } = await import('../supabase/client');
  let query = supabase
    .from(entityType)
    .select('*', { count: 'exact', head: true });

  // Apply filters (same logic as fetchFilteredFromSupabase)
  for (const [fieldKey, value] of Object.entries(filters)) {
    if (!value) continue;
    const fieldConfig = this.getFieldConfig(entityType, fieldKey);
    const operator = this.detectOperator(fieldConfig.fieldType, fieldConfig.operator);
    query = this.applySupabaseFilter(query, fieldKey, operator, value);
  }

  const { count } = await query;
  return count || 0;
}
```

**5. Використати в applyFilters**
```typescript
// Get server total for accurate hasMore
const serverTotal = await this.getFilteredCount(entityType, filters);
const hasMore = offset + limit < serverTotal;

return {
  records: allResults.slice(0, limit),
  total: serverTotal,
  hasMore
};
```

**Результат:** ✅ hasMore працює правильно, scroll зупиняється.

---

### **КРОК 3: Integration & Testing** ⏱️ Тестування
**Мета:** Переконатися що все працює

**Що тестуємо:**

**Test 1: LookupInput scroll (collection mode)**
- [ ] Відкрити `/test/dictionary`
- [ ] Ввести "ch" в Breed lookup
- [ ] Scroll до кінця списку
- [ ] Перевірити що підгружає +30 records
- [ ] Перевірити hasMore

**Test 2: SpaceView scroll (без фільтрів)**
- [ ] Відкрити `/breeds/list`
- [ ] Scroll до кінця
- [ ] Перевірити підгрузку

**Test 3: Config operator (опціонально)**
- [ ] Якщо треба - виправити operator в config
- [ ] Видалити "eq" для name field
- [ ] Дозволити auto-detect → "ilike"

**Результат:** ✅ Все працює, scroll підгружає дані!

---

**ПОТОЧНИЙ КРОК:** КРОК 1 - Minimal Viable Fix 🔨

---
