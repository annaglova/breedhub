# Scroll-Based Tabs with Infinite Scroll - Implementation Complete

**Дата завершення:** 2025-12-16
**Статус:** ✅ DONE
**Автор:** Implementation Complete

---

## Executive Summary

Реалізовано scroll-based tabs систему з підтримкою **Infinite Scroll** та **Local-First ID-First архітектурою**.

**Ключові принципи:**
1. **Local-First** - Всі дані в UI рендеряться з RxDB
2. **ID-First Pagination** - Keyset cursor pagination для стабільного infinite scroll
3. **Config-Driven** - Таби конфігуруються через `app_config.json`
4. **Two Loading Modes** - Drawer (обмежений) та Fullscreen (infinite scroll)

---

## Архітектура

### Data Flow (Local-First)

```
┌─────────────────────────────────────────────────────────────────┐
│                        UI Component                              │
│  (BreedTopPetsTab, BreedPatronsTab, BreedTopKennelsTab)        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    React Hooks Layer                             │
│  useTabData (drawer) │ useInfiniteTabData (fullscreen)          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     TabDataService                               │
│  loadTabData() │ loadTabDataPaginated()                         │
│  Routes to correct loading method based on dataSource config    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       SpaceStore                                 │
│  loadChildViewDirect() - Direct query with RxDB caching         │
│                                                                  │
│  IMPORTANT: All data cached in RxDB before returning!           │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────┐
│        Supabase         │     │         RxDB            │
│  (Source of Truth)      │     │  (Local Cache)          │
│  VIEW with JOINs        │     │  breed_children         │
└─────────────────────────┘     └─────────────────────────┘
```

### Keyset (Cursor) Pagination

**Чому НЕ offset pagination:**
- Offset стає повільним на великих датасетах
- Записи можуть дублюватися або пропускатися при зміні даних
- Неможливо кешувати ефективно

**Composite Cursor формат:**
```typescript
interface CompositeCursor {
  value: any;        // Значення поля сортування (e.g., rating)
  tieBreaker: any;   // ID для унікальності при однакових values
}

// Приклад cursor: { value: 5, tieBreaker: "uuid-123" }
// SQL: WHERE (rating < 5) OR (rating = 5 AND id > 'uuid-123')
```

**Keyset Query Pattern:**
```sql
-- Перша сторінка (без cursor)
SELECT * FROM top_pet_in_breed_with_pet
WHERE breed_id = $1
ORDER BY rating DESC, id ASC
LIMIT 30

-- Наступні сторінки (з cursor)
SELECT * FROM top_pet_in_breed_with_pet
WHERE breed_id = $1
  AND (
    rating < $cursorValue
    OR (rating = $cursorValue AND id > $cursorTieBreaker)
  )
ORDER BY rating DESC, id ASC
LIMIT 30
```

---

## Компоненти

### 1. Tab Components

**BreedTopPetsTab** (`apps/app/src/components/breed/tabs/BreedTopPetsTab.tsx`)
```tsx
// Два режими завантаження
const drawerResult = useTabData<TopPetViewRecord>({
  parentId: breedId,
  dataSource: dataSource!,
  enabled: !!dataSource && !!breedId && !isFullscreen,
});

const infiniteResult = useInfiniteTabData<TopPetViewRecord>({
  parentId: breedId,
  dataSource: dataSource!,
  enabled: !!dataSource && !!breedId && isFullscreen,
  pageSize: 30,
});

// Data transformation - працює з обома форматами
const pets = useMemo(() => {
  return data.map((record) => {
    // VIEW format: record.pet
    // RxDB format: record.additional?.pet
    const pet = record.pet || (record as any).additional?.pet;
    return { /* ... */ };
  });
}, [data]);

// IntersectionObserver для auto-load
useEffect(() => {
  if (!isFullscreen || !loadMoreRef.current) return;

  const observer = new IntersectionObserver(
    (entries) => {
      if (entries[0]?.isIntersecting) {
        handleLoadMore();
      }
    },
    { threshold: 0.1, rootMargin: "100px" }
  );

  observer.observe(loadMoreRef.current);
  return () => observer.disconnect();
}, [isFullscreen, handleLoadMore, hasMore, isLoadingMore, pets.length]);
```

**BreedPatronsTab** - Аналогічна структура для патронів
**BreedTopKennelsTab** - TODO: Оновити для infinite scroll

### 2. Hooks

**useTabData** (`packages/rxdb-store/src/hooks/useTabData.ts`)
- Для drawer mode (обмежена кількість записів)
- Завантажує всі записи одразу
- Простий state: `{ data, isLoading, error }`

**useInfiniteTabData** (`packages/rxdb-store/src/hooks/useInfiniteTabData.ts`)
```typescript
function useInfiniteTabData<T>({
  parentId,
  dataSource,
  enabled = true,
  pageSize = 30,
}: UseInfiniteTabDataOptions): InfiniteTabDataResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Composite cursor ref
  const cursorRef = useRef<string | null>(null);

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingRef.current || !cursorRef.current) return;

    const result = await tabDataService.loadTabDataPaginated(
      parentId,
      dataSource,
      { cursor: cursorRef.current, limit: pageSize }
    );

    // Accumulate data
    setData(prev => [...prev, ...result.records]);
    setHasMore(result.hasMore);
    cursorRef.current = result.nextCursor;
  }, [parentId, dataSource, hasMore, pageSize]);

  return { data, isLoading, isLoadingMore, hasMore, loadMore, refetch };
}
```

### 3. Services

**TabDataService** (`packages/rxdb-store/src/services/tab-data.service.ts`)
```typescript
async loadTabDataPaginated(
  parentId: string,
  dataSource: DataSourceConfig,
  pagination?: PaginationOptions
): Promise<PaginatedResult<any>> {
  const config = dataSource.config;

  // Route to appropriate loading method
  if (config.type === 'childView') {
    return this.loadChildViewPaginated(parentId, dataSource, pagination);
  }

  // ... other types
}

private async loadChildViewPaginated(
  parentId: string,
  dataSource: DataSourceConfig,
  pagination?: PaginationOptions
): Promise<PaginatedResult<any>> {
  const { cursor, limit = 30 } = pagination || {};

  // Parse composite cursor
  let orderBy: OrderBy = {
    field: config.orderBy?.field || 'rating',
    direction: config.orderBy?.direction || 'desc',
    tieBreaker: { field: 'id', direction: 'asc' }
  };

  // Direct query to VIEW (more efficient than ID-First for JOINed VIEWs)
  return spaceStore.loadChildViewDirect(
    parentId,
    config.table,
    config.parentField,
    { limit, cursor, orderBy }
  );
}
```

### 4. SpaceStore - loadChildViewDirect

```typescript
async loadChildViewDirect(
  parentId: string,
  viewName: string,
  parentField: string,
  options: { limit?: number; cursor?: string | null; orderBy?: OrderBy; } = {}
): Promise<{ records: any[]; total: number; hasMore: boolean; nextCursor: string | null }> {

  // 📴 OFFLINE: Return from RxDB cache
  if (!navigator.onLine) {
    const localRecords = await this.filterLocalChildEntities(/* ... */);
    return { records: localRecords, total: localRecords.length, hasMore: false, nextCursor: null };
  }

  // 🌐 ONLINE: Build Supabase query with keyset pagination
  let query = supabase
    .from(viewName)
    .select('*', { count: 'exact' })
    .eq(parentField, parentId)
    .order(orderField, { ascending: orderDirection === 'asc' })
    .order('id', { ascending: true })
    .limit(limit);

  // Apply cursor filter (keyset pagination)
  if (cursor) {
    const { value, tieBreaker } = JSON.parse(cursor);
    if (orderDirection === 'desc') {
      query = query.or(`${orderField}.lt.${value},and(${orderField}.eq.${value},id.gt.${tieBreaker})`);
    } else {
      query = query.or(`${orderField}.gt.${value},and(${orderField}.eq.${value},id.gt.${tieBreaker})`);
    }
  }

  const { data: rawRecords, count, error } = await query;

  // 💾 CACHE IN RXDB (Local-First!)
  const collection = await this.ensureChildCollection(entityType);
  const normalizedTableType = viewName.replace(/_with_\w+$/, '');

  const transformedRecords = rawRecords.map((row) => {
    const { id, [parentField]: pId, ...rest } = row;
    return {
      id,
      tableType: normalizedTableType,
      parentId,
      additional: { ...rest },  // All joined data goes here
      cachedAt: Date.now()
    };
  });

  await collection.bulkUpsert(transformedRecords);

  // Build next cursor
  const lastRecord = rawRecords[rawRecords.length - 1];
  const nextCursor = hasMore ? JSON.stringify({
    value: lastRecord[orderField],
    tieBreaker: lastRecord.id
  }) : null;

  return { records: transformedRecords, total: count, hasMore, nextCursor };
}
```

---

## Config Structure

**app_config.json - Tab з dataSource:**
```json
{
  "tabs": {
    "topPets": {
      "order": 1,
      "component": "BreedTopPetsTab",
      "label": "Top Pets",
      "icon": { "name": "Trophy", "source": "lucide" },
      "slug": "top-pets",
      "fullscreenButton": true,
      "recordsCount": 20,
      "dataSource": {
        "type": "config",
        "config": {
          "type": "childView",
          "table": "top_pet_in_breed_with_pet",
          "parentField": "breed_id",
          "orderBy": {
            "field": "rating",
            "direction": "desc"
          }
        }
      }
    }
  }
}
```

---

## Key Principles

### 1. Local-First
```
✅ ВСІ дані в UI рендеряться з RxDB
✅ Supabase → RxDB → UI (ніколи напряму)
✅ Offline mode працює з кешованими даними
```

### 2. ID-First (для VIEWs)
```
⚠️ VIEWs з JOINs повільні з WHERE id IN (...)
✅ Використовуємо прямий запит WHERE parent_id = X
✅ Результати кешуємо в RxDB для offline
```

### 3. Keyset Pagination
```
✅ Composite cursor: { value, tieBreaker }
✅ Стабільна пагінація навіть при зміні даних
✅ Ефективний для великих датасетів
```

### 4. Two Loading Modes
```
Drawer Mode:
- useTabData hook
- Завантажує всі записи (обмежено recordsCount)
- Для швидкого preview

Fullscreen Mode:
- useInfiniteTabData hook
- Infinite scroll з cursor pagination
- IntersectionObserver для auto-load
```

---

## Files Changed

### Core Implementation
- `packages/rxdb-store/src/stores/space-store.signal-store.ts` - loadChildViewDirect з RxDB caching
- `packages/rxdb-store/src/services/tab-data.service.ts` - loadTabDataPaginated routing
- `packages/rxdb-store/src/hooks/useInfiniteTabData.ts` - NEW: infinite scroll hook
- `packages/rxdb-store/src/types/tab-data.types.ts` - Pagination types

### Tab Components
- `apps/app/src/components/breed/tabs/BreedTopPetsTab.tsx` - Infinite scroll support
- `apps/app/src/components/breed/tabs/BreedPatronsTab.tsx` - Infinite scroll support
- `apps/app/src/components/breed/tabs/BreedTopKennelsTab.tsx` - TODO

### Templates
- `apps/app/src/components/template/TabPageTemplate.tsx` - Fullscreen tab page

---

## Testing

```bash
# Manual testing steps:
1. Open breed page (e.g., /german-shepherd)
2. Scroll to Top Pets tab
3. Click fullscreen button → navigates to /german-shepherd/top-pets
4. Scroll down → more pets load automatically
5. Check browser DevTools → RxDB collections populated
6. Go offline → cached data still displays
```

---

## Known Limitations

1. **BreedTopKennelsTab** - Ще не оновлений для infinite scroll
2. **Search in fullscreen** - Не реалізовано (потребує server-side search)
3. **Sorting in fullscreen** - Фіксований порядок з конфігу

---

## Related Documents

- [SPACE_STORE_ARCHITECTURE.md](../SPACE_STORE_ARCHITECTURE.md) - SpaceStore та ID-First pattern
- [TAB_DATA_SERVICE_ARCHITECTURE.md](../TAB_DATA_SERVICE_ARCHITECTURE.md) - TabDataService routing
- [CHILD_TABLES_IMPLEMENTATION_PLAN.md](../CHILD_TABLES_IMPLEMENTATION_PLAN.md) - Child records architecture
