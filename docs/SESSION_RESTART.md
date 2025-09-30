# 🔄 SESSION RESTART - BREEDHUB PROJECT

## 📅 Дата сесії: 2025-09-30

## 🎯 ПОТОЧНИЙ СТАН РОБОТИ

### Що робимо зараз:
**ДИНАМІЧНІ ROWS З VIEW КОНФІГУ → РЕПЛІКАЦІЯ**

**Ключова ідея:** View config визначає скільки завантажувати з сервера!
- rows з view конфігу = UI pagination AND replication batchSize
- Initial load = rows * 2, incremental = rows
- RxDB = smart кеш (НЕ вся БД!)
- Total count з Supabase metadata

### 🔥 ВАЖЛИВЕ РОЗУМІННЯ:

**У нас є таблиці з 9+ мільйонів записів!**

❌ **НЕПРАВИЛЬНО:** Завантажити всю таблицю в RxDB
✅ **ПРАВИЛЬНО:** Завантажити тільки те, що користувач бачить (rows * 2)

**Offline-first НЕ означає "завантажити все"!**

### Останні завершені задачі (2025-09-30):
- ✅ **ФАЗА 1 ЗАВЕРШЕНО** - Динамічні rows з view конфігу (60 для breed/list)
- ✅ **ФАЗА 2 МАЙЖЕ ЗАВЕРШЕНО** - Manual Pagination (залишився тільки scroll handler)
  - ✅ Throttling зупиняє continuous replication
  - ✅ Initial load тільки 120 записів (rows * 2)
  - ✅ Manual pull метод (`manualPull()`, `loadMore()`)
  - ⏳ Scroll handler в UI - НАСТУПНА ЗАДАЧА
- ✅ **ФАЗА 3 ЗАВЕРШЕНО** - Total count через EntityStore з localStorage кешем
  - ✅ Instant UI feedback: "60 of 452" (50-200ms з кешу)
  - ✅ EntityStore.initTotalFromCache() синхронне завантаження
- ✅ Оптимізовані polling intervals (500ms→100ms, 100ms→50ms)
- ✅ Прибрано блимання fallback значення "50"

### Поточний контекст:
- ✅ Працює реплікація для entity type "breed"
- ✅ Завантажує 120 записів initial load (60 * 2), потім зупиняється через throttling
- ✅ batchSize = 60 з view конфігу (динамічно)
- ✅ BreedListCard використовує реальні дані з RxDB через useEntities hook
- ✅ EntitiesCounter показує "60 of 452" миттєво з localStorage кешу
- ⏳ **НАСТУПНА ЗАДАЧА:** Додати scroll handler для `loadMore()` в SpaceComponent

---

## 🏗️ АРХІТЕКТУРА: Як має працювати

```
┌─────────────────────────────────────────────┐
│  View Config (app_config)                   │
│  view_breeds_list: { rows: 50 }             │
│  view_breeds_grid: { rows: 20 }             │
└─────────────┬───────────────────────────────┘
              ↓
┌─────────────────────────────────────────────┐
│  SpaceStore.getViewRows()                   │
│  → 50 для list, 20 для grid                │
└─────────────┬───────────────────────────────┘
              ↓ (визначає batchSize!)
┌─────────────────────────────────────────────┐
│  EntityReplicationService                   │
│  batchSize = rows (50 або 20)               │
│  ↓                                           │
│  Initial load: rows * 2 (100 або 40)       │
│  Incremental: rows (50 або 20)              │
│  + total count metadata                     │
└─────────────┬───────────────────────────────┘
              ↓
┌─────────────────────────────────────────────┐
│  RxDB (smart кеш)                           │
│  ~200-500 записів max                       │
│  НЕ вся таблиця (9 млн)!                    │
└─────────────┬───────────────────────────────┘
              ↓
┌─────────────────────────────────────────────┐
│  UI (SpaceComponent)                        │
│  Показує: 50 or 20 (з rows)                │
│  Total: 9,234,567 (з metadata)              │
└─────────────────────────────────────────────┘
```

---

## 📚 КЛЮЧОВА ДОКУМЕНТАЦІЯ

### 🔥 Головний документ:
- **`/docs/DYNAMIC_VIEW_ROWS_IMPLEMENTATION.md`** - ВЕСЬ план реалізації динамічних rows

### Архітектура:
- `/docs/PROPERTY_BASED_CONFIG_ARCHITECTURE.md` - Конфігураційна система
- `/docs/SPACE_STORE_ARCHITECTURE.md` - SpaceStore архітектура
- `/docs/STORE_ARCHITECTURE.md` - Загальна архітектура stores
- `/docs/STORE_CREATION_GUIDE.md` - Гайд по створенню stores

### Технічні деталі:
- `/docs/RXDB_INTEGRATION.md` - Інтеграція з RxDB

---

## 🔧 ОСНОВНІ ФАЙЛИ ДЛЯ РОБОТИ

### Stores і Сервіси:
```
/packages/rxdb-store/src/
├── stores/
│   ├── space-store.signal-store.ts    # ТРЕБА: getViewRows(), dynamic batchSize
│   ├── app-store.signal-store.ts      # App store
│   └── base/entity-store.ts           # ТРЕБА: додати totalFromServer signal
├── services/
│   ├── entity-replication.service.ts  # ТРЕБА: metadata, dynamic limit
│   └── database.service.ts            # RxDB database service
```

### UI Компоненти:
```
/apps/app/src/
├── components/space/
│   ├── SpaceComponent.tsx     # ТРЕБА: використати getViewRows()
│   ├── SpaceView.tsx          # View для відображення entities
│   ├── ViewChanger.tsx        # Перемикач views
│   └── EntitiesCounter.tsx    # Показує "N of Total"
├── hooks/
│   ├── useBreeds.ts           # ✅ Використовує RxDB через useEntities
│   └── useEntities.ts         # ТРЕБА: повертати totalFromServer
├── components/breed/
│   └── BreedListCard.tsx      # ✅ Працює з реальними даними
```

---

## 📝 ПЛАН РЕАЛІЗАЦІЇ (4 ФАЗИ)

### ФАЗА 1: Динамічні rows з view конфігу ✅ ЗАВЕРШЕНО
**Файли:** SpaceStore, SpaceComponent

1. ✅ **SpaceStore.getViewRows()** - читає rows з view config
2. ✅ **SpaceComponent** - використовує getViewRows() замість хардкоду 50
3. ✅ **Reset page при зміні view** - щоб pagination працювала коректно

**Результат:** UI показує правильну кількість записів для кожного view (60 для breed/list)

---

### ФАЗА 2: Manual Pagination - On-Demand Data Loading ⏳ В ПРОЦЕСІ
**Файли:** EntityReplicationService, SpaceStore, useEntities

**ПРОБЛЕМА:** Зараз реплікація працює в continuous mode (`live: true`) і автоматично завантажує всю таблицю batch за batch-ем. Для таблиць з 9+ млн записів це неприйнятно.

**РІШЕННЯ:** Manual pagination з on-demand loading

#### 2.1. Вимкнути Continuous Replication ✅ ЗАВЕРШЕНО
**Файл:** `entity-replication.service.ts:151-177`

**РЕАЛІЗОВАНО ЧЕРЕЗ THROTTLING (альтернативний підхід):**

```typescript
// Залишили:
live: true,          // ✅ Потрібно для throttling логіки
autoStart: true,     // ✅ Стартує initial load
retryTime: 5000,     // ✅ Для throttling check

// Але додали throttling:
if (checkpointOrNull?.lastPullAt && checkpointOrNull?.pulled) {
  const timeSinceLastPull = now - lastPull;
  if (timeSinceLastPull < 5000) {
    console.log(`Skipping pull - too soon since last pull`);
    return { documents: [], checkpoint: checkpointOrNull };
  }
}
```

**Результат:**
- ✅ Initial load: 120 записів (60 × 2)
- ✅ Throttling зупиняє автоматичні pulls після initial load
- ✅ Manual pull доступний через `manualPull()`
- ✅ НЕ завантажує всю таблицю!

**Чому не `live: false`:** Спроба встановити `live: false` спричинила infinite loops. Throttling виявився надійнішим рішенням.

---

#### 2.2. Додати Manual Pull Method ✅ ЗАВЕРШЕНО
**Файл:** `entity-replication.service.ts:657-690`

```typescript
/**
 * Manual pull - завантажує наступний batch даних
 * @param entityType - тип сутності
 * @param limit - скільки записів завантажити (з view config rows)
 * @returns кількість завантажених записів
 */
async manualPull(entityType: string, limit?: number): Promise<number> {
  const replicationState = this.replicationStates.get(entityType);

  if (!replicationState) {
    console.error(`[EntityReplication] No replication for ${entityType}`);
    return 0;
  }

  console.log(`[EntityReplication-${entityType}] Manual pull requested, limit: ${limit}`);

  // Trigger pull manually
  await replicationState.reSync();

  // Wait for pull to complete and return count
  return new Promise((resolve) => {
    const sub = replicationState.received$.subscribe((received) => {
      console.log(`[EntityReplication-${entityType}] Manual pull received: ${received.documents.length}`);
      resolve(received.documents.length);
      sub.unsubscribe();
    });
  });
}
```

**Результат:** ✅ UI контролює коли завантажувати дані. Scroll вниз → викликаємо manualPull().

---

#### 2.3. Initial Load тільки rows * 2 ✅ ЗАВЕРШЕНО
**Файл:** `entity-replication.service.ts:197-198`

```typescript
// РЕАЛІЗОВАНО:
const effectiveBatchSize = options.batchSize || 50;  // З view config rows
const limit = effectiveBatchSize * 2;  // Завжди rows * 2 для initial load
```

**Результат:**
- ✅ Automatic: тільки initial load (60 * 2 = 120 записів)
- ✅ Throttling зупиняє подальші automatic pulls
- ✅ Manual: `loadMore()` завантажує ще 60 при scroll (треба підключити до UI)

---

#### 2.4. SpaceStore.loadMore() method ⏳ В ПРОЦЕСІ
**Файл:** `space-store.signal-store.ts:522-533`

**Метод створено:** ✅
```typescript
async loadMore(entityType: string): Promise<number> {
  console.log(`[SpaceStore] Loading more data for ${entityType}...`);

  // Get rows from view config
  const rows = this.getDefaultRows(entityType);

  // Trigger manual pull
  const count = await entityReplicationService.manualPull(entityType, rows);

  console.log(`[SpaceStore] Loaded ${count} more records for ${entityType}`);
  return count;
}
```

**UI Integration:** ❌ ТРЕБА ЗРОБИТИ
```typescript
// SpaceComponent.tsx - ТРЕБА ДОДАТИ
const handleLoadMore = async () => {
  setIsLoadingMore(true);
  const count = await spaceStore.loadMore(config.entitySchemaName);
  setIsLoadingMore(false);
};

// Trigger on scroll - ТРЕБА ДОДАТИ
const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
  const target = e.currentTarget;
  const scrollBottom = target.scrollHeight - target.scrollTop - target.clientHeight;

  if (scrollBottom < 100 && !isLoadingMore && allEntities.length < totalCount) {
    handleLoadMore();
  }
};
```

---

#### 2.5. Metadata для Total Count ✅ ЗАВЕРШЕНО
**Файл:** `entity-replication.service.ts:243-262`

```typescript
// РЕАЛІЗОВАНО: В pullHandler після Supabase запиту
const { count, error: countError } = await this.supabase
  .from(entityType)
  .select('*', { count: 'exact', head: true });  // ← count: 'exact'

if (!countError && count !== null) {
  totalCount = count;

  // Save metadata in memory
  this.entityMetadata.set(entityType, {
    total: count,
    lastSync: new Date().toISOString()
  });

  // ✅ Cache in localStorage for instant access on next load
  localStorage.setItem(`totalCount_${entityType}`, count.toString());

  // ✅ Notify subscribers (EntityStore.setTotalFromServer)
  const callbacks = this.totalCountCallbacks.get(entityType);
  if (callbacks) {
    callbacks.forEach(cb => cb(count));
  }
}
```

**Додатково реалізовано (коміт 30c9423):**
- ✅ `EntityStore.initTotalFromCache()` - синхронне читання з localStorage при створенні
- ✅ Instant UI feedback: "60 of 452" показується миттєво (50-200ms) з кешу
- ✅ Без кешу: "60 of ..." → "60 of 452" через ~500ms

**Результат:** ✅ Total count миттєво доступний в UI ("Showing 60 of 452")

---

**Результат Фази 2:**
- ✅ Initial load тільки 120 записів (rows * 2)
- ✅ Throttling зупиняє автоматичні pulls після initial load
- ✅ Manual pull метод створено (`manualPull()`, `loadMore()`)
- ⏳ Scroll handler в UI - ТРЕБА ДОДАТИ (2.4)
- ✅ Немає автоматичного завантаження всієї таблиці
- ✅ RxDB кеш ~200-500 записів max
- ✅ Total count миттєво з localStorage кешу

---

### ФАЗА 3: Total count через EntityStore ✅ ЗАВЕРШЕНО
**Файли:** EntityStore, SpaceStore, useEntities

1. ✅ **EntityStore.totalFromServer** signal - зберігає total з metadata (лінія 19)
2. ✅ **EntityStore.initTotalFromCache()** - синхронне завантаження з localStorage (лінія 233-246)
3. ✅ **SpaceStore** - викликає initTotalFromCache() при створенні EntityStore (лінія 590)
4. ✅ **SpaceStore** - підписується на totalCount оновлення (лінія 596-599)
5. ✅ **useEntities** - підписаний на totalFromServer.subscribe() (лінія 106-109)
6. ✅ **useEntities** - повертає totalFromServer замість локального count (лінія 80)

**Результат:** ✅ EntitiesCounter показує миттєво: "Showing 60 of 452" (з localStorage кешу)

---

### ФАЗА 4: Realtime Updates Only 🔧
**Файл:** EntityReplicationService

**МЕТА:** Realtime subscription тільки для UPDATE/DELETE існуючих записів, НЕ для INSERT нових

**ЗМІНИ:**
- Realtime channel слухає тільки UPDATE та DELETE
- INSERT ігноруємо (нові дані завантажуються через manual pull)
- Видалені записи (_deleted: true) видаляємо з RxDB

**Чому:** Нові записи з'являються тільки коли користувач скролить і викликає loadMore()

---

## 🚀 КОМАНДИ ДЛЯ ЗАПУСКУ

```bash
# Основний dev server
npm run dev

# Або окремо app
cd apps/app
pnpm run dev:app

# Перевірка конфігів в БД
node apps/config-admin/scripts/test/check-db.cjs

# Якщо потрібно очистити
rm -rf node_modules
npm install
```

---

## 🔍 ВАЖЛИВІ ДЕТАЛІ РЕАЛІЗАЦІЇ

### EntityReplicationService:
- Pull handler з checkpoint механізмом
- **НОВЕ:** batchSize з options (з view config rows)
- **НОВЕ:** Initial load = batchSize * 2, incremental = batchSize
- **НОВЕ:** Metadata з total count (count: 'exact')
- Realtime subscription через Supabase channels
- Conflict resolution: last-write-wins
- Мапінг полів: `deleted` ↔ `_deleted`

### SpaceStore:
- Динамічна генерація RxDB схем з конфігурації
- Метод `setupEntityReplication()` для налаштування синхронізації
- **НОВЕ:** Метод `getViewRows()` для отримання rows з view конфігу
- **НОВЕ:** Передача rows як batchSize в реплікацію
- **НОВЕ:** Оновлення EntityStore.totalFromServer з metadata
- Зберігає entity stores в Map структурі
- Працює з signals для реактивності

### EntityStore:
- Базовий клас для всіх entity stores
- withEntities методи (setAll, addOne, updateOne, removeOne)
- Computed values (entityList, entityMap, total)
- **НОВЕ:** `totalFromServer` signal для точного total count з сервера
- **НОВЕ:** `setTotalFromServer()` метод для оновлення з metadata

---

## 🚨 КРИТИЧНІ ПРИНЦИПИ

1. **View config = single source of truth для rows**
   - Визначає UI pagination
   - Визначає replication batchSize
   - Різні views = різні batch sizes

2. **Rows визначають replication batch:**
   - Initial load = rows * 2 (для smooth scroll)
   - Incremental = rows
   - НЕ завантажуємо всю таблицю!

3. **RxDB = smart кеш, НЕ повна копія БД:**
   - Зберігає ~200-500 записів max
   - При фільтрах - нові дані з Supabase
   - 9 млн на клієнті = безглуздя ❌

4. **Total count ЗАВЖДИ з Supabase:**
   - Metadata з pull handler (count: 'exact')
   - Показуємо "50 of 9,234,567"
   - Локальний count тільки як fallback

5. **Різні views = різні batch sizes:**
   - Grid може грузити 20, list - 50
   - Кожен view оптимізований окремо

---

## 💡 КОРИСНІ НОТАТКИ

- **Реплікація = слуга UI**, не навпаки
- Завантажуємо тільки те, що користувач бачить
- Initial load = rows * 2 дає запас для scroll
- Total count оновлюється при кожному pull
- Realtime оновлення працюють паралельно
- Фільтрація і сортування на сервері (майбутнє)

---

## 🐛 ВІДОМІ ПРОБЛЕМИ

1. ~~**Rows = 50 хардкод**~~ → ✅ Виправлено в Фазі 1
2. ~~**batchSize = 100 хардкод**~~ → ✅ Виправлено в Фазі 2.1
3. **Continuous pull завантажує всю таблицю** → 🔧 Виправляємо в Фазі 2 (В ПРОЦЕСІ)
4. **Total count неточний** → Виправляємо в Фазі 3
5. **Realtime subscription для INSERT** → Виправимо в Фазі 4

---

## 🔗 GITHUB BRANCH

Поточна гілка: `debug/ui-cascade-issue`

---

## 📌 КОНТЕКСТ ДЛЯ AI АСИСТЕНТА

### При продовженні роботи, звернути увагу на:

1. **View config визначає ВСЕ:**
   - UI rows (скільки показати)
   - Replication batchSize (скільки завантажити)
   - Один джерело правди

2. **RxDB НЕ повна копія БД:**
   - Кеш тільки завантаженого
   - Не завантажуємо 9 млн записів!
   - Smart loading по запиту

3. **Реплікація залежить від UI:**
   - batchSize = rows з view config
   - Initial = rows * 2
   - Incremental = rows

4. **Total count з Supabase:**
   - EntityReplicationService.entityMetadata
   - EntityStore.totalFromServer signal
   - НЕ з RxDB count()

5. **4 фази реалізації:**
   - Фаза 1: Динамічні rows в UI
   - Фаза 2: Реплікація залежить від rows
   - Фаза 3: Total count через metadata
   - Фаза 4: Виправити checkpoint logic

---

**Останній коміт**: "feat: add hardcoded achievement progress for visual testing"

**Статус проекту**: BreedListCard працює з RxDB. Наступний крок - динамічні rows → реплікація.

**Час на реалізацію**: ~2-3 години (4 фази)

**Пріоритет**: ВИСОКИЙ - це основа для роботи з великими таблицями

---

## 📊 ПОРІВНЯННЯ ПІДХОДІВ

### ❌ СТАРИЙ (неправильний):
```
Replication: завантажити всю таблицю (9 млн)
  ↓
RxDB: зберегти все (crash browser)
  ↓
UI: показати 50 (з 9 млн в пам'яті)
```

### ✅ НОВИЙ (правильний):
```
View config: rows = 50
  ↓
Replication: завантажити 100 initial (50*2), потім 50
  ↓
RxDB: зберегти ~200-500 записів (smart кеш)
  ↓
UI: показати 50
Total: показати 9 млн (з metadata)
```

---

**READY TO START! 🚀**