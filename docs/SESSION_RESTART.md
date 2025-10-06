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

**READY FOR DEVELOPMENT! 🚀**
