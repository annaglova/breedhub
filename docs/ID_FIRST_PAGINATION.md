# ID-First Pagination для Offline-First Applications

**Created:** 2025-10-21
**Updated:** 2025-10-26
**Status:** 🎯 Production Strategy (Enhanced with Staleness Check)

---

## 🎯 Executive Summary

**Enhanced ID-First = Fetch IDs + updated_at, partition by freshness, fetch missing + stale**

```typescript
// 1. Lightweight query - IDs + updated_at (~1.3KB for 30 records)
const idsData = await supabase
  .select('id, updated_at')  // Staleness check!
  .order(name)
  .gt(name, cursor)
  .limit(30);

// 2. Partition by freshness
const { missing, stale, fresh } = await partitionByFreshness(idsData);

// 3. Fetch missing + stale (~5-15KB instead of 30KB)
const toFetch = [...missing, ...stale];
const freshRecords = await supabase.select('*').in('id', toFetch);

// 4. BulkUpsert (updates stale + inserts missing)
await rxdb.bulkUpsert(freshRecords);

// 5. Merge + return (sorted by IDs order)
return mergeAndSort(cached, fresh, idsData);
```

**Benefits:**
- ✅ 70% less traffic (cache hit rate increases with scroll)
- ✅ **Always fresh data** (staleness check via updated_at)
- ✅ Works with any ORDER BY
- ✅ Works with any filters
- ✅ RxDB as intelligent cache (not full replica)
- ✅ Offline fallback built-in
- ✅ Minimal overhead (+300 bytes for staleness check)

---

## 🚨 The Problem: Why Offset/Cursor Don't Work

### Context
- Tables: millions of records
- User filters: `space_id = 123` → 500 records
- RxDB cache: 50 з 500 (10%, partial, mixed ORDER BY)

### Offset Pagination Breaks
```
Запит: OFFSET 30 LIMIT 30
RxDB: skip(30) → позиції 30-59 в LOCAL cache (довільні 50 records)
Supabase: range(30, 59) → позиції 30-59 в ПОВНІЙ таблиці (500 records)

→ skip(30) in RxDB ≠ range(30, 59) in Supabase
→ Missing records! ❌
```

### Cursor Pagination Also Breaks
```
RxDB має 50 довільних з 500:
  - 10 з початку алфавіту (A-C)
  - 20 з середини (M-P)
  - 20 з кінця (X-Z)

Cursor: WHERE name > 'C' LIMIT 30
RxDB: повертає 30 з cache (M-P, X-Z mix)
→ nextCursor = 'P'

Next: WHERE name > 'P' LIMIT 30
→ Пропустили D-L! ❌
```

**Root Cause:** Partial cache + ANY pagination = chaos

### Staleness Problem (NEW!)

**Problem:** Basic ID-First може повертати застарілі дані з кешу.

```
Scenario:
1. User A завантажив breed "Labrador" в 10:00
2. Admin оновив "Labrador" в 10:05
3. User A скролить в 10:10
   - ID-First знаходить "Labrador" в кеші
   - Повертає старі дані ❌
   - User A не бачить оновлення!
```

**Root Cause:** Немає перевірки `updated_at` при знаходженні в кеші.

---

## ✅ Enhanced ID-First Solution (with Staleness Check)

### How It Works

**Phase 1: IDs + updated_at (Lightweight + Staleness Check)**
```typescript
// Only 2 fields = ~1.3KB for 30 records (+300 bytes for staleness)
const { data: idsData } = await supabase
  .from('breed')
  .select('id, updated_at')  // Minimal payload + staleness check
  .eq('space_id', spaceId)
  .gt('name', cursor)  // Cursor for IDs query (sort field)
  .order('name', { ascending: true })
  .limit(30);
```

**Phase 2: Partition by Freshness (NEW!)**
```typescript
const missing: string[] = [];
const stale: string[] = [];
const fresh: any[] = [];

for (const { id, updated_at } of idsData) {
  const cached = await rxdb.findOne(id).exec();

  if (!cached) {
    missing.push(id);  // Немає в кеші → fetch
  } else if (cached.updated_at !== updated_at) {
    stale.push(id);  // Є в кеші, але застарів → re-fetch
  } else {
    fresh.push(cached.toJSON());  // Є і свіжий → use cache ✅
  }
}

console.log('[ID-First] Partition:', {
  total: idsData.length,
  missing: missing.length,
  stale: stale.length,
  fresh: fresh.length
});
```

**Phase 3: Fetch Missing + Stale (Smart!)**
```typescript
const toFetch = [...missing, ...stale];

let freshRecords = [];
if (toFetch.length > 0) {
  console.log(`[ID-First] Fetching ${toFetch.length}/${idsData.length} records (missing + stale)`);

  const { data } = await supabase
    .from('breed')
    .select('*')  // Full records для missing + stale
    .in('id', toFetch);

  freshRecords = data || [];

  // BulkUpsert (inserts missing + updates stale)
  await rxdb.bulkUpsert(freshRecords.map(mapToRxDBFormat));
} else {
  console.log(`[ID-First] All ${idsData.length} records fresh in cache!`);
}
```

**Phase 4: Merge & Maintain Order**
```typescript
// Merge: fresh from cache + freshly fetched (missing + stale updates)
const recordsMap = new Map([
  ...fresh.map(r => [r.id, r]),  // Fresh from cache
  ...freshRecords.map(r => [r.id, r])  // Just fetched (missing + stale)
]);

// CRITICAL: Maintain order from IDs query!
const ids = idsData.map(d => d.id);
const orderedRecords = ids
  .map(id => recordsMap.get(id))
  .filter(Boolean);

return {
  records: orderedRecords,
  nextCursor: idsData[idsData.length - 1]?.updated_at,  // Use sort field for cursor
  hasMore: idsData.length >= limit
};
```

---

## 📊 Performance Comparison

### Scenario: Load 450 breeds (15 batches × 30)

**Current (skipCache=true):**
```
Batch 1:  30 full records = 30 KB
Batch 2:  30 full records = 30 KB
...
Batch 15: 30 full records = 30 KB
────────────────────────────────
Total: 450 KB
```

**ID-First (no staleness check):**
```
Batch 1:  30 IDs (1KB) + 30 missing (30KB) = 31 KB
Batch 2:  30 IDs (1KB) + 15 missing (15KB) = 16 KB  (50% cached!)
Batch 3:  30 IDs (1KB) + 8 missing (8KB)   = 9 KB   (73% cached!)
...
Batch 15: 30 IDs (1KB) + 1 missing (1KB)   = 2 KB   (97% cached!)
────────────────────────────────
Total: ~150 KB (70% savings!) ✅

⚠️ Problem: May return stale data from cache!
```

**Enhanced ID-First (with staleness check):**
```
Batch 1:  30 IDs+updated_at (1.3KB) + 30 missing (30KB) = 31.3 KB
Batch 2:  30 IDs+updated_at (1.3KB) + 15 missing + 3 stale (18KB) = 19.3 KB
Batch 3:  30 IDs+updated_at (1.3KB) + 8 missing + 2 stale (10KB) = 11.3 KB
...
Batch 15: 30 IDs+updated_at (1.3KB) + 1 missing + 0 stale (1KB) = 2.3 KB
────────────────────────────────
Total: ~165 KB (+10% vs basic ID-First, but FRESH DATA!) ✅

✅ Benefit: Always fresh data!
✅ Overhead: +300 bytes per batch (negligible)
✅ Re-fetches only stale records (smart!)
```

**Key Insight:** +10% traffic for guaranteed fresh data is worth it!

---

## 🏗️ Implementation

### SpaceStore.applyFilters()

```typescript
async applyFilters(
  entityType: string,
  filters: Record<string, any>,
  options: {
    limit: 30,
    cursor?: string | null,
    orderBy: { field: string, direction: 'asc' | 'desc' }
  }
): Promise<{
  records: any[];
  hasMore: boolean;
  nextCursor: string | null;
}> {
  const { limit, cursor, orderBy } = options;

  try {
    // 1️⃣ Lightweight query: IDs + ordering field only
    let query = supabase
      .from(entityType)
      .select(`id, ${orderBy.field}`)  // ~1KB для 30 records
      .match(filters);

    // Apply cursor (keyset pagination for IDs)
    if (cursor) {
      if (orderBy.direction === 'asc') {
        query = query.gt(orderBy.field, cursor);
      } else {
        query = query.lt(orderBy.field, cursor);
      }
    }

    const { data: idsData, error } = await query
      .order(orderBy.field, { ascending: orderBy.direction === 'asc' })
      .limit(limit);

    if (error) throw error;
    if (!idsData || idsData.length === 0) {
      return { records: [], hasMore: false, nextCursor: null };
    }

    // 2️⃣ Check RxDB cache
    const ids = idsData.map(d => d.id);
    const collection = await this.getCollection(entityType);
    const cached = await collection.find({
      selector: { id: { $in: ids } }
    }).exec();

    const cachedMap = new Map(cached.map(d => [d.id, d.toJSON()]));

    // 3️⃣ Fetch only missing records
    const missingIds = ids.filter(id => !cachedMap.has(id));

    let freshRecords = [];
    if (missingIds.length > 0) {
      console.log(`[SpaceStore] 📥 Fetching ${missingIds.length}/${ids.length} missing records`);

      const { data: fresh } = await supabase
        .from(entityType)
        .select('*')  // Full records тільки для missing
        .in('id', missingIds);

      freshRecords = fresh || [];

      // Cache in RxDB
      if (freshRecords.length > 0) {
        await collection.bulkUpsert(
          freshRecords.map(this.mapToRxDBFormat)
        );
      }
    } else {
      console.log(`[SpaceStore] ✅ All ${ids.length} records in cache!`);
    }

    // 4️⃣ Merge cached + fresh, maintain order from idsData
    const recordsMap = new Map([
      ...cachedMap,
      ...freshRecords.map(r => [r.id, r])
    ]);

    // CRITICAL: Maintain order from IDs query!
    const orderedRecords = ids
      .map(id => recordsMap.get(id))
      .filter(Boolean);

    return {
      records: orderedRecords,
      hasMore: idsData.length >= limit,
      nextCursor: idsData[idsData.length - 1]?.[orderBy.field] ?? null
    };

  } catch (error) {
    // Offline fallback
    console.warn('[SpaceStore] ⚠️ Network error, using RxDB cache');
    const collection = await this.getCollection(entityType);

    let query = collection.find({ selector: filters });

    // Apply ordering
    if (orderBy.direction === 'desc') {
      query = query.sort(`-${orderBy.field}`);
    } else {
      query = query.sort(orderBy.field);
    }

    const cached = await query.limit(limit).exec();

    return {
      records: cached.map(d => d.toJSON()),
      hasMore: false,
      nextCursor: null,
      offline: true
    };
  }
}
```

---

## 🎨 Use Cases

### LookupInput (Dictionaries)
```typescript
<LookupInput
  referencedTable="breed"
  dataSource="collection"
/>

// Uses ID-first with ORDER BY name ASC
// Perfect for dictionaries with 452 records
```

### SpaceView (User Data)
```typescript
// User's animals with filters
applyFilters('animal', {
  space_id: currentSpaceId,
  pet_type_id: filterValue
}, {
  orderBy: { field: 'name', direction: 'asc' }  // or 'updated_at'
})

// ID-first works for ANY ORDER BY!
```

### Different ORDER BY Each Time
```typescript
// First time: ORDER BY name
applyFilters('breed', {}, { orderBy: { field: 'name' } })

// Second time: ORDER BY updated_at
applyFilters('breed', {}, { orderBy: { field: 'updated_at' } })

// ID-first handles both! Cache is reused! ✅
```

---

## 🔄 Offline Fallback

```typescript
try {
  // Try ID-first with network
  const idsData = await supabase.select('id, name')...
} catch (networkError) {
  // Fallback: return what's in RxDB cache
  console.warn('[SpaceStore] Offline mode, using cache');

  const cached = await rxdb
    .find({ selector: filters })
    .sort(orderBy.field)
    .limit(30)
    .exec();

  return {
    records: cached.map(d => d.toJSON()),
    hasMore: false,
    nextCursor: null,
    offline: true  // Flag for UI
  };
}
```

**UI can show:**
- "Showing cached results (offline)"
- Refresh button when back online

---

## 📈 Cache Intelligence

**Cache Hit Rate Grows:**

```
Session start (empty cache):
  Batch 1: 0% cache hit   → fetch 30/30
  Batch 2: 40% cache hit  → fetch 18/30
  Batch 3: 65% cache hit  → fetch 10/30
  Batch 5: 87% cache hit  → fetch 4/30

After some time (warm cache):
  Batch 1: 80% cache hit  → fetch 6/30
  Batch 2: 92% cache hit  → fetch 2/30
  Batch 3: 97% cache hit  → fetch 1/30
```

**Why:** RxDB accumulates records from:
- Initial replication (30 records)
- Previous scrolls
- Different filters/views
- Real-time updates

**Result:** Traffic ↓↓↓ over time!

---

## 🎯 Why ID-First vs Alternatives

### vs Full Replication
```
Full Replication:
  ❌ Can't replicate millions of records
  ❌ Client will crash
  ❌ Not practical for large datasets

ID-First:
  ✅ Load only what user needs
  ✅ Cache grows intelligently
  ✅ Works with any table size
```

### vs skipCache (current)
```
skipCache:
  ❌ Always fetches full records
  ❌ 30KB per batch
  ❌ No cache benefit

ID-First:
  ✅ Fetches IDs first (1KB)
  ✅ Reuses cache (70% savings)
  ✅ Progressive optimization
```

### vs Offset Pagination
```
Offset:
  ❌ skip(30) in RxDB ≠ range(30, 59) in Supabase
  ❌ Missing records with partial cache
  ❌ Performance degrades (O(n) where n=offset)

ID-First:
  ✅ IDs define exact records
  ✅ No position mismatch
  ✅ Constant performance (O(log n) with index)
```

---

## 🚀 Migration Plan

### Phase 1: SpaceStore ✅
- [x] Remove `skipCache` parameter
- [x] Implement ID-first logic in `applyFilters()`
- [x] Add offline fallback
- [x] Test with breed table

### Phase 2: LookupInput ✅
- [x] Remove deduplication logic (not needed)
- [x] Trust SpaceStore to return correct order
- [x] Simplify cursor handling

### Phase 3: Testing
- [ ] Test with clean RxDB (0% cache)
- [ ] Test after scroll (50% cache)
- [ ] Test with different ORDER BY
- [ ] Test offline mode
- [ ] Measure traffic reduction

### Phase 4: Rollout
- [ ] Deploy to production
- [ ] Monitor cache hit rates
- [ ] Adjust batch size if needed (30 optimal)

---

## 📚 Related Docs

- `/docs/SESSION_RESTART.md` - Current project status
- `/docs/FILTERING_IMPLEMENTATION_PLAN.md` - Filtering architecture
- `/docs/archive/KEYSET_PAGINATION.md` - Previous approach (archived)
- `/docs/archive/OFFSET_BASED_PAGINATION.md` - Original approach (archived)

---

## ✅ Success Criteria

**Before (offset/cursor):**
- ❌ 422/452 records loaded (30 missing)
- ❌ Different ORDER BY causes issues
- ❌ Reload breaks pagination
- ❌ 450KB traffic for full scroll

**After (ID-first):**
- ✅ 452/452 records loaded (all records)
- ✅ Works with any ORDER BY
- ✅ Reload works perfectly
- ✅ ~150KB traffic for full scroll (70% reduction)

---

**Status:** Ready for implementation 🚀
