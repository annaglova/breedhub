# Dynamic View Rows Implementation & Smart Data Loading Strategy

## 🎯 ФІЛОСОФІЯ: ЗАВАНТАЖУЄМО ТІЛЬКИ ТЕ, ЩО ПОТРІБНО

**Offline-first НЕ означає "завантажити все"!**

У нас є таблиці з **9+ мільйонів записів**. Завантажувати все на клієнт = безглуздя.

### ✅ Правильний підхід:
- Завантажуємо тільки те, що користувач бачить
- Rows з view конфігу визначають розмір batch для реплікації
- Фільтрація і сортування на сервері (Supabase)
- RxDB = smart кеш, не сховище всієї БД

---

## ПОТОЧНИЙ СТАН ПРОЕКТУ (2025-09-30)

### ✅ Що вже працює:

1. **EntityReplicationService** - двостороння реплікація RxDB ↔ Supabase
   - Checkpoint-based інкрементальне завантаження
   - Realtime оновлення через Supabase channels
   - Conflict resolution (last-write-wins)
   - **ПРОБЛЕМА:** Завантажує тільки 100 записів і зупиняється (треба виправити)

2. **Динамічна генерація RxDB схем** з app_config
3. **BreedListCard працює з реальними даними** через useEntities hook
4. **SpaceStore** - універсальний store для всіх бізнес-сутностей
5. **Reactive UI** через Preact Signals

### ❌ Що НЕ працює:

1. **Rows захардкоджено 50** в SpaceComponent - має братись з view конфігу
2. **Replication batch = 100 хардкод** - має залежати від rows з view конфігу
3. **Total count неточний** - треба брати з Supabase metadata
4. **Реплікація завантажує тільки 100 і зупиняється** - треба виправити логіку

---

## 🏗️ ПРАВИЛЬНА АРХІТЕКТУРА

### Як має працювати:

```
┌─────────────────────────────────────────────┐
│  View Config (app_config)                   │
│  view_breeds_list: { rows: 50 }             │
│  view_breeds_grid: { rows: 20 }             │
└─────────────┬───────────────────────────────┘
              ↓
┌─────────────────────────────────────────────┐
│  SpaceStore.getViewRows()                   │
│  → повертає 50 для list, 20 для grid       │
└─────────────┬───────────────────────────────┘
              ↓
┌─────────────────────────────────────────────┐
│  EntityReplicationService                   │
│  batchSize = rows (50 або 20)               │
│  ↓                                           │
│  Завантажує з Supabase:                     │
│  - Initial load: rows * 2 (100 або 40)     │
│  - Incremental: rows (50 або 20)            │
│  - + total count metadata                   │
└─────────────┬───────────────────────────────┘
              ↓
┌─────────────────────────────────────────────┐
│  RxDB (smart кеш)                           │
│  Зберігає тільки завантажені записи        │
│  NOT entire table!                          │
└─────────────┬───────────────────────────────┘
              ↓
┌─────────────────────────────────────────────┐
│  UI (SpaceComponent)                        │
│  Показує rows записів (50 або 20)          │
│  Total: показує з metadata (9 млн)          │
└─────────────────────────────────────────────┘
```

### Ключові принципи:

1. **View config визначає все:**
   - Скільки показати (UI rows)
   - Скільки завантажити (replication batchSize)
   - Різні views = різні batch sizes

2. **Реплікація = слуга UI:**
   - Не завантажує більше, ніж потрібно для UI
   - batchSize залежить від view config
   - Initial load = rows * 2 (для плавного скролу)

3. **RxDB = кеш, не БД:**
   - Зберігає тільки те, що завантажили
   - При зміні фільтрів - нові дані з Supabase
   - Обмежений розмір (наприклад, max 5000 записів)

4. **Total count = з сервера:**
   - Metadata з Supabase (count: 'exact')
   - Показуємо "50 of 9,234,567"
   - Локальний count НЕ використовуємо для total

---

## 📝 ПЛАН РЕАЛІЗАЦІЇ

### ФАЗА 1: Динамічні rows з view конфігу ⏳

#### 1.1. SpaceStore - метод getViewRows()
**Файл:** `/packages/rxdb-store/src/stores/space-store.signal-store.ts`

```typescript
/**
 * Get rows per page for specific view
 * This determines BOTH UI pagination AND replication batch size
 */
getViewRows(entityType: string, viewType: string): number {
  const spaceConfig = this.spaceConfigs.get(entityType);

  // Try full key: view_breeds_list
  const viewKey = `view_${entityType}_${viewType}`;
  const viewConfig = spaceConfig?.views?.[viewKey];

  if (viewConfig?.rows) {
    console.log(`[SpaceStore] Rows for ${entityType}/${viewType}: ${viewConfig.rows}`);
    return viewConfig.rows;
  }

  // Fallback to space level
  if (spaceConfig?.rows) {
    console.log(`[SpaceStore] Using space-level rows for ${entityType}: ${spaceConfig.rows}`);
    return spaceConfig.rows;
  }

  // Final fallback
  console.warn(`[SpaceStore] No rows config found for ${entityType}/${viewType}, using default: 50`);
  return 50;
}
```

**Чому це важливо:**
- Один джерело правди для rows
- UI і реплікація синхронізовані
- Різні views можуть мати різні batch sizes (grid = 20, list = 50)

#### 1.2. SpaceComponent - використати динамічні rows
**Файл:** `/apps/app/src/components/space/SpaceComponent.tsx`

**Рядки 78-81 БУЛО:**
```typescript
const { data } = useEntitiesHook({
  rows: 50,  // ❌ ХАРДКОД
  from: page * 50,
});
```

**СТАЄ:**
```typescript
// Get current view mode
const viewMode = searchParams.get("view") || config.viewConfig[0].id;

// Get rows from view config (динамічно!)
const rowsPerPage = useMemo(() =>
  spaceStore.getViewRows(config.entitySchemaName, viewMode),
  [config.entitySchemaName, viewMode]
);

console.log(`[SpaceComponent] Using ${rowsPerPage} rows for ${viewMode} view`);

// Use dynamic rows for data loading
const { data, isLoading, error, isFetching } = useEntitiesHook({
  rows: rowsPerPage,  // ✅ ДИНАМІЧНО З КОНФІГУ
  from: page * rowsPerPage,
});
```

#### 1.3. Скидання page при зміні view
**Додати useEffect:**
```typescript
// Reset pagination when view changes
useEffect(() => {
  console.log(`[SpaceComponent] View changed to ${viewMode}, resetting page`);
  setPage(0);
  setAllEntities([]); // Clear loaded entities
}, [viewMode]);
```

**Чому це потрібно:**
- Grid показує 20 записів, list - 50
- При переключенні треба скинути пагінацію
- Інакше offset буде невірний

---

### ФАЗА 2: Реплікація залежить від rows ⏳

#### 2.1. EntityReplicationService - приймати batchSize з параметрів
**Файл:** `/packages/rxdb-store/src/services/entity-replication.service.ts`

**ПОТОЧНИЙ КОД (рядок 189-192):**
```typescript
const isInitialLoad = !checkpointOrNull || !checkpointOrNull?.updated_at;
const limit = isInitialLoad
  ? 1000  // ❌ ХАРДКОД - завантажує все
  : (batchSize || options.batchSize || 50);
```

**НОВИЙ КОД:**
```typescript
const isInitialLoad = !checkpointOrNull || !checkpointOrNull?.updated_at;

// Use batchSize from options (which comes from view config rows)
const configuredBatchSize = options.batchSize || 50;

const limit = isInitialLoad
  ? configuredBatchSize * 2  // ✅ Initial load = rows * 2 (для smooth scroll)
  : configuredBatchSize;       // ✅ Incremental = rows

console.log(`[EntityReplication-${entityType}] Pull limit:`, {
  isInitialLoad,
  limit,
  configuredBatchSize,
  checkpoint: checkpointOrNull
});
```

**Чому rows * 2 для initial load:**
- Дає запас для плавного скролу
- Користувач не чекає на другий batch одразу
- Все одно це не вся таблиця (50 * 2 = 100, не 9 млн!)

#### 2.2. Додати metadata для total count

**Додати в EntityReplicationService:**
```typescript
private entityMetadata = new Map<string, {
  total: number;
  lastSync: string;
  lastPullCheckpoint?: string;
}>();

/**
 * Get total count from server for entity type
 */
getTotalCount(entityType: string): number {
  return this.entityMetadata.get(entityType)?.total || 0;
}
```

**Змінити pullHandler для отримання count:**
```typescript
// Get data WITH total count
const { data, error, count } = await this.supabase
  .from(entityType)
  .select('*', { count: 'exact', head: false })  // ← count: 'exact'
  .order('updated_at', { ascending: true })
  .gt('updated_at', checkpointDate)
  .limit(limit);

if (error) {
  throw error;
}

// Save metadata with total count
this.entityMetadata.set(entityType, {
  total: count || 0,  // ← TOTAL з Supabase
  lastSync: new Date().toISOString(),
  lastPullCheckpoint: checkpointDate
});

console.log(`[EntityReplication-${entityType}] Total in Supabase: ${count}, loaded: ${data?.length || 0}`);
```

#### 2.3. SpaceStore - передати rows як batchSize
**Файл:** `/packages/rxdb-store/src/stores/space-store.signal-store.ts`

**ПОТОЧНИЙ КОД (рядок 1147-1152):**
```typescript
const success = await entityReplicationService.setupReplication(
  entityType,
  collection,
  schema,
  {
    batchSize: 100,  // ❌ ХАРДКОД
    pullInterval: 5000,
```

**НОВИЙ КОД:**
```typescript
// Get rows from view config for this entity
// Use first view config as default for replication batch size
const viewTypes = spaceConfig?.views ? Object.keys(spaceConfig.views) : [];
const firstViewKey = viewTypes[0];
const defaultRows = firstViewKey
  ? spaceConfig.views[firstViewKey]?.rows
  : spaceConfig?.rows || 50;

console.log(`[SpaceStore] Setting up replication for ${entityType} with batchSize: ${defaultRows}`);

const success = await entityReplicationService.setupReplication(
  entityType,
  collection,
  schema,
  {
    batchSize: defaultRows,  // ✅ ДИНАМІЧНО з view конфігу
    pullInterval: 5000,
```

**Логіка вибору batchSize:**
- Беремо rows з першого view конфігу (зазвичай list view)
- Якщо немає - беремо з space level
- Fallback - 50

---

### ФАЗА 3: Total count через EntityStore ⏳

#### 3.1. EntityStore - додати totalFromServer signal
**Файл:** `/packages/rxdb-store/src/stores/base/entity-store.ts`

```typescript
export class EntityStore<T extends { id: string }> {
  // Existing signals
  protected ids = signal<string[]>([]);
  protected entities = signal<Map<string, T>>(new Map());

  // NEW: Total count from server (metadata)
  totalFromServer = signal<number>(0);

  // Existing computed
  entityMap = computed(() => this.entities.value);
  entityList = computed(() =>
    this.ids.value.map(id => this.entities.value.get(id)!).filter(Boolean)
  );

  // Local total (що завантажено в RxDB)
  total = computed(() => this.ids.value.length);

  // NEW: Set total from server metadata
  setTotalFromServer(total: number) {
    this.totalFromServer.value = total;
    console.log(`[EntityStore] Total from server: ${total}`);
  }
}
```

#### 3.2. SpaceStore - прокинути metadata до EntityStore
**Після setupEntityReplication додати:**
```typescript
// Update entity store with server total count
const updateTotalCount = () => {
  const total = entityReplicationService.getTotalCount(entityType);
  if (total > 0 && entityStore) {
    entityStore.setTotalFromServer(total);
    console.log(`[SpaceStore] Updated ${entityType} total: ${total}`);
  }
};

// Initial update
updateTotalCount();

// Periodic updates (кожні 30 секунд)
setInterval(updateTotalCount, 30000);
```

#### 3.3. useEntities - повертати totalFromServer
**Файл:** `/apps/app/src/hooks/useEntities.ts`

```typescript
return {
  data: {
    entities: paginatedEntities,
    // Використовуємо server total якщо є, інакше локальний
    total: entityStore.totalFromServer.value || localTotal
  },
  isLoading,
  error: null,
  isFetching: false,
};
```

**Результат:**
- EntitiesCounter показує: "Showing 50 of 9,234,567"
- 50 = що завантажено (з RxDB)
- 9,234,567 = що є в Supabase (з metadata)

---

### ФАЗА 4: Виправити реплікацію (щоб не зупинялась) 🔧

**ПРОБЛЕМА:** Зараз завантажує 100 і зупиняється

**ПРИЧИНА:** Checkpoint не оновлюється правильно

**РІШЕННЯ:** Перевірити логіку в pullHandler:

```typescript
// Має повертати новий checkpoint після кожного pull
return {
  documents: mappedDocuments,
  checkpoint: {
    updated_at: lastDocument.updated_at,  // ← Важливо!
    lastPullAt: new Date().toISOString(),
    pulled: mappedDocuments.length > 0
  }
};
```

**Це окрема задача** - виправимо після того як зробимо динамічні rows.

---

## 🎯 МАЙБУТНЄ: Фільтрація і сортування (Phase N)

Коли дійдемо до фільтрів і сортування:

### Smart Loading з контекстом:
```typescript
// Реплікація отримує контекст запиту
const context = {
  filters: { breed: "Golden Retriever", age: ">2" },
  sort: { field: "name", order: "asc" },
  rows: 50
};

// Завантажує ТІЛЬКИ відфільтровані дані
const { data, count } = await supabase
  .from('animals')
  .select('*', { count: 'exact' })
  .eq('breed', 'Golden Retriever')
  .gt('age', 2)
  .order('name', { ascending: true })
  .limit(50);

// Total = кількість після фільтрів (наприклад, 1,234 з 9 млн)
```

**Переваги:**
- Завантажуємо тільки релевантні дані
- Фільтрація на сервері (швидко)
- RxDB кешує результати запиту
- При зміні фільтрів - новий запит

---

## ✅ МЕТРИКИ УСПІХУ

### Поточний стан:
- [x] Реплікація працює
- [x] Realtime sync працює
- [x] BreedListCard показує реальні дані
- [ ] Динамічні rows з view конфігу
- [ ] Rows впливають на replication batchSize
- [ ] Total count з Supabase metadata
- [ ] Реплікація не зупиняється на 100

### Після реалізації:
- [ ] List view завантажує 50, grid - 20 (динамічно)
- [ ] EntitiesCounter: "Showing 50 of 452" (точно)
- [ ] При зміні view - коректна пагінація
- [ ] Реплікація завантажує rows * 2 initial, потім rows incremental
- [ ] RxDB НЕ містить всю таблицю, тільки завантажене

### Performance targets:
- [ ] Initial load < 500ms (rows * 2 batch)
- [ ] View switch < 200ms (з кешу)
- [ ] Memory: < 50MB для 1000 записів
- [ ] НЕ 9 млн записів на клієнті! ❌

---

## 🚨 ВАЖЛИВІ ПРИНЦИПИ

1. **View config = single source of truth для rows**
2. **Rows визначають UI pagination AND replication batch**
3. **RxDB = smart кеш, НЕ повна копія БД**
4. **Total count ЗАВЖДИ з Supabase, НЕ з RxDB**
5. **Різні views можуть мати різні batch sizes**
6. **Initial load = rows * 2, incremental = rows**
7. **Фільтрація і сортування на сервері, НЕ на клієнті**

---

## 📊 ПОРІВНЯННЯ ПІДХОДІВ

### ❌ НЕПРАВИЛЬНО (старий підхід):
```
Replication: завантажити всю таблицю (9 млн)
  ↓
RxDB: зберегти все (crash browser)
  ↓
UI: показати 50 (з 9 млн в пам'яті)
```

### ✅ ПРАВИЛЬНО (новий підхід):
```
View config: rows = 50
  ↓
Replication: завантажити 100 (50 * 2) initial, потім 50 incremental
  ↓
RxDB: зберегти тільки завантажене (~200-500 записів)
  ↓
UI: показати 50
Total: показати 9 млн (з metadata)
```

---

## 🔗 ФАЙЛИ ДЛЯ ЗМІНИ

1. **SpaceStore** (`space-store.signal-store.ts`)
   - ✅ Додати `getViewRows()`
   - ✅ Передати rows як batchSize в setupReplication

2. **SpaceComponent** (`SpaceComponent.tsx`)
   - ✅ Використати `spaceStore.getViewRows()`
   - ✅ Додати reset page при зміні view

3. **EntityReplicationService** (`entity-replication.service.ts`)
   - ✅ Initial load = batchSize * 2
   - ✅ Incremental = batchSize
   - ✅ Зберігати metadata з total count

4. **EntityStore** (`entity-store.ts`)
   - ✅ Додати `totalFromServer` signal

5. **useEntities** (`useEntities.ts`)
   - ✅ Повертати totalFromServer

---

**Час реалізації:** ~2-3 години

**Пріоритет:** ВИСОКИЙ - це основа для всього іншого

**Статус:** Готові до реалізації ✅