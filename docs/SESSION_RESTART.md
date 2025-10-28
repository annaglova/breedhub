# 🔄 SESSION RESTART - BREEDHUB PROJECT

## 📅 Останнє оновлення: 2025-10-28

---

## 🎯 ПОТОЧНИЙ СТАН

**Статус:** Public Page Implementation - Phase 1 (Cover) 🚧

### 🚧 Поточна робота: Config-Driven Public Page System

**Документація:** [PUBLIC_PAGE_IMPLEMENTATION_PLAN.md](./PUBLIC_PAGE_IMPLEMENTATION_PLAN.md)

**Фаза:** Implementing cover/header components з мок даними

**Підхід:**
1. ✅ Створено базову структуру PublicPageTemplate з табами
2. ✅ Створено hookRegistry для універсального роутингу
3. ✅ Створено SpacePage для всіх entity types
4. 🚧 Імплементуємо cover/header з Angular reference
5. Використовуємо мок дані для початку (як і раніше)
6. Потім підключимо реальні дані з RxDB

**Поточні задачі:**
- [ ] CoverTemplate.tsx - базовий wrapper для cover
- [ ] DefaultCover.tsx - найпростіший варіант cover
- [ ] coverRegistry.tsx - маппінг type IDs на компоненти
- [ ] Інтегрувати cover в PublicPageTemplate
- [ ] PatronAvatar.tsx - компонент для patron avatars
- [ ] BreedCoverV1.tsx - breed cover з patronами

**Критичні рішення:**
- Навігаційні кнопки (expand, nav) переносимо з cover на базовий template
- Cover type визначається з entity.Cover.Type.Id (UUID)
- Починаємо з мок даних для швидкої візуалізації

---

### ✅ Що працює (Filtering & Pagination):
- ✅ **ID-First pagination** - fetch IDs, use cache, fetch missing
- ✅ **Filtering system** - SpaceStore.applyFilters() з URL state
- ✅ **Search** - mainFilterField з hybrid search (70/30 split)
- ✅ **Dynamic sorting** - URL params з config slugs
- ✅ **Entities counter** - smart caching, no flickering
- ✅ **Filter chips** - visual feedback з slug support
- ✅ **LookupInput** - ID-First для dictionary і collection modes
- ✅ **DropdownInput** - cursor pagination з X button
- ✅ **Offline support** - PWA Phase 1, RxDB fallback
- ✅ **Online/Offline indicator** - real-time status
- ✅ **Service fields bug fixed** - no more 422 errors
- ✅ **Race conditions fixed** - isLoadingRef prevents duplicates

### 📊 Results:
- ✅ 452/452 records loaded (all breeds)
- ✅ 70% traffic reduction with warm cache
- ✅ Works with any ORDER BY
- ✅ Reload preserves state (URL-based)
- ✅ Search with hybrid ranking
- ✅ Stable UI (no flickering)

**Поточна гілка:** `main`

---

## 🏗️ АРХІТЕКТУРА: Ключові принципи

### 🔥 RxDB = Smart Cache (НЕ повна копія БД!)

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

### ID-First Pagination: 4-Phase Architecture

**Чому ID-First?**
- ✅ Partial cache - реальна проблема (фільтри, пошук, сортування)
- ✅ Works з ANY ORDER BY
- ✅ Works з ANY filters
- ✅ 70% traffic savings з warm cache

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

## 🔍 КРИТИЧНІ ПРИНЦИПИ

1. **View config = single source of truth**
   - Визначає UI rows
   - Різні views = різні batch sizes

2. **RxDB = smart кеш, НЕ повна БД**
   - Зберігає ~200-500 записів
   - Завантажуємо on-demand
   - 9 млн на клієнті = катастрофа ❌

3. **ID-First pagination for everything**
   - Initial load → applyFilters()
   - Scroll → applyFilters(cursor)
   - Filters → applyFilters(filters, cursor)

4. **URL as single source of truth**
   - Filters в URL params (?type=dog&name=ch)
   - Sort в URL params (?sort=name-a)
   - Reload зберігає state

5. **Entities counter caching**
   - Read-only в EntitiesCounter
   - Write-only в SpaceComponent
   - Зберігає тільки справжній total (> entities.length)
   - Зберігає тільки без фільтрів

6. **Sort/Filter at space level, not view level**
   - Space = entity workspace (breeds, animals)
   - View = display mode (list, grid, tab)
   - Filters/sort apply to entity, not display

---

## 📂 ОСНОВНІ ФАЙЛИ

### Core Services
```
packages/rxdb-store/src/
├── services/entity-replication.service.ts  # Manual pull, checkpoint logic
├── stores/space-store.signal-store.ts      # applyFilters(), getSortOptions(), getFilterFields()
├── stores/dictionary-store.signal-store.ts # getDictionary() з ID-First + Hybrid Search
├── stores/app-config.signal-store.ts       # childContainerMapping, config hierarchy
└── stores/base/entity-store.ts             # EntityStore з totalFromServer signal
```

### UI Components
```
apps/app/src/
├── components/
│   ├── space/
│   │   ├── SpaceComponent.tsx              # Main component з URL state management
│   │   ├── SpaceView.tsx                   # Scroll handler, infinite scroll
│   │   ├── EntitiesCounter.tsx             # Smart caching, stable display
│   │   └── filters/
│   │       ├── FiltersDialog.tsx           # Dynamic filter rendering
│   │       ├── SortFilterSelector.tsx      # Sort + Filter button
│   │       ├── SortSelector.tsx            # Dynamic sort dropdown
│   │       └── FiltersSection.tsx          # Active filters chips
│   └── layout/
│       ├── Header.tsx                      # Top navigation з online/offline indicator
│       ├── Sidebar.tsx                     # Left navigation (spaces)
│       └── UserDrawer.tsx                  # Right drawer menu
└── hooks/useEntities.ts                    # Subscriptions на RxDB changes
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
- `/docs/FILTERING_IMPLEMENTATION_PLAN.md` - 🔥 **Filtering, Search, Counter (COMPLETE)**
- `/docs/ID_FIRST_PAGINATION.md` - ID-First architecture details
- `/docs/DICTIONARY_LOADING_STRATEGY.md` - Dictionary loading strategy
- `/docs/LOCAL_FIRST_ROADMAP.md` - Загальний roadmap проекту
- `/docs/UNIVERSAL_STORE_IMPLEMENTATION.md` - Universal store architecture

### Архітектура
- `/docs/PROPERTY_BASED_CONFIG_ARCHITECTURE.md` - Конфігураційна система
- `/docs/SPACE_STORE_ARCHITECTURE.md` - SpaceStore архітектура

### Config Admin
- `/apps/config-admin/docs/SCRIPTS.md` - Config generation scripts
- `/apps/config-admin/docs/WORKFLOW.md` - Development workflow

---

## 🔎 SEARCH & FILTERING

### mainFilterField Search
```typescript
// Config marks field for search
{
  id: "breed_field_name",
  mainFilterField: true,  // Used for main search input
  operator: "contains"
}

// URL updates: ?name=ch (uses slug, not full field ID)
// Debounced: 500ms delete, 700ms typing
// Minimum 2 characters required
```

### Hybrid Search (70/30 Split)
```typescript
// Phase 1: Starts with (70% of limit, high priority)
const startsWithResults = await supabase
  .select('id, name')
  .ilike('name', 'ch%')
  .limit(21);  // 70% of 30

// Phase 2: Contains (30% of limit, lower priority)
const containsResults = await supabase
  .select('id, name')
  .ilike('name', '%ch%')
  .not('name', 'ilike', 'ch%')
  .limit(9);  // 30% of 30

// Merge: starts_with first, then contains
return [...startsWithResults, ...containsResults];
```

### Filter Fields
```json
{
  "filter_fields": {
    "breed_field_pet_type_id": {
      "order": 1,
      "component": "LookupInput",
      "displayName": "Pet Type",
      "slug": "type",
      "fieldType": "uuid",
      "operator": "eq"
    }
  }
}
```

**URL:** `?type=dog-uuid&status=active`

---

## 💡 ВАЖЛИВІ НОТАТКИ

- DevTools IndexedDB viewer НЕ оновлюється автоматично - треба Refresh!
- mainFilterField виключається з filter modal (використовується для search bar)
- Component names в конфігу = точні назви компонентів (TextInput, НЕ "text")
- Entities counter: read-only в компоненті, write-only в SpaceComponent
- URL params з slugs для коротших URLs (?type=dog замість ?breed_field_pet_type_id=uuid)

---

## 🐛 TROUBLESHOOTING

**Проблема:** Scroll не підгружає дані
- Перевірити `hasMore` prop в SpaceView
- Перевірити `isLoadingMore` state
- Консоль: чи викликається `handleLoadMore`

**Проблема:** IndexedDB показує старі дані
- Клік правою → Refresh database в DevTools
- Або використай `await collection.count().exec()` в консолі

**Проблема:** RxDB schema hash mismatch
- Console: `indexedDB.deleteDatabase('rxdb-dexie-breedhub')`
- Refresh page (F5)
- Це нормально після зміни schema/config structure

**Проблема:** Entities counter "біситься"
- Перевірити localStorage: `totalCount_{entity}`
- Має оновлюватись тільки коли немає фільтрів і total > entities.length

---

## 📋 ЩО НЕ ЗРОБИЛИ (TODO)

### 🟡 ПРІОРИТЕТ 1: PWA Phase 2

**Статус:** 🟡 Optional (Phase 1 Complete)

**Що можна додати:**
- [ ] Custom offline page (зараз fallback на index.html)
- [ ] Deeper RxDB integration в Service Worker
- [ ] Cache strategy optimization
- [ ] Install prompt UI

**Estimated:** 4-6 годин

---

### 🟡 ПРІОРИТЕТ 2: Performance Optimization

**Статус:** 🟡 Optional

**Можливі покращення:**
- [ ] Performance metrics (cache hit rate tracking)
- [ ] Bundle size optimization
- [ ] Lazy loading для non-critical components
- [ ] Virtual scrolling для великих списків

**Estimated:** Varies

---

### 🟢 ПРІОРИТЕТ 3: Edge Cases

**Статус:** 🟢 Low Priority

**Складні сценарії:**
- [ ] Complex filter scenarios (OR/AND logic)
- [ ] Special operators (IN, BETWEEN, NOT IN)
- [ ] Nested JSONB filtering
- [ ] Date range filtering with timezone

**Note:** Додаються по мірі виникнення, не критичні зараз

**Estimated:** Incremental

---

## 🎯 NEXT STEPS

**Поточна робота:**
1. **Public Page Cover Implementation** - Phase 1 (PRIORITY)
   - CoverTemplate.tsx - базовий wrapper
   - DefaultCover.tsx - найпростіший варіант
   - Інтеграція в PublicPageTemplate
   - Мок дані для візуалізації

**Наступні фази:**
2. **Public Page Tabs & Content** - dynamic tab rendering з config
3. **Child Tables Integration** - kennels, pets lists в tabs
4. **Page Actions** - navigation, fullscreen buttons

**Опціонально (після Public Page):**
5. **PWA Phase 2** - custom offline page, покращити UX (4-6 годин)
6. **Performance Metrics** - tracking для оптимізації (2-3 години)
7. **Edge Cases** - складні фільтри, додаються по потребі

---

## 📊 МЕТРИКИ УСПІХУ

**Before:**
- ❌ 422/452 records (missing 30)
- ❌ 450KB traffic per full scroll
- ❌ Counter flickering
- ❌ No search
- ❌ No filters

**After:**
- ✅ 452/452 records always
- ✅ ~150KB traffic (70% reduction)
- ✅ Stable counter (no flickering)
- ✅ Search with hybrid ranking
- ✅ Filters with URL state
- ✅ Beautiful URLs (?name=ch&type=dog)
- ✅ Offline support (PWA Phase 1)

**Status:** ✅ Production Ready 🚀

---
