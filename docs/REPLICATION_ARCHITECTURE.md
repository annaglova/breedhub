# 🔄 Replication Architecture

## 📅 Останнє оновлення: 2025-10-26

---

## 🎯 ПОТОЧНИЙ СТАН

**Статус:** Needs Refactoring (Realtime Problem + No Staleness Check) ⚠️

### ✅ Що працює:

1. **Background Auto-Replication** (Main Thread)
   - RxDB Replication Plugin
   - Live: true (постійна реплікація)
   - AutoStart: true (запускається автоматично)
   - RetryTime: 5 секунд між спробами

2. **Throttling Mechanism**
   - Не частіше ніж раз на 5 секунд
   - Запобігає spam requests
   - Перший pull завжди дозволений (для totalCount)

3. **Rate Limiting**
   - Maximum 3 concurrent requests per entity
   - Auto-queue при перевищенні ліміту

4. **Realtime Subscriptions**
   - Supabase WebSocket для live updates
   - Events: INSERT, UPDATE, DELETE
   - Auto-sync при змінах в БД

5. **Manual Pull для Pagination**
   - `manualPull()` method
   - Використовується SpaceStore для scroll
   - Checkpoint-based continuation

6. **Bi-directional Sync**
   - Pull: Supabase → RxDB
   - Push: RxDB → Supabase (при локальних змінах)

### ❌ Що НЕ працює:

- **Web Workers** - вся реплікація в main thread
- **Background Sync API** - немає PWA background sync
- **Service Worker Sync** - немає синхронізації через SW
- **Intelligent Scheduling** - немає пріоритизації entity types
- **Staleness Check** - ID-First не перевіряє updated_at (може повертати застарілі дані)

### 🚨 КРИТИЧНА ПРОБЛЕМА: Realtime для великих таблиць

**Проблема:**
- Realtime підписка на **ВСЮ** таблицю (напр., `animal` з 500,000 records)
- Користувач кешує тільки **30 своїх** тварин (space_id = user_123)
- WebSocket шле **ВСІ** events (CREATE/UPDATE/DELETE для всіх користувачів)
- **95%+ waste** - непотрібні events для чужих даних

**Impact:**
- ❌ Battery drain (постійне WebSocket з'єднання)
- ❌ Bandwidth waste (~5MB/день непотрібних events)
- ❌ Processing overhead (фільтрація непотрібних events)
- ❌ Складність debugging (spam в консолі)

**Example:**
```
animal table: 500,000 records
User cache: 30 records (0.006%)

WebSocket events per day:
- Total events: ~10,000
- Relevant events: ~10 (0.1%) ✅
- Wasted events: ~9,990 (99.9%) ❌
```

---

## 🏗️ АРХІТЕКТУРА

### Current Flow

```
┌─────────────────────────────────────────────────────────┐
│                    EntityReplicationService              │
│                      (Singleton, Main Thread)            │
└─────────────────────────────────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
    ┌────▼────┐        ┌──────▼──────┐      ┌─────▼─────┐
    │  Pull   │        │    Push     │      │ Realtime  │
    │ Handler │        │  Handler    │      │ WebSocket │
    └────┬────┘        └──────┬──────┘      └─────┬─────┘
         │                    │                    │
         │                    │                    │
    ┌────▼─────────────────────▼────────────────────▼────┐
    │              Supabase (Remote DB)                   │
    └─────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │   RxDB (Local)   │
                    └──────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │   React UI       │
                    └──────────────────┘
```

### Parallel: ID-First Pagination (No Replication)

```
┌─────────────────┐
│  SpaceStore     │
│  applyFilters() │
└────────┬────────┘
         │
         │ Direct fetch (bypasses replication)
         ▼
┌─────────────────┐
│    Supabase     │
└────────┬────────┘
         │
         │ IDs + missing records
         ▼
┌─────────────────┐
│  RxDB Cache     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   React UI      │
└─────────────────┘
```

**Key Point:** ID-First pagination НЕ використовує replication service!
- Прямі запити до Supabase через SpaceStore
- Реплікація працює паралельно для background sync
- Немає конфліктів між двома підходами

---

## 🔧 КОМПОНЕНТИ РЕПЛІКАЦІЇ

### 1. Pull Handler

**Призначення:** Завантажує зміни з Supabase → RxDB

**Логіка:**
```typescript
async pullHandler(checkpointOrNull, batchSize) {
  // 1. Throttling (не частіше 5 сек)
  if (timeSinceLastPull < 5000) {
    return { documents: [], checkpoint };
  }

  // 2. Rate limiting (max 3 concurrent)
  if (activeRequests >= 3) {
    await delay(1000);
  }

  // 3. Fetch з checkpoint
  const data = await supabase
    .select('*')
    .gt('updated_at', checkpoint.updated_at)
    .order('updated_at', 'asc')
    .limit(batchSize);

  // 4. Get total count (тільки при першому pull)
  if (!hasMetadata) {
    const { count } = await supabase.select('*', { count: 'exact', head: true });
    // Cache в localStorage + memory
  }

  // 5. Map Supabase → RxDB format
  const documents = data.map(doc => mapSupabaseToRxDB(doc));

  // 6. Return з новим checkpoint
  return {
    documents,
    checkpoint: {
      updated_at: lastDoc.updated_at,
      pulled: true,
      lastPullAt: now
    }
  };
}
```

**Features:**
- ✅ Checkpoint-based pagination (no missing records)
- ✅ Auto throttling (no spam)
- ✅ Rate limiting (no server overload)
- ✅ Total count caching (instant UI feedback)

### 2. Push Handler

**Призначення:** Відправляє локальні зміни RxDB → Supabase

**Логіка:**
```typescript
async pushHandler(rows) {
  const conflicts = [];

  for (const row of rows) {
    const supabaseData = mapRxDBToSupabase(row.newDocumentState);

    if (row.newDocumentState._deleted) {
      // Soft delete
      await supabase.upsert({ ...supabaseData, deleted: true });
    } else {
      // Upsert
      await supabase.upsert(supabaseData);
    }
  }

  return conflicts; // Повертаємо конфлікти для retry
}
```

**Features:**
- ✅ Soft deletes (_deleted → deleted)
- ✅ Upsert strategy (no duplicates)
- ✅ Conflict detection
- ❌ No conflict resolution (relies on last-write-wins)

### 3. Realtime Subscription

**Призначення:** Live updates через Supabase WebSocket

**Логіка:**
```typescript
supabase
  .channel(`${entityType}-changes`)
  .on('postgres_changes', { event: '*', table: entityType }, async (payload) => {
    if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
      const rxdbDoc = mapSupabaseToRxDB(payload.new);

      const existing = await collection.findOne(rxdbDoc.id).exec();

      if (existing && rxdbDoc.updated_at > existing.updated_at) {
        await existing.patch(rxdbDoc);
      } else if (!existing) {
        await collection.insert(rxdbDoc);
      }
    } else if (payload.eventType === 'DELETE') {
      await existing.patch({ _deleted: true });
    }
  });
```

**Features:**
- ✅ Instant updates (no polling)
- ✅ Optimistic concurrency (checks updated_at)
- ✅ Soft deletes
- ⚠️ Limited by Supabase: `eventsPerSecond: 2`

### 4. Manual Pull

**Призначення:** On-demand scroll pagination (НЕ автоматична реплікація)

**Використання:**
```typescript
// SpaceStore.loadMore()
const inserted = await replicationService.manualPull(entityType, 30);
```

**Логіка:**
```typescript
async manualPull(entityType, limit = 30) {
  // 1. Get checkpoint from RxDB (latest document)
  const latestDoc = await collection.findOne({ sort: [{ updated_at: 'desc' }] }).exec();
  const checkpoint = latestDoc ? latestDoc.updated_at : new Date(0).toISOString();

  // 2. Fetch next batch
  const { data } = await supabase
    .select('*')
    .gt('updated_at', checkpoint)
    .order('updated_at', 'asc')
    .limit(limit);

  // 3. BulkUpsert (batch insert, no flickering)
  await collection.bulkUpsert(data.map(mapSupabaseToRxDB));

  // 4. Save checkpoint to localStorage
  localStorage.setItem(`checkpoint_${entityType}`, JSON.stringify(newCheckpoint));

  return data.length;
}
```

**Features:**
- ✅ Checkpoint persistence (localStorage)
- ✅ BulkUpsert (no UI flickering)
- ✅ Works after reload
- ⚠️ NOT used by SpaceStore anymore (switched to ID-First)

---

## 📊 FIELD MAPPING

### Supabase → RxDB

```typescript
mapSupabaseToRxDB(supabaseDoc, schema) {
  const mapped = {};

  // ⚠️ CRITICAL: Exclude RxDB service fields
  const serviceFields = ['_meta', '_attachments', '_rev'];

  for (const key in supabaseDoc) {
    if (serviceFields.includes(key)) continue; // Skip service fields

    if (key === 'deleted') {
      mapped._deleted = Boolean(supabaseDoc.deleted);
    } else {
      mapped[key] = supabaseDoc[key];
    }
  }

  // Ensure required fields
  mapped.id = supabaseDoc.id;
  mapped.created_at = supabaseDoc.created_at;
  mapped.updated_at = supabaseDoc.updated_at;

  // ✅ IMPORTANT: Clean up service fields
  delete mapped._meta;
  delete mapped._attachments;
  delete mapped._rev;

  return mapped;
}
```

**Key Points:**
- ✅ `deleted` (Supabase) → `_deleted` (RxDB)
- ✅ Exclude service fields (`_meta`, `_attachments`, `_rev`)
- ✅ Preserve timestamps (`created_at`, `updated_at`)

### RxDB → Supabase

```typescript
mapRxDBToSupabase(rxdbDoc) {
  const mapped = {};

  for (const key in rxdbDoc) {
    if (key === '_deleted') {
      mapped.deleted = rxdbDoc._deleted || false;
    } else if (!key.startsWith('_')) { // Skip RxDB internal fields
      mapped[key] = rxdbDoc[key];
    }
  }

  // Ensure timestamps
  mapped.updated_at = new Date().toISOString();
  if (!mapped.created_at) {
    mapped.created_at = mapped.updated_at;
  }

  return mapped;
}
```

---

## 🚀 INITIALIZATION

### Setup Flow

```typescript
// 1. Create database
const db = await createRxDatabase({ ... });

// 2. Add collections
await db.addCollections({
  breed: { schema: breedSchema },
  animal: { schema: animalSchema }
});

// 3. Setup replication for each entity
await replicationService.setupReplication(db, 'breed', {
  batchSize: 30,           // From view config rows
  pullInterval: 5000,      // 5 seconds
  enableRealtime: true     // WebSocket
});

await replicationService.setupReplication(db, 'animal', {
  batchSize: 30,
  pullInterval: 5000,
  enableRealtime: true
});
```

### Lifecycle

```
App Mount
  ↓
Create RxDB
  ↓
Add Collections
  ↓
Setup Replication (per entity)
  ↓
  ├─ Start Pull Handler (auto, every 5 sec)
  ├─ Start Push Handler (on local changes)
  └─ Start Realtime Subscription (WebSocket)
  ↓
App Running (background sync active)
  ↓
App Unmount
  ↓
Stop All Replications
  ↓
Close Database
```

---

## 🐛 ВІДОМІ ПРОБЛЕМИ

### 1. Service Fields Bug (FIXED ✅)

**Проблема:** RxDB service fields (`_meta`, `_attachments`, `_rev`) передавалися в `bulkUpsert()`, викликаючи validation error 422.

**Рішення:**
```typescript
// Explicit exclusion in mapSupabaseToRxDB
const serviceFields = ['_meta', '_attachments', '_rev'];
for (const key in supabaseDoc) {
  if (serviceFields.includes(key)) continue;
}
delete mapped._meta;
delete mapped._attachments;
delete mapped._rev;
```

### 2. Spam Requests (FIXED ✅)

**Проблема:** RxDB replication викликала pull handler кожну секунду, спамив Supabase.

**Рішення:**
```typescript
// Throttling: не частіше 5 сек
if (timeSinceLastPull < 5000) {
  return { documents: [], checkpoint };
}
```

### 3. Realtime WebSocket Spam (FIXED ✅)

**Проблема:** Supabase WebSocket викликав EVENT спам.

**Рішення:**
```typescript
// Limit in Supabase client config
realtime: {
  params: {
    eventsPerSecond: 2
  }
}
```

### 4. ⚠️ Replication vs ID-First Conflict

**Проблема:** Дві системи працюють паралельно:
- Auto replication (background, continuous)
- ID-First pagination (on-demand, direct fetch)

**Поточний стан:** Працює, але не оптимально.

**Можливі проблеми:**
- Дублювання запитів до Supabase
- Непередбачуване оновлення UI (replication вставляє дані паралельно)
- Складність debugging (два шляхи даних)

**Рішення (потенційне):**
- Вимкнути auto-replication (`live: false`)
- Використовувати тільки manual pull через SpaceStore
- Realtime залишити для live updates

---

## 💡 ЩО МОЖНА ПОКРАЩИТИ

### 🔴 ПРІОРИТЕТ 1: Polling Worker + Staleness Check

**Проблема:**
1. Realtime waste для великих таблиць (95%+ непотрібних events)
2. ID-First не перевіряє staleness (може повертати застарілі дані з кешу)

**Рішення: Polling Worker + Enhanced ID-First**

#### Polling Worker Strategy

**Concept:**
- При відкритті page → запустити worker
- Worker перевіряє `last_modified` на сервері кожні 30-60 сек
- Якщо дата відрізняється → trigger ID-First refresh
- Простіше за Realtime, менше battery drain

```typescript
// polling-worker.ts
export class PollingWorker {
  async startForPage(entityType: string, spaceStore: any) {
    // 1. Check server last_modified
    const serverLastModified = await this.getServerLastModified(entityType);
    const localLastModified = this.getLocalLastModified(entityType);

    // 2. If different → refresh
    if (serverLastModified > localLastModified) {
      console.log(`[Worker] ${entityType} has changes, refreshing...`);
      await spaceStore.applyFilters(entityType, {}, { limit: 30 });
      this.saveLocalLastModified(entityType, serverLastModified);
    }
  }

  private async getServerLastModified(entityType: string): Promise<string> {
    // Lightweight HEAD query
    const { data } = await supabase
      .from(entityType)
      .select('updated_at')
      .order('updated_at', { ascending: false })
      .limit(1);

    return data?.[0]?.updated_at || new Date(0).toISOString();
  }
}
```

#### Enhanced ID-First: Staleness Check

**Concept:**
- Fetch `id + updated_at` замість `id + name`
- Partition: missing / stale / fresh
- Re-fetch тільки missing + stale

```typescript
// 1. Fetch IDs + updated_at (~1.3KB for 30 records, was 1KB)
const idsData = await supabase
  .select('id, updated_at')  // +8 bytes per record
  .limit(30);

// 2. Partition by freshness
for (const { id, updated_at } of idsData) {
  const cached = await rxdb.findOne(id);

  if (!cached) {
    missing.push(id);  // Немає в кеші
  } else if (cached.updated_at !== updated_at) {
    stale.push(id);  // Є, але застарів
  } else {
    fresh.push(id);  // Є і свіжий ✅
  }
}

// 3. Fetch missing + stale (one request)
const toFetch = [...missing, ...stale];
const freshRecords = await supabase.select('*').in('id', toFetch);

// 4. BulkUpsert (updates stale + inserts missing)
await rxdb.bulkUpsert(freshRecords);
```

**Overhead Analysis:**
```
30 records:
- IDs only: ~1KB
- IDs + updated_at: ~1.3KB (+300 bytes)

Overhead: 0.3KB = NEGLIGIBLE! ✅

Benefits: ЗАВЖДИ свіжі дані!
```

**Переваги:**
- ✅ Завжди актуальні дані (staleness check)
- ✅ Мінімальний overhead (+300 bytes)
- ✅ Polling замість Realtime (менше battery drain)
- ✅ Контрольована частота (30-60 сек, не постійно)
- ✅ Працює офлайн → онлайн seamlessly

**Estimated:** 1-1.5 години

---

### 🟡 ПРІОРИТЕТ 2: Move to Web Workers

**Проблема:** Вся реплікація працює в main thread, блокує UI при великих batch inserts.

**Рішення:**
```typescript
// worker.ts
import { createRxDatabase } from 'rxdb';
import { replicationService } from './services/entity-replication.service';

self.addEventListener('message', async (event) => {
  if (event.data.type === 'SETUP_REPLICATION') {
    const db = await createRxDatabase({ ... });
    await replicationService.setupReplication(db, event.data.entityType);
    self.postMessage({ type: 'REPLICATION_READY' });
  }
});
```

**Переваги:**
- ✅ UI не блокується при sync
- ✅ Background sync працює незалежно
- ✅ Кращий performance на великих datasets

**Недоліки:**
- ❌ Складніша архітектура
- ❌ Потрібна синхронізація між main thread і worker
- ❌ RxDB в worker має обмеження

**Estimated:** 1-2 дні

---

### 🟡 ПРІОРИТЕТ 3: Conflict Resolution

**Проблема:** Зараз використовується last-write-wins (default).

**Рішення:**
```typescript
customConflictHandler: async (conflict) => {
  // Custom logic
  if (conflict.local.updated_at > conflict.remote.updated_at) {
    return conflict.local; // Keep local
  }
  return conflict.remote; // Keep remote
}
```

**Use Cases:**
- Offline editing (користувач працює офлайн, потім sync)
- Collaborative editing (багато користувачів редагують одночасно)

**Estimated:** 4-6 годин

---

### 🟢 ПРІОРИТЕТ 4: Background Sync API (PWA Phase 2)

**Проблема:** Немає sync при поверненні online після offline.

**Рішення:**
```typescript
// service-worker.js
self.addEventListener('sync', async (event) => {
  if (event.tag === 'sync-entities') {
    event.waitUntil(syncAllEntities());
  }
});
```

**Переваги:**
- ✅ Auto sync при поверненні online
- ✅ Queued sync requests (не втрачаються при offline)
- ✅ Native PWA feature

**Estimated:** 4-6 годин (PWA Phase 2)

---

### 🟢 ПРІОРИТЕТ 5: Intelligent Scheduling

**Проблема:** Всі entities синхронізуються однаково, без пріоритизації.

**Рішення:**
```typescript
const ENTITY_PRIORITY = {
  breed: 1,      // Dictionaries - high priority
  pet_type: 1,
  animal: 2,     // User data - medium priority
  photo: 3       // Media - low priority
};

// Schedule high priority first
const highPriority = entities.filter(e => ENTITY_PRIORITY[e] === 1);
const mediumPriority = entities.filter(e => ENTITY_PRIORITY[e] === 2);
const lowPriority = entities.filter(e => ENTITY_PRIORITY[e] === 3);

for (const entity of highPriority) {
  await replicationService.setupReplication(db, entity);
}
// ... medium, low
```

**Переваги:**
- ✅ Важливі дані синхронізуються першими
- ✅ Кращий perceived performance
- ✅ Менше навантаження на startup

**Estimated:** 2-3 години

---

## 📋 РЕКОМЕНДАЦІЇ

### Short-term (1-2 тижні):

1. **Disable Auto-Replication** (1-2 години)
   - Вимкнути `live: true` та `autoStart: true`
   - Використовувати тільки ID-First через SpaceStore
   - Залишити Realtime для live updates

2. **Testing** (2-3 години)
   - Тестувати реплікацію офлайн → онлайн
   - Перевірити конфлікти при одночасному редагуванні
   - Навантажувальне тестування (1000+ records)

### Mid-term (1-2 місяці):

3. **Conflict Resolution** (4-6 годин)
   - Custom conflict handler
   - UI для вирішення конфліктів користувачем

4. **Intelligent Scheduling** (2-3 години)
   - Пріоритизація entity types
   - Progressive loading (dictionaries → user data → media)

### Long-term (опціонально):

5. **Web Workers** (1-2 дні)
   - Перенести реплікацію в background thread
   - Тільки якщо performance стане проблемою

6. **Background Sync API** (4-6 годин, PWA Phase 2)
   - Queued sync requests
   - Auto-sync при поверненні online

---

## 🎯 РЕКОМЕНДОВАНА СТРАТЕГІЯ

**Рекомендація:** Polling Worker + Enhanced ID-First (з staleness check)

### Чому?

1. **Realtime waste для великих таблиць**
   - 95%+ непотрібних events (animal table з 500,000 records)
   - Battery drain
   - Bandwidth waste (~5MB/день)

2. **Staleness problem в ID-First**
   - Поточний ID-First повертає cached дані без перевірки
   - Користувач може бачити застарілі дані
   - Потрібен staleness check

3. **Polling Worker простіший і ефективніший**
   - Контрольована частота (30-60 сек)
   - Тільки ~60KB/година (checks)
   - 97% bandwidth savings vs Realtime
   - Менше battery drain

### Proposed Architecture:

```
Page Open
  ↓
Polling Worker (check server last_modified)
  ↓
If changed → trigger refresh
  ↓
Enhanced ID-First (id + updated_at)
  ↓
Partition: missing / stale / fresh
  ↓
Fetch: missing + stale (smart!)
  ↓
BulkUpsert to RxDB
  ↓
UI shows fresh data
  ↓
Worker sleeps 30-60 sec, repeat
```

### Implementation:

```typescript
// 1. Enhanced ID-First with staleness check
const idsData = await supabase
  .select('id, updated_at')  // +300 bytes overhead
  .limit(30);

// 2. Partition by freshness
const { missing, stale, fresh } = await partitionByFreshness(idsData);

// 3. Fetch missing + stale
if (missing.length + stale.length > 0) {
  const freshRecords = await supabase
    .select('*')
    .in('id', [...missing, ...stale]);

  await rxdb.bulkUpsert(freshRecords);
}

// 4. Merge and return (includes just-updated stale records)
return mergeAndSort(cached, fresh, idsData);
```

```typescript
// 5. Polling Worker при page mount
useEffect(() => {
  pollingWorker.startForPage(entityType, spaceStore, 30000); // 30 sec

  return () => {
    pollingWorker.stopPolling(entityType);
  };
}, [entityType]);
```

### Realtime Strategy:

**Dictionaries (small tables):** ✅ Keep Realtime
- `breed` (452 records)
- `pet_type` (10-20 records)
- Мало даних, рідко змінюються

**User Data (large tables):** ❌ Disable Realtime, use Polling
- `animal` (500,000+ records)
- `photo` (millions)
- Велико даних, 95%+ waste events

```typescript
// Config-based Realtime control
const REALTIME_WHITELIST = ['breed', 'pet_type', 'color'];

await replicationService.setupReplication(db, entityType, {
  enableRealtime: REALTIME_WHITELIST.includes(entityType),
  autoStart: false,  // Use ID-First instead
  live: false
});
```

---

## 📚 RELATED DOCS

- `/docs/ID_FIRST_PAGINATION.md` - ID-First architecture
- `/docs/SESSION_RESTART.md` - Current project status
- `/docs/FILTERING_IMPLEMENTATION_PLAN.md` - Filtering system
- `/docs/LOCAL_FIRST_ROADMAP.md` - Overall roadmap

---

## 📊 METRICS

**Before (with auto-replication):**
- ❌ Duplicate requests to Supabase
- ❌ Unpredictable UI updates
- ❌ Hard to debug data flow

**After (ID-First + Realtime only):**
- ✅ Single source of truth (SpaceStore)
- ✅ Predictable behavior
- ✅ Easy debugging
- ✅ 70% traffic savings
- ✅ Live updates still work

**Status:** Recommendation ready, awaiting implementation ⚙️

---
