# Infinite Scroll for Fullscreen Tabs - Implementation TODO

**Created:** 2025-12-16
**Related:**
- [TAB_DATA_SERVICE_ARCHITECTURE.md](./TAB_DATA_SERVICE_ARCHITECTURE.md)
- [CHILD_TABLES_ARCHITECTURE.md](./CHILD_TABLES_ARCHITECTURE.md)

---

## Overview

На fullscreen режимі табів (напр. `/german-shepherd/pets`) потрібен infinite scroll замість обмеженого списку. Зараз показуються тільки записи з `limit` конфігу. Потрібно підгружати ще записи при скролі, дотримуючись Local-First архітектури.

### Принципи

1. **Local-First** — спочатку показати що є в RxDB, потім дозавантажити з сервера
2. **ID-First pagination** — використовувати cursor-based пагінацію (не offset)
3. **Lazy loading** — підгружати при скролі, не все одразу
4. **Config-driven** — limit для preview vs unlimited для fullscreen

---

## Current State

```
TabPageTemplate
    ↓
TabComponent (mode="fullscreen")
    ↓
useTabData({ dataSource, parentId })
    ↓
TabDataService.loadTabData()
    ↓
SpaceStore.loadChildRecords({ limit })  ← Завжди з лімітом!
    ↓
RxDB → Supabase (ID-First)
```

**Проблема:** `loadChildRecords` завжди застосовує `limit` з конфігу.

---

## Target State

```
TabPageTemplate
    ↓
TabComponent (mode="fullscreen")
    ↓
useInfiniteTabData({ dataSource, parentId })  ← NEW HOOK
    ↓
TabDataService.loadTabData({ offset, limit })  ← With pagination
    ↓
SpaceStore.loadChildRecords({ offset, limit })
    ↓
RxDB → Supabase (ID-First with cursor)
```

---

## Phase 1: Core Infrastructure

### 1.1 Update Types
- [ ] Add to `tab-data.types.ts`:
  ```typescript
  interface InfiniteTabDataResult<T> {
    data: T[];
    isLoading: boolean;        // Initial load
    isLoadingMore: boolean;    // Loading next page
    hasMore: boolean;          // More records available
    error: Error | null;
    loadMore: () => Promise<void>;
    refetch: () => Promise<void>;
  }

  interface UseInfiniteTabDataOptions extends UseTabDataOptions {
    pageSize?: number;  // Records per page (default: 30)
  }

  interface PaginatedResult<T> {
    records: T[];
    hasMore: boolean;
    nextCursor?: string;  // Last record ID for cursor pagination
  }
  ```

### 1.2 Update TabDataService
- [ ] Modify `loadTabData()` signature:
  ```typescript
  async loadTabData(
    parentId: string,
    dataSource: DataSourceConfig,
    options?: { offset?: number; limit?: number; cursor?: string }
  ): Promise<PaginatedResult<any>>
  ```
- [ ] Update `loadChild()` to support pagination
- [ ] Update `loadChildView()` to support pagination
- [ ] Return `{ records, hasMore, nextCursor }`

### 1.3 Update SpaceStore.loadChildRecords
- [ ] Add `offset` parameter support
- [ ] Add `cursor` parameter support (ID-First)
- [ ] Return total count or hasMore flag

### 1.4 Create useInfiniteTabData Hook
- [ ] Create `packages/rxdb-store/src/hooks/useInfiniteTabData.ts`
- [ ] Implement accumulating data state
- [ ] Implement `loadMore()` function
- [ ] Track `hasMore` state
- [ ] Handle `isLoadingMore` state separately from `isLoading`
- [ ] Export from index.ts

---

## Phase 2: UI Integration

### 2.1 Create InfiniteScrollSentinel Component
- [ ] Create `apps/app/src/components/shared/InfiniteScrollSentinel.tsx`
- [ ] Use IntersectionObserver
- [ ] Call `loadMore` when visible
- [ ] Show loading indicator

### 2.2 Update Tab Components
- [ ] Update `BreedTopPetsTab`:
  - [ ] Accept `mode` prop
  - [ ] Use `useInfiniteTabData` when `mode === 'fullscreen'`
  - [ ] Use `useTabData` when `mode !== 'fullscreen'`
  - [ ] Add `InfiniteScrollSentinel` at bottom

- [ ] Update `BreedTopKennelsTab`:
  - [ ] Same pattern as BreedTopPetsTab

- [ ] Update `BreedPatronsTab`:
  - [ ] Same pattern as BreedTopPetsTab

### 2.3 Update TabPageTemplate
- [ ] Pass `mode="fullscreen"` to tab components
- [ ] Remove fixed `recordsCount` limit in fullscreen

---

## Phase 3: Optimization

### 3.1 Smart Loading
- [ ] Preload first page in RxDB before navigation
- [ ] Keep previous pages in memory during session
- [ ] Clear old pages on entity change

### 3.2 Performance
- [ ] Virtualization for very long lists (react-window)
- [ ] Debounce scroll events
- [ ] Cancel pending requests on unmount

---

## Implementation Order

1. **Types** — Add new interfaces
2. **SpaceStore** — Add offset/cursor support
3. **TabDataService** — Return paginated results
4. **useInfiniteTabData** — New hook
5. **InfiniteScrollSentinel** — UI component
6. **BreedTopPetsTab** — First migration
7. **Other tabs** — Migrate remaining

---

## API Examples

### useInfiniteTabData Usage

```tsx
function BreedTopPetsTab({ dataSource, mode }) {
  // For preview mode - use regular hook with limit
  if (mode !== 'fullscreen') {
    const { data, isLoading } = useTabData({ parentId, dataSource });
    return <PetGrid pets={data} />;
  }

  // For fullscreen - use infinite scroll
  const {
    data,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore
  } = useInfiniteTabData({
    parentId,
    dataSource,
    pageSize: 30
  });

  return (
    <>
      <PetGrid pets={data} />
      <InfiniteScrollSentinel
        hasMore={hasMore}
        isLoading={isLoadingMore}
        onLoadMore={loadMore}
      />
    </>
  );
}
```

### InfiniteScrollSentinel Usage

```tsx
function InfiniteScrollSentinel({ hasMore, isLoading, onLoadMore }) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sentinelRef.current || !hasMore || isLoading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMore();
        }
      },
      { rootMargin: '200px' } // Load before reaching bottom
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, isLoading, onLoadMore]);

  if (!hasMore) return null;

  return (
    <div ref={sentinelRef} className="py-4 flex justify-center">
      {isLoading && <Loader2 className="animate-spin" />}
    </div>
  );
}
```

---

## Success Criteria

- [ ] Fullscreen tabs load initial page quickly
- [ ] Scrolling to bottom loads more records
- [ ] Loading indicator shows during fetch
- [ ] "No more records" state when all loaded
- [ ] Works offline with cached data
- [ ] No duplicate records on reload
- [ ] Memory usage stays reasonable (< 100MB for 1000 records)

---

## Files to Create/Modify

**New Files:**
- `packages/rxdb-store/src/hooks/useInfiniteTabData.ts`
- `apps/app/src/components/shared/InfiniteScrollSentinel.tsx`

**Modified Files:**
- `packages/rxdb-store/src/types/tab-data.types.ts`
- `packages/rxdb-store/src/services/tab-data.service.ts`
- `packages/rxdb-store/src/stores/space-store.signal-store.ts`
- `packages/rxdb-store/src/index.ts`
- `apps/app/src/components/breed/tabs/BreedTopPetsTab.tsx`
- `apps/app/src/components/breed/tabs/BreedTopKennelsTab.tsx`
- `apps/app/src/components/breed/tabs/BreedPatronsTab.tsx`
- `apps/app/src/components/template/TabPageTemplate.tsx`
