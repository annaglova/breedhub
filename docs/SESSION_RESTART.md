# 🔄 SESSION RESTART - BREEDHUB

**Last Updated:** 2024-11-25

Швидкий старт для продовження роботи над проектом. Детальна архітектура та принципи в окремих документах.

---

## 🚀 ШВИДКИЙ СТАРТ

```bash
# Запустити dev server
cd /Users/annaglova/projects/breedhub
pnpm dev:app

# Перевірити конфіги в БД
node apps/config-admin/scripts/test/check-db.cjs

# Очистити IndexedDB при schema changes
# Console: indexedDB.deleteDatabase('rxdb-dexie-breedhub')
# Потім: F5
```

### DevTools Tips
- **IndexedDB:** Application → IndexedDB → rxdb-dexie-breed → rxdocuments
- **Refresh database view** щоб побачити актуальні дані (не оновлюється автоматично!)
- **Console:** `await collection.count().exec()` для перевірки кількості записів

---

## 🎯 КЛЮЧОВІ ПРИНЦИПИ

Детальні принципи в [CORE_PRINCIPLES.md](./CORE_PRINCIPLES.md)

### 1. Local-First Architecture
```
Supabase ↔ RxDB (smart cache) ↔ Store → UI
```
- ✅ Все через RxDB, ніколи напряму з Supabase
- ✅ RxDB = smart cache (~200-500 records), НЕ повна БД
- ❌ НІКОЛИ не завантажуємо мільйони записів на клієнт

### 2. ID-First Loading Pattern
```typescript
// 1. Fetch IDs (lightweight ~1KB)
const ids = await supabase.select('id, name').limit(30);

// 2. Check RxDB cache
const cached = await rxdb.find({ id: { $in: ids } });

// 3. Fetch only missing
const fresh = await supabase.select('*').in('id', missingIds);

// 4. Merge + maintain order
return mergeAndSort(cached, fresh, ids);
```
**Результат:** 70% traffic reduction з warm cache

### 3. Configuration-Driven Development
```
Supabase app_config → SpaceStore.entityConfigs → Dynamic UI
```
- Entity structure, fields, tabs, views - все в конфігах
- Зміна UI без деплою (змінив config → reload)

### 4. Universal Collections Pattern
- **DictionaryStore** - universal `dictionaries` collection з `additional` JSON field
- **Child Collections** - `breed_children` з `tableType` + `additional` field
- **SpaceStore** - динамічно створює EntityStore для кожного entity type

---

## 📂 ОСНОВНІ ФАЙЛИ

### Core Services
```
packages/rxdb-store/src/
├── services/entity-replication.service.ts  # Manual pull, checkpoint logic
├── stores/space-store.signal-store.ts      # Universal store orchestrator
├── stores/dictionary-store.signal-store.ts # Dictionary loading with ID-First
├── stores/app-config.signal-store.ts       # Config loading and parsing
└── stores/base/entity-store.ts             # Base EntityStore with signals
```

### UI Components
```
apps/app/src/
├── components/space/
│   ├── SpaceComponent.tsx                  # Main space component
│   ├── SpaceView.tsx                       # List/Grid views
│   ├── EntitiesCounter.tsx                 # Total count display
│   └── filters/
│       ├── FiltersDialog.tsx               # Dynamic filters
│       ├── SortSelector.tsx                # Dynamic sorting
│       └── FiltersSection.tsx              # Active filter chips
└── hooks/useEntities.ts                    # RxDB subscriptions
```

---

## 🐛 TROUBLESHOOTING

### Проблема: IndexedDB показує старі дані
**Рішення:** Клік правою → Refresh database в DevTools

### Проблема: RxDB schema hash mismatch
**Рішення:**
```javascript
// Console
indexedDB.deleteDatabase('rxdb-dexie-breedhub')
// Потім F5
```
Це нормально після зміни schema/config structure.

### Проблема: Scroll не підгружає дані
**Перевірити:**
- `hasMore` prop в SpaceView
- `isLoadingMore` state
- Консоль: чи викликається `handleLoadMore`

### Проблема: Entities counter "біситься"
**Перевірити:**
- localStorage: `totalCount_{entity}`
- Має оновлюватись тільки коли немає фільтрів і `total > entities.length`

### Проблема: 422 errors або missing records
**Причини:**
- Service fields в SELECT (updated_at, created_at додаються автоматично)
- Race conditions (використовуй isLoadingRef)
- Partial cache з wrong ORDER BY (використовуй ID-First)

---

## 💡 ВАЖЛИВІ НОТАТКИ

### URL State Management
- Filters: `?type=dog&status=active` (використовуємо slugs)
- Search: `?name=ch` (mainFilterField)
- Sort: `?sort=name-a` (slug + direction)
- View: `?view=grid` (list/grid/tab)

### Config Principles
- Component names в конфігу = точні назви (TextInput, НЕ "text")
- `mainFilterField: true` = виключається з filter modal (тільки search bar)
- `dataSource: "collection"` = використовує SpaceStore замість DictionaryStore
- Sort/Filter на рівні space, НЕ view

### RxDB Cache Strategy
- TTL для dictionaries: 14 днів
- Автоматичний cleanup при старті app
- Natural cache warming через user interactions
- Manual pagination (on-demand loading)

---

## 📚 ДОКУМЕНТАЦІЯ

### 🔥 Source of Truth
- [CORE_PRINCIPLES.md](./CORE_PRINCIPLES.md) - **Фундаментальні принципи (ЧИТАЙ ПЕРШИМ)**

### Активні задачі
- [TODO.md](./TODO.md) - Поточні та майбутні задачі

### Детальна архітектура
- [SPACE_STORE_ARCHITECTURE.md](./SPACE_STORE_ARCHITECTURE.md) - SpaceStore architecture
- [STORE_CREATION_GUIDE.md](./STORE_CREATION_GUIDE.md) - Як працювати зі stores
- [CONFIG_ARCHITECTURE.md](./CONFIG_ARCHITECTURE.md) - Config-driven development

### Реалізація features
- [FILTERING_IMPLEMENTATION_PLAN.md](./FILTERING_IMPLEMENTATION_PLAN.md) - Filtering, Search, Counter
- [CHILD_TABLES_IMPLEMENTATION_PLAN.md](./CHILD_TABLES_IMPLEMENTATION_PLAN.md) - Child tables architecture
- [ID_FIRST_PAGINATION.md](./ID_FIRST_PAGINATION.md) - ID-First pagination details
- [PUBLIC_PAGE_IMPLEMENTATION_PLAN.md](./PUBLIC_PAGE_IMPLEMENTATION_PLAN.md) - Public pages

### Roadmap
- [LOCAL_FIRST_ROADMAP.md](./LOCAL_FIRST_ROADMAP.md) - Загальний project roadmap
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Future vision

### Інші документи
- [PROPERTY_BASED_CONFIG_ARCHITECTURE.md](./PROPERTY_BASED_CONFIG_ARCHITECTURE.md) - Property-based configs
- [REPLICATION_ARCHITECTURE.md](./REPLICATION_ARCHITECTURE.md) - RxDB replication
- [SELECTED_ENTITY_PATTERN.md](./SELECTED_ENTITY_PATTERN.md) - Selection pattern
- [PEDIGREE_GRAPHQL_ARCHITECTURE.md](./PEDIGREE_GRAPHQL_ARCHITECTURE.md) - Pedigree GraphQL

### Архівовані (історична довідка)
- [archive/DICTIONARY_LOADING_STRATEGY.md](./archive/DICTIONARY_LOADING_STRATEGY.md) - Еволюція pagination
- [archive/ANGULAR_PATTERNS_TO_ADOPT.md](./archive/ANGULAR_PATTERNS_TO_ADOPT.md) - Міграція з Angular
- [archive/MONOREPO_ANALYSIS.md](./archive/MONOREPO_ANALYSIS.md) - Monorepo decision
- [archive/DYNAMIC_VIEW_ROWS_IMPLEMENTATION.md](./archive/DYNAMIC_VIEW_ROWS_IMPLEMENTATION.md) - Dynamic view rows
- [archive/UNIVERSAL_STORE_IMPLEMENTATION.md](./archive/UNIVERSAL_STORE_IMPLEMENTATION.md) - Universal store history

---

## 🎯 ЩО ДАЛІ?

**Дивись:** [TODO.md](./TODO.md) для актуальних задач

**Принципи:** [CORE_PRINCIPLES.md](./CORE_PRINCIPLES.md) для розуміння архітектури

**Швидкий старт:** `pnpm dev:app` → відкрий DevTools → почни кодити! 🚀
