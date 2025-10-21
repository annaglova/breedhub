# 🔍 Filtering Implementation Plan

## 📅 Останнє оновлення: 2025-10-21

---

## 🎯 ПОТОЧНИЙ СТАТУС

**Pagination Strategy:** ID-First (cursor-based for IDs query) 🚀
**Прогрес:** Documentation complete, ready for implementation

### ✅ Що працює:
- `applyFilters()` - universal method (LookupInput + SpaceView)
- RxDB local filtering з regex
- Supabase remote fetch з filters
- Field config resolution з prefix lookup
- Operator auto-detection (string → ilike, uuid → eq)
- Caching filtered results в RxDB
- `skipCache` parameter для dictionaries

### 🎯 Що треба:
- **ID-First pagination** - fetch IDs, use cache, fetch missing
- Remove `skipCache` (not needed with ID-first)
- Intelligent cache reuse (70% traffic savings)

---

## 🏗️ ID-FIRST АРХІТЕКТУРА

### Принцип

**ID-First = Lightweight IDs query + intelligent cache + fetch missing**

```typescript
// 1. Легкий запит: IDs + sort field (~1KB)
const ids = await supabase
  .select('id, name')
  .match(filters)
  .gt('name', cursor)
  .order('name')
  .limit(30);

// 2. Перевірити RxDB
const cached = await rxdb.find({ id: { $in: ids } });

// 3. Fetch тільки missing
const missing = ids.filter(id => !cached.has(id));
const fresh = await supabase.select('*').in('id', missing);

// 4. Merge + return
return [...cached, ...fresh].sort(by IDs order);
```

### Чому ID-First?

**Проблема з offset/cursor:**
- RxDB має partial cache (50 з 500 records)
- Різні ORDER BY (updated_at, name, created_at)
- `skip(30)` in RxDB ≠ `range(30,59)` in Supabase
- Missing records! ❌

**ID-First рішення:**
- IDs query визначає EXACT records потрібні
- Cache reuse для known records
- Fetch тільки missing
- Works з ANY ORDER BY ✅

### Економія

```
Scenario: 15 batches × 30 records = 450 total

Current (skipCache):
  15 × 30KB = 450KB

ID-First (progressive cache):
  Batch 1:  31KB (0% cache)
  Batch 2:  16KB (50% cache)
  Batch 3:  9KB (73% cache)
  Batch 15: 2KB (97% cache)
  ────────────────────
  Total: ~150KB (70% savings!)
```

---

## 📋 Implementation Tasks

### Phase 1: SpaceStore.applyFilters
```typescript
async applyFilters(
  entityType: string,
  filters: Record<string, any>,
  options: {
    limit: 30,
    cursor?: string | null,
    orderBy: { field: string, direction: 'asc' | 'desc' }
  }
) {
  // 1. Fetch IDs
  const idsData = await supabase
    .select(`id, ${orderBy.field}`)
    .match(filters)
    .gt(orderBy.field, cursor)
    .order(orderBy.field)
    .limit(limit);

  // 2. Check cache
  const ids = idsData.map(d => d.id);
  const cached = await rxdb.find({ id: { $in: ids } });

  // 3. Fetch missing
  const missingIds = ids.filter(id => !cached.has(id));
  const fresh = await supabase.select('*').in('id', missingIds);

  // 4. Merge
  await rxdb.bulkUpsert(fresh);
  return mergeAndSort(cached, fresh, ids);
}
```

### Phase 2: LookupInput
- Remove `skipCache` usage
- Remove manual deduplication (not needed)
- Trust SpaceStore to return correct data

### Phase 3: Testing
- [ ] Clean cache → verify all 452 breeds load
- [ ] Warm cache → verify traffic reduction
- [ ] Different ORDER BY → verify flexibility
- [ ] Offline → verify fallback works

---

## 🎨 Use Cases

### LookupInput (Dictionaries)
```typescript
<LookupInput
  referencedTable="breed"
  dataSource="collection"
/>

// Uses ID-first with ORDER BY name
// Always loads all 452 breeds correctly
```

### SpaceView (User Data with Filters)
```typescript
applyFilters('animal', {
  space_id: currentSpaceId,
  pet_type_id: selectedType
}, {
  orderBy: { field: 'name', direction: 'asc' }
})

// ID-first works with any ORDER BY
// Cache reused across different filters
```

### Dynamic Sorting
```typescript
// User changes sort: name → updated_at
applyFilters('breed', filters, {
  orderBy: { field: 'updated_at', direction: 'desc' }
})

// ID-first handles it! Cache is still useful! ✅
```

---

## 🔄 Offline Fallback

```typescript
try {
  // ID-first with network
  const idsData = await supabase.select('id, name')...
} catch (error) {
  // Fallback to RxDB cache
  const cached = await rxdb
    .find({ selector: filters })
    .sort(orderBy.field)
    .limit(30)
    .exec();

  return {
    records: cached,
    hasMore: false,
    offline: true  // UI flag
  };
}
```

---

## 📚 Related Docs

- `/docs/ID_FIRST_PAGINATION.md` - Detailed architecture
- `/docs/SESSION_RESTART.md` - Current project status
- `/docs/DICTIONARY_LOADING_STRATEGY.md` - Dictionary patterns

---

## ✅ Success Criteria

**Before (offset/skipCache):**
- ❌ 422/452 records (missing 30)
- ❌ Reload breaks pagination
- ❌ 450KB traffic
- ❌ Different ORDER BY causes issues

**After (ID-first):**
- ✅ 452/452 records always
- ✅ Reload works perfectly
- ✅ ~150KB traffic (70% reduction)
- ✅ Works with any ORDER BY
