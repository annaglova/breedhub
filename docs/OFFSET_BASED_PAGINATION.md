# Offset-Based Pagination for Main Entities

**Created:** 2025-10-21
**Status:** Active Implementation 🔨

---

## 🎯 ФІЛОСОФІЯ: Універсальний механізм для scroll + filters

**Offset-based = Просто, надійно, universal**

### Ключовий принцип:
```
Один механізм для ВСІХ випадків:
- Scroll БЕЗ фільтрів
- Scroll З фільтрами
- LookupInput search
- SpaceView pagination
```

---

## 🔥 Чому НЕ checkpoint-based replication для UI scroll?

### Проблема: Replication НЕ сумісна з фільтрами

**Checkpoint corruption:**
```typescript
// Initial: фільтр "golden"
Pull 1: знайшов "Golden Retriever" (updated_at: 2025-01-01)
Checkpoint = 2025-01-01

// User змінює фільтр на "lab"
Pull 2: .gt('updated_at', '2025-01-01').ilike('name', '%lab%')

Result: ПРОПУСТИТЬ всі Labradors створені ДО 2025-01-01! ❌
```

**Checkpoint = "останній FILTERED запис", а не "останній запис взагалі"**

### Gaps в даних:
- Checkpoint тепер означає different entity для різних фільтрів
- При зміні фільтрів - пропускаємо records
- Це вже НЕ incremental sync!

### Складність:
- Окрема логіка для scroll з фільтрами vs без фільтрів
- Checkpoint management для filtered queries
- Додаткова складність без переваг

---

## ✅ Рішення: Offset-based (як DictionaryStore)

### Переваги:

**1. Універсальність**
```typescript
// Один і той самий код для ВСЬОГО
applyFilters(entityType, filters, { limit, offset })
  → works for all cases! ✅
```

**2. Простота**
```typescript
// No checkpoint management
// No state corruption
// Just offset++
offset: 0 → 30 → 60 → 90...
```

**3. Сумісність з фільтрами**
```typescript
// Initial
applyFilters(breed, { name: 'golden' }, { offset: 0 })

// Scroll
applyFilters(breed, { name: 'golden' }, { offset: 30 })

// Change filter - offset resets!
applyFilters(breed, { name: 'lab' }, { offset: 0 })
```

**4. Кешування працює**
```typescript
// User scrolls БЕЗ фільтрів
offset 0: cache 30 breeds
offset 30: cache +30 breeds
Total: 60 breeds cached ✅

// User фільтрує "golden"
offset 0: cache 20 golden breeds
Total: 80 breeds cached (60 + 20, deduplicated) ✅

// Offline - працює з кешем!
```

---

## 🏗️ Архітектура

### applyFilters() - Universal Method

```typescript
async applyFilters(
  entityType: string,
  filters: Record<string, any>,  // {} or { name: 'golden' }
  options?: {
    limit?: number;    // default: 30
    offset?: number;   // default: 0
    fieldConfigs?: Record<string, FilterFieldConfig>;
  }
): Promise<{
  records: any[];
  total: number;
  hasMore: boolean;
}>
```

### Flow

```
1. Parse options (limit=30, offset=0)
   ↓
2. Try RxDB local cache FIRST
   - filterLocalEntities(entityType, filters, limit, offset)
   - Uses .skip(offset).limit(limit)
   ↓
3. Check if need remote fetch
   - localResults.length < limit → not enough
   - offset > 0 → scroll pagination
   ↓
4. Fetch from Supabase (if needed)
   - fetchFilteredFromSupabase(entityType, filters, limit, offset)
   - Uses .range(offset, offset + limit - 1)
   - CACHE results → collection.bulkUpsert(data)
   ↓
5. Get server total count
   - getFilteredCount(entityType, filters)
   - Supabase count query з filters
   ↓
6. Calculate hasMore
   - hasMore = offset + limit < serverTotal
   ↓
7. Return { records, total, hasMore }
```

---

## 📐 Detailed Implementation

### 1. filterLocalEntities (RxDB Query)

```typescript
private async filterLocalEntities(
  entityType: string,
  filters: Record<string, any>,
  limit: number,
  offset: number
): Promise<any[]> {

  const collection = this.getCollection(entityType);
  let query = collection.find();

  // Apply each filter
  for (const [fieldKey, value] of Object.entries(filters)) {
    if (!value) continue;

    const fieldConfig = this.getFieldConfig(entityType, fieldKey);
    const fieldType = fieldConfig.fieldType || 'string';
    const operator = this.detectOperator(fieldType, fieldConfig.operator);

    // Apply RxDB filter
    query = this.applyRxDBFilter(query, fieldKey, operator, value);
  }

  // ✅ Pagination with offset
  const docs = await query
    .skip(offset)   // ← KEY!
    .limit(limit)
    .exec();

  return docs.map(doc => doc.toJSON());
}
```

### 2. fetchFilteredFromSupabase (Remote Fetch)

```typescript
private async fetchFilteredFromSupabase(
  entityType: string,
  filters: Record<string, any>,
  limit: number,
  offset: number
): Promise<any[]> {

  const { supabase } = await import('../supabase/client');
  let query = supabase.from(entityType).select('*');

  // Apply filters
  for (const [fieldKey, value] of Object.entries(filters)) {
    if (!value) continue;

    const fieldConfig = this.getFieldConfig(entityType, fieldKey);
    const operator = this.detectOperator(fieldConfig.fieldType, fieldConfig.operator);

    query = this.applySupabaseFilter(query, fieldKey, operator, value);
  }

  // ✅ Pagination with range
  const { data, error } = await query
    .range(offset, offset + limit - 1);  // ← KEY!

  if (error || !data) return [];

  // ✅ CACHE в RxDB
  const collection = this.getCollection(entityType);
  await collection.bulkUpsert(data);

  return data;
}
```

### 3. getFilteredCount (hasMore detection)

```typescript
private async getFilteredCount(
  entityType: string,
  filters: Record<string, any>
): Promise<number> {

  const { supabase } = await import('../supabase/client');
  let query = supabase
    .from(entityType)
    .select('*', { count: 'exact', head: true });

  // Apply same filters
  for (const [fieldKey, value] of Object.entries(filters)) {
    if (!value) continue;

    const fieldConfig = this.getFieldConfig(entityType, fieldKey);
    const operator = this.detectOperator(fieldConfig.fieldType, fieldConfig.operator);

    query = this.applySupabaseFilter(query, fieldKey, operator, value);
  }

  const { count, error } = await query;
  return count || 0;
}
```

---

## 🎯 Use Cases

### 1. LookupInput (collection mode) - Search

```typescript
// User types "golden" в Breed lookup
const loadDictionaryOptions = async (query: string, append: boolean) => {
  const offset = append ? offsetRef.current : 0;

  const result = await spaceStore.applyFilters(
    'breed',
    { name: query },  // filters
    { limit: 30, offset }
  );

  if (append) {
    setOptions(prev => [...prev, ...result.records]);
    offsetRef.current += 30;
  } else {
    setOptions(result.records);
    offsetRef.current = 30;
  }

  setHasMore(result.hasMore);
};

// Scroll
const handleScroll = () => {
  if (scrollBottom < 50 && hasMore) {
    loadDictionaryOptions(searchQuery, true);  // append=true
  }
};
```

**Result:**
```
Initial: applyFilters(breed, {name: 'golden'}, {offset: 0})
  → cache 30 golden breeds
  → hasMore: true

Scroll: applyFilters(breed, {name: 'golden'}, {offset: 30})
  → cache +30 golden breeds
  → hasMore: true

Works! ✅
```

---

### 2. SpaceView - БЕЗ фільтрів

```typescript
// User відкриває /breeds/list
const handleScroll = () => {
  if (scrollBottom < 100 && hasMore) {
    loadMoreFiltered();
  }
};

const loadMoreFiltered = async () => {
  const currentOffset = offsetRef.current;

  const result = await spaceStore.applyFilters(
    'breed',
    {},  // NO filters
    { limit: 30, offset: currentOffset }
  );

  setEntities(prev => [...prev, ...result.records]);
  offsetRef.current += 30;
  setHasMore(result.hasMore);
};
```

**Result:**
```
Initial: applyFilters(breed, {}, {offset: 0})
  → cache 30 breeds

Scroll: applyFilters(breed, {}, {offset: 30})
  → cache +30 breeds

Works! ✅
```

---

### 3. SpaceView - З фільтрами (Query Params)

```typescript
// User на /breeds/list?Name=golden
const filters = useMemo(() => {
  const params = new URLSearchParams(location.search);
  return {
    name: params.get('Name') || undefined
  };
}, [location.search]);

// Initial load
useEffect(() => {
  const loadFiltered = async () => {
    const result = await spaceStore.applyFilters(
      'breed',
      filters,  // { name: 'golden' }
      { limit: 30, offset: 0 }
    );

    setEntities(result.records);
    setHasMore(result.hasMore);
    offsetRef.current = 30;
  };

  loadFiltered();
}, [filters]);  // Re-run when filters change!

// Scroll
const handleScroll = () => {
  if (scrollBottom < 100 && hasMore) {
    loadMoreWithFilters();
  }
};

const loadMoreWithFilters = async () => {
  const result = await spaceStore.applyFilters(
    'breed',
    filters,  // Same filters!
    { limit: 30, offset: offsetRef.current }
  );

  setEntities(prev => [...prev, ...result.records]);
  offsetRef.current += 30;
  setHasMore(result.hasMore);
};
```

**Result:**
```
Initial: applyFilters(breed, {name: 'golden'}, {offset: 0})
  → cache 30 golden breeds

Scroll: applyFilters(breed, {name: 'golden'}, {offset: 30})
  → cache +30 golden breeds

User змінює фільтр на "lab":
Initial: applyFilters(breed, {name: 'lab'}, {offset: 0})
  → cache 30 lab breeds
  → offset resets to 0! ✅

Works! ✅
```

---

## 🔧 Що треба реалізувати

### 1. filterLocalEntities - додати skip()
```typescript
// Було:
query.limit(limit);

// Треба:
query.skip(offset).limit(limit);
```

### 2. fetchFilteredFromSupabase - додати .range()
```typescript
// Було:
query.limit(limit);

// Треба:
query.range(offset, offset + limit - 1);
```

### 3. getFilteredCount - новий метод
```typescript
private async getFilteredCount(
  entityType: string,
  filters: Record<string, any>
): Promise<number> {
  // Supabase count query з filters
}
```

### 4. applyFilters - оновити логіку
```typescript
// Було:
if (localResults.length < limit && !offset) {  // ❌ !offset блокує scroll
  fetchFromSupabase();
}

// Треба:
const needsRemoteFetch =
  localResults.length < limit ||  // Not enough in cache
  offset > 0;                     // Scroll pagination

if (needsRemoteFetch) {
  const remoteResults = await fetchFilteredFromSupabase(..., offset);
  await collection.bulkUpsert(remoteResults);
}

const serverTotal = await getFilteredCount(entityType, filters);
const hasMore = offset + limit < serverTotal;
```

---

## 🚀 Переваги нового підходу

### Для розробки:
- ✅ Простіше - один механізм
- ✅ Менше коду
- ✅ Менше багів
- ✅ Легше тестувати

### Для користувача:
- ✅ Швидко - RxDB cache first
- ✅ Надійно - no checkpoint bugs
- ✅ Офлайн - кешовані результати
- ✅ Плавно - предсказуємий scroll

### Для проекту:
- ✅ Масштабованість - тисячі records OK
- ✅ Maintainability - зрозумілий код
- ✅ Flexibility - легко додати нові фільтри
- ✅ Performance - smart caching

---

## ❓ А що з replication?

### Replication залишається для:

**1. Background sync** (НЕ для UI scroll!)
```typescript
// Раз на годину - перевірити оновлення
setInterval(() => {
  entityReplication.backgroundSync()
    → fetch нові/змінені records
    → update RxDB cache
}, 3600000);
```

**2. Real-time updates** (websockets)
```typescript
// Коли інший юзер додав breed
websocket.on('breed.created', (newBreed) => {
  collection.upsert(newBreed);
});
```

**3. Offline sync** (майбутнє)
```typescript
// User був офлайн, створив 5 breeds
// Повернувся онлайн
offlineSync.syncPendingChanges();
```

### Replication НЕ використовується для:
- ❌ UI scroll pagination
- ❌ Search results loading
- ❌ Filtered data loading

---

## 📊 Comparison

| Feature | Checkpoint-based | Offset-based |
|---------|-----------------|--------------|
| **Filters support** | ❌ Broken | ✅ Works |
| **Gaps in data** | ❌ Yes | ✅ No |
| **Complexity** | ❌ High | ✅ Low |
| **Code paths** | ❌ Multiple | ✅ Single |
| **Caching** | ✅ Yes | ✅ Yes |
| **Offline** | ✅ Yes | ✅ Yes |
| **UI scroll** | ❌ Complex | ✅ Simple |
| **Background sync** | ✅ Good | ❌ Not ideal |

**Висновок:** Offset-based для UI, Replication для background sync!

---

## 🎯 Наступні кроки

1. ✅ Архівувати старий документ
2. 🔨 Реалізувати skip(offset) в filterLocalEntities
3. 🔨 Реалізувати .range() в fetchFilteredFromSupabase
4. 🔨 Додати getFilteredCount()
5. 🔨 Оновити applyFilters() логіку
6. 🧪 Тестувати scroll в LookupInput
7. 🧪 Тестувати scroll в SpaceView
8. 📝 Оновити інші документи

---

**Status:** Ready to implement! 🚀
