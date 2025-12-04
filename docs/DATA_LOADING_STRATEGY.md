# Data Loading Strategy & Replication Architecture

**Created:** 2025-12-04
**Status:** Planning / Analysis

---

## Overview

Цей документ описує поточний стан та плани щодо завантаження даних в BreedHub.
Зводить до купи всю інформацію про ID-First pagination, реплікацію, та оптимізації.

---

## Current State

### What Works

1. **ID-First Pagination** - основний механізм завантаження даних
   - Fetch IDs з Supabase → Check RxDB cache → Fetch missing → Merge
   - 70% зменшення трафіку (cache hit rate росте з часом)
   - Працює з будь-яким ORDER BY і фільтрами

2. **RxDB як Smart Cache**
   - НЕ повна реплікація (було б 9M+ records)
   - Зберігає тільки те, що користувач бачив (~200-500 records)
   - Offline fallback при втраті мережі

3. **Realtime Subscriptions** (для маленьких таблиць)
   - WebSocket для live updates
   - Працює для dictionaries (breed, pet_type, color)

### Problems / Suboptimal Behavior

1. **При refresh сторінки - скелетони видно навіть коли дані є в RxDB**
   - `applyFilters` ЗАВЖДИ йде на Supabase для IDs
   - Не використовує локальні дані first
   - Затримка ~300-500ms на network request

2. **Page fullscreen refresh - теж скелетони**
   - `fetchAndSelectEntity` перевіряє EntityStore.entities (memory)
   - Але при refresh memory пуста, йде на Supabase
   - Не перевіряє RxDB напряму

3. **Realtime waste для великих таблиць**
   - animal table: 500,000+ records
   - WebSocket шле ВСІ events (95%+ непотрібні)
   - Battery drain, bandwidth waste

4. **Немає staleness check**
   - ID-First повертає cached дані без перевірки updated_at
   - Користувач може бачити застарілі дані

5. **Background sync відключений**
   - Прибрали auto-replication (`live: false`)
   - Немає механізму фонового оновлення даних

---

## Architecture Analysis

### Data Flow (Current)

```
┌─────────────────────────────────────────────────────────────┐
│                      User Action                             │
│        (Page load, scroll, filter change)                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    SpaceStore.applyFilters()                 │
│                                                              │
│  1. Fetch IDs from Supabase (ALWAYS network!)               │
│  2. Check RxDB cache for full records                        │
│  3. Fetch missing records from Supabase                      │
│  4. Merge and return                                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      EntityStore                             │
│              (Memory, signals for UI)                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        React UI                              │
└─────────────────────────────────────────────────────────────┘
```

### Problem: No Cache-First Option

При refresh сторінки:
1. EntityStore (memory) пустий
2. RxDB має дані (IndexedDB)
3. Але ми йдемо на Supabase за IDs
4. Поки чекаємо - показуємо скелетони

---

## Proposed Solutions

### Option A: Cache-First для Space (Optimistic UI)

**Ідея:** Спочатку показати дані з RxDB, потім оновити якщо є зміни.

```typescript
async applyFilters(entityType, filters, options) {
  // 1. INSTANT: Show cached data first (if exists)
  const cachedRecords = await this.getFromRxDB(entityType, filters);
  if (cachedRecords.length > 0) {
    entityStore.setAll(cachedRecords);
    // UI shows data immediately!
  }

  // 2. BACKGROUND: Fetch fresh IDs from Supabase
  const idsData = await this.fetchIDsFromSupabase(...);

  // 3. Check staleness (compare updated_at)
  const { stale, fresh, missing } = await this.partitionByFreshness(idsData);

  // 4. Fetch only stale + missing
  if (stale.length + missing.length > 0) {
    const freshRecords = await this.fetchRecordsByIDs([...stale, ...missing]);
    await rxdb.bulkUpsert(freshRecords);
  }

  // 5. Update UI with fresh data (merge)
  const finalRecords = await this.mergeAndSort(...);
  entityStore.setAll(finalRecords);
}
```

**Pros:**
- Instant UI on refresh
- Still gets fresh data in background
- Progressive enhancement

**Cons:**
- Complexity (two-phase loading)
- Potential UI "jump" when data updates
- Need staleness check implementation

**Estimated:** 4-6 hours

---

### Option B: Cache-First для Page (Single Entity)

**Ідея:** При pretty URL (`/affenpinscher`) спочатку шукати в RxDB.

```typescript
async fetchAndSelectEntity(entityType: string, id: string) {
  const entityStore = await this.getEntityStore(entityType);

  // 1. Check EntityStore memory first
  if (entityStore.entities.value.has(id)) {
    entityStore.selectEntity(id);
    return true;
  }

  // 2. NEW: Check RxDB cache second
  const collection = this.db?.collections[entityType];
  if (collection) {
    const doc = await collection.findOne(id).exec();
    if (doc) {
      const data = doc.toJSON();
      entityStore.upsertOne(data);
      entityStore.selectEntity(id);

      // Optional: background refresh for staleness
      this.backgroundRefresh(entityType, id, data.updated_at);
      return true;
    }
  }

  // 3. Fallback: Fetch from Supabase
  const { data } = await supabase.from(entityType).select('*').eq('id', id).single();
  // ...
}
```

**Pros:**
- Simple change
- Instant page load when cached
- No UI complexity

**Cons:**
- May show stale data (need background refresh)
- Only fixes single entity, not lists

**Estimated:** 1-2 hours

---

### Option C: Polling Worker + Staleness Check (Full Solution)

**Ідея:** Замінити Realtime на Polling для великих таблиць.

```
Page Open
  ↓
Show cached data (instant)
  ↓
Polling Worker starts (every 30-60 sec)
  ↓
Check server last_modified
  ↓
If changed → trigger ID-First refresh with staleness check
  ↓
Enhanced ID-First (id + updated_at)
  ↓
Partition: missing / stale / fresh
  ↓
Fetch: missing + stale only
  ↓
BulkUpsert to RxDB
  ↓
UI shows fresh data
```

**Implementation:**

```typescript
// Enhanced ID-First with staleness check
async applyFiltersWithStaleness(entityType, filters, options) {
  // 1. Fetch IDs + updated_at (~1.3KB for 30 records)
  const idsData = await supabase
    .from(entityType)
    .select('id, updated_at')  // +300 bytes for staleness
    .match(filters)
    .limit(30);

  // 2. Partition by freshness
  const missing: string[] = [];
  const stale: string[] = [];
  const fresh: any[] = [];

  for (const { id, updated_at } of idsData) {
    const cached = await rxdb.findOne(id).exec();

    if (!cached) {
      missing.push(id);
    } else if (cached.updated_at !== updated_at) {
      stale.push(id);  // Has newer version on server
    } else {
      fresh.push(cached.toJSON());
    }
  }

  // 3. Fetch missing + stale
  const toFetch = [...missing, ...stale];
  if (toFetch.length > 0) {
    const freshRecords = await supabase
      .select('*')
      .in('id', toFetch);

    await rxdb.bulkUpsert(freshRecords);
  }

  // 4. Merge and return
  return mergeAndSort(fresh, freshRecords, idsData);
}
```

```typescript
// Polling Worker
class PollingWorker {
  private intervals = new Map<string, NodeJS.Timeout>();

  startForPage(entityType: string, callback: () => void, intervalMs = 30000) {
    if (this.intervals.has(entityType)) return;

    const interval = setInterval(async () => {
      const serverLastModified = await this.getServerLastModified(entityType);
      const localLastModified = this.getLocalLastModified(entityType);

      if (serverLastModified > localLastModified) {
        console.log(`[PollingWorker] ${entityType} has changes`);
        callback();
        this.saveLocalLastModified(entityType, serverLastModified);
      }
    }, intervalMs);

    this.intervals.set(entityType, interval);
  }

  stopPolling(entityType: string) {
    const interval = this.intervals.get(entityType);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(entityType);
    }
  }

  private async getServerLastModified(entityType: string): Promise<string> {
    const { data } = await supabase
      .from(entityType)
      .select('updated_at')
      .order('updated_at', { ascending: false })
      .limit(1);

    return data?.[0]?.updated_at || new Date(0).toISOString();
  }
}
```

**Pros:**
- Always fresh data
- Less battery drain than Realtime
- Controlled frequency
- Works offline → online seamlessly

**Cons:**
- Most complex solution
- 30-60 sec delay for updates (not instant)
- Need careful implementation

**Estimated:** 6-8 hours

---

### Option D: Hybrid Approach (Recommended)

Комбінація простих рішень:

1. **Option B** - Cache-first для single entity (1-2 hours)
2. **Staleness check** в ID-First для lists (2-3 hours)
3. **Disable Realtime** для великих таблиць (1 hour)
4. **Manual refresh button** для user-triggered updates (1 hour)

**Total: 5-7 hours**

---

## Realtime Strategy

### Current Realtime Issues

- Підписка на ВСЮ таблицю
- 95%+ waste events для великих таблиць
- Battery drain, bandwidth waste

### Proposed Realtime Strategy

**Dictionaries (small tables):** Keep Realtime
- `breed` (452 records)
- `pet_type` (10-20 records)
- `color`, `size`, etc.

**User Data (large tables):** Disable Realtime
- `animal` (500,000+ records)
- `photo` (millions)
- Use Polling Worker instead

```typescript
const REALTIME_WHITELIST = ['breed', 'pet_type', 'color', 'size', 'achievement'];

await replicationService.setupReplication(db, entityType, {
  enableRealtime: REALTIME_WHITELIST.includes(entityType),
  autoStart: false,
  live: false
});
```

---

## Background Sync Strategy

### Current State

- Auto-replication disabled (`live: false`, `autoStart: false`)
- No background refresh mechanism
- Data can become stale

### Proposed Background Sync

1. **On Page Mount:**
   - Show cached data immediately
   - Start Polling Worker (30-60 sec interval)
   - First poll triggers immediate refresh

2. **On Scroll (loadMore):**
   - ID-First with staleness check
   - Fetch missing + stale records

3. **On Page Unmount:**
   - Stop Polling Worker
   - Keep cached data in RxDB

4. **On App Resume (visibility change):**
   - Trigger immediate refresh
   - Restart Polling Worker

```typescript
// In SpaceComponent or SpacePage
useEffect(() => {
  // Initial load with cache-first
  loadWithCacheFirst();

  // Start polling for this entity type
  pollingWorker.startForPage(entityType, () => {
    refreshData();
  }, 30000);

  // Handle visibility change
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      refreshData();
    }
  };
  document.addEventListener('visibilitychange', handleVisibilityChange);

  return () => {
    pollingWorker.stopPolling(entityType);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
}, [entityType]);
```

---

## Implementation Priority

### Phase 1: Quick Wins (1-2 days)

1. [ ] **Cache-first для single entity** (Option B)
   - Fix `fetchAndSelectEntity` to check RxDB first
   - Removes page fullscreen skeletons on refresh

2. [ ] **Disable Realtime для великих таблиць**
   - Add REALTIME_WHITELIST
   - Only dictionaries get Realtime

### Phase 2: Enhanced ID-First (2-3 days)

3. [ ] **Staleness check в applyFilters**
   - Fetch `id, updated_at` instead of just `id`
   - Partition by freshness
   - Fetch missing + stale

4. [ ] **Cache-first для Space lists**
   - Show RxDB data immediately
   - Refresh in background

### Phase 3: Background Sync (2-3 days)

5. [ ] **Polling Worker**
   - Check server last_modified
   - Trigger refresh when changed

6. [ ] **Visibility change handler**
   - Refresh on app resume
   - Handle tab focus

### Phase 4: Polish (1-2 days)

7. [ ] **Manual refresh button**
   - User-triggered full refresh
   - Pull-to-refresh on mobile

8. [ ] **Loading indicators**
   - Show "updating..." instead of full skeleton
   - Subtle refresh indicator

---

## Success Criteria

### Before (Current):
- Page refresh: ~500ms skeletons (network wait)
- Fullscreen page refresh: skeletons even with cached data
- Stale data possible (no staleness check)
- Realtime waste for large tables

### After (Target):
- Page refresh: < 50ms (cache-first)
- Fullscreen page: instant from RxDB
- Always fresh data (staleness check)
- Controlled background updates (polling)
- Subtle "updating" indicator instead of skeletons

---

## Related Documents

- `/docs/ID_FIRST_PAGINATION.md` - ID-First architecture details
- `/docs/REPLICATION_ARCHITECTURE.md` - Replication system details
- `/docs/SPACE_STORE_ARCHITECTURE.md` - SpaceStore overview
- `/docs/LOCAL_FIRST_ROADMAP.md` - Overall roadmap
- `/docs/done/TODO_LOADING_UI.md` - Completed loading UI work

---

## Notes

- Це planning document, не треба все реалізовувати одразу
- Можна починати з Phase 1 (quick wins)
- Кожна фаза незалежна, можна робити поступово
- Пріоритет: UX > Performance > Completeness
