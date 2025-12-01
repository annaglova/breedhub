# Public Page Implementation TODO

**Active Checklist** - завдання для імплементації config-driven public pages

**Last Updated:** 2025-12-01

**Architecture Reference:** [PUBLIC_PAGE_ARCHITECTURE.md](./PUBLIC_PAGE_ARCHITECTURE.md)

---

## Current Status

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 1 | ⏳ Deferred | RxDB Child Tables Foundation (UI-dependent) |
| Phase 2 | ✅ Complete | Page Template Core (via DYNAMIC_PUBLIC_PAGE_TODO) |
| Phase 3 | ✅ Partial | Config Structure (tabs have metadata) |
| Phase 4 | ✅ Complete | Routing & Modes (drawer/fullscreen work) |
| Phase 5 | ✅ Complete | Migration breed page |
| Phase 6 | ⏳ Pending | Testing & Validation |
| Phase 7 | ⏳ Pending | Expand to all entities |
| **Phase 8** | ⏳ **NEXT** | **Tab Fullscreen Mode** |

**Note:** Much of this was completed via [DYNAMIC_PUBLIC_PAGE_TODO.md](./done/DYNAMIC_PUBLIC_PAGE_TODO.md)

---

## What's Already Done ✅

Via **DYNAMIC_PUBLIC_PAGE_TODO.md** (completed 2025-11-25):

- ✅ Type definitions (PageConfig, BlockConfig)
- ✅ ComponentRegistry + Outlet Pattern
- ✅ BlockRenderer
- ✅ PublicPageTemplate refactoring
- ✅ TabOutletRenderer
- ✅ Signal-based reactivity
- ✅ SpaceProvider Context
- ✅ Drawer/Fullscreen modes

---

## Phase 8: Tab Fullscreen Mode ⏳ **NEXT**

**Goal**: Implement deep-link tab pages with infinite scroll

### Overview

**Current behavior:**
```
/affenpinscher#achievements     ← Hash-based tab switching (scroll mode)
```

**New behavior:**
```
/affenpinscher/achievements     ← Nested route (fullscreen tab mode)
```

Tab Fullscreen Mode = dedicated page for single tab content with:
- Name header (sticky)
- PageMenu with only fullscreen-enabled tabs
- Single tab content with infinite scroll
- No scroll-through-all-tabs behavior

### URL Structure

| Mode | URL | Description |
|------|-----|-------------|
| Page (scroll) | `/affenpinscher#achievements` | All tabs, scroll navigation |
| Tab Fullscreen | `/affenpinscher/achievements` | Single tab, infinite scroll |

### Visual Layout (Tab Fullscreen)

```
┌─────────────────────────────────────────────┐
│ ← Back    Affenpinscher                     │  ← Name header (sticky)
├─────────────────────────────────────────────┤
│ [Achievements] [Top Pets] [Top Kennels]     │  ← PageMenu (only fullscreen tabs)
├─────────────────────────────────────────────┤
│                                             │
│   Tab Content                               │
│   - Lazy loading                            │
│   - Infinite scroll (ID-first pagination)   │
│   - No recordsLimit                         │
│                                             │
│   ...                                       │
│   [Loading more...]                         │
│                                             │
└─────────────────────────────────────────────┘
```

### Implementation Plan

#### Step 1: Router Configuration

**File:** `apps/app/src/router/AppRouter.tsx`

Add nested route for tab fullscreen:

```tsx
// Add after SlugResolver
<Route path=":slug/:tabSlug" element={<TabFullscreenResolver />} />
```

**New routes:**
```
/:slug              → SlugResolver (existing)
/:slug/:tabSlug     → TabFullscreenResolver (NEW)
```

#### Step 2: Create TabFullscreenResolver

**File:** `apps/app/src/pages/TabFullscreenResolver.tsx`

```typescript
/**
 * TabFullscreenResolver - Handles /affenpinscher/achievements URLs
 *
 * Flow:
 * 1. Resolve :slug to entity (via RouteStore)
 * 2. Validate :tabSlug exists and has fullscreenButton: true
 * 3. Render TabFullscreenPage
 */
export function TabFullscreenResolver() {
  const { slug, tabSlug } = useParams();
  // ... resolve entity
  // ... validate tab exists and is fullscreen-enabled
  return <TabFullscreenPage entity={entity} tabSlug={tabSlug} />;
}
```

#### Step 3: Create TabFullscreenPage Component

**File:** `apps/app/src/pages/TabFullscreenPage.tsx`

```typescript
interface TabFullscreenPageProps {
  entity: Entity;
  tabSlug: string;
  tabsConfig: Record<string, TabConfig>;
}

/**
 * TabFullscreenPage - Single tab with infinite scroll
 *
 * Layout:
 * - NameOutlet (sticky header with back button)
 * - PageMenu (only fullscreen-enabled tabs)
 * - Single tab content (infinite scroll)
 */
export function TabFullscreenPage({ entity, tabSlug, tabsConfig }) {
  // Filter only fullscreen-enabled tabs for PageMenu
  const fullscreenTabs = Object.values(tabsConfig)
    .filter(tab => tab.fullscreenButton);

  return (
    <div className="flex flex-col h-full">
      {/* Name Header with Back Button */}
      <header className="sticky top-0 z-40 bg-background">
        <NameOutlet entity={entity} showBackButton />
      </header>

      {/* PageMenu - only fullscreen tabs */}
      <div className="sticky top-[nameHeight] z-30">
        <PageMenu
          tabs={fullscreenTabs}
          activeTab={tabSlug}
          onTabChange={handleTabChange}
          mode="tabs"  // ← NOT scroll mode!
        />
      </div>

      {/* Tab Content with Infinite Scroll */}
      <main className="flex-1 overflow-y-auto">
        <TabFullscreenContent
          tabSlug={tabSlug}
          entity={entity}
          tabConfig={tabsConfig[tabSlug]}
        />
      </main>
    </div>
  );
}
```

#### Step 4: Create TabFullscreenContent Component

**File:** `apps/app/src/components/tabs/TabFullscreenContent.tsx`

```typescript
/**
 * TabFullscreenContent - Tab content with infinite scroll
 *
 * Features:
 * - Lazy loading (no initial data)
 * - ID-first pagination (infinite scroll)
 * - No recordsLimit (loads all data progressively)
 * - Future: filtering, search
 */
export function TabFullscreenContent({ tabSlug, entity, tabConfig }) {
  const {
    records,
    isLoading,
    hasMore,
    loadMore,
  } = useInfiniteChildRecords({
    parentId: entity.id,
    tableType: tabConfig.childTable,
    pageSize: 20,
  });

  // Tab component from registry
  const TabComponent = ComponentRegistry.get(tabConfig.component);

  return (
    <div>
      <TabComponent
        records={records}
        isLoading={isLoading}
        mode="fullscreen"  // ← Different from preview mode
      />

      {/* Infinite scroll trigger */}
      {hasMore && (
        <InfiniteScrollTrigger onTrigger={loadMore} />
      )}
    </div>
  );
}
```

#### Step 5: Create useInfiniteChildRecords Hook

**File:** `apps/app/src/hooks/useInfiniteChildRecords.ts`

```typescript
/**
 * useInfiniteChildRecords - Hook for infinite scroll with ID-first pagination
 *
 * Uses existing SpaceStore pagination pattern:
 * - Fetch page by lastId (not offset)
 * - Accumulate records
 * - Track hasMore state
 */
interface UseInfiniteChildRecordsOptions {
  parentId: string;
  tableType: string;
  pageSize?: number;
}

export function useInfiniteChildRecords(options: UseInfiniteChildRecordsOptions) {
  const [records, setRecords] = useState<any[]>([]);
  const [lastId, setLastId] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);
    const newRecords = await spaceStore.loadChildRecords(
      options.parentId,
      options.tableType,
      {
        limit: options.pageSize || 20,
        afterId: lastId,
      }
    );

    if (newRecords.length < (options.pageSize || 20)) {
      setHasMore(false);
    }

    if (newRecords.length > 0) {
      setRecords(prev => [...prev, ...newRecords]);
      setLastId(newRecords[newRecords.length - 1].id);
    }

    setIsLoading(false);
  }, [options, lastId, hasMore, isLoading]);

  // Initial load
  useEffect(() => {
    loadMore();
  }, [options.parentId, options.tableType]);

  return { records, isLoading, hasMore, loadMore };
}
```

#### Step 6: Update TabHeader Expand Button URL

**File:** `apps/app/src/components/tabs/TabsContainer.tsx`

Change fullscreen URL generation:

```typescript
// BEFORE (hash-based)
const fullscreenUrl = tab.fullscreenButton
  ? `#${tab.fragment}/fullscreen`
  : undefined;

// AFTER (nested route)
const fullscreenUrl = tab.fullscreenButton
  ? `${entitySlug}/${tab.fragment}`  // → /affenpinscher/achievements
  : undefined;
```

Also update in `TabOutletRenderer.tsx`.

#### Step 7: Create InfiniteScrollTrigger Component

**File:** `apps/app/src/components/shared/InfiniteScrollTrigger.tsx`

```typescript
/**
 * InfiniteScrollTrigger - Intersection Observer for infinite scroll
 *
 * Place at bottom of list, triggers loadMore when visible
 */
export function InfiniteScrollTrigger({ onTrigger, isLoading }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isLoading) {
          onTrigger();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [onTrigger, isLoading]);

  return (
    <div ref={ref} className="h-20 flex items-center justify-center">
      {isLoading && <Spinner />}
    </div>
  );
}
```

### Tasks Checklist

- [ ] **Step 1:** Add route `/:slug/:tabSlug` to AppRouter
- [ ] **Step 2:** Create `TabFullscreenResolver.tsx`
- [ ] **Step 3:** Create `TabFullscreenPage.tsx`
- [ ] **Step 4:** Create `TabFullscreenContent.tsx`
- [ ] **Step 5:** Create `useInfiniteChildRecords.ts` hook
- [ ] **Step 6:** Update fullscreen URL in TabsContainer & TabOutletRenderer
- [ ] **Step 7:** Create `InfiniteScrollTrigger.tsx`
- [ ] **Step 8:** Add back button to NameOutlet for fullscreen mode
- [ ] **Step 9:** Test navigation: drawer → tab fullscreen
- [ ] **Step 10:** Test navigation: page fullscreen → tab fullscreen

### Future Enhancements (Optional)

- [ ] Filtering UI in tab fullscreen header
- [ ] Search input for tab content
- [ ] Sort options
- [ ] Export/download functionality

---

## Phase 1: Child Tables Data Layer ⏳ (Deferred)

**Goal**: Connect UI to real child data (not mocks)

**Note**: This is UI-dependent. Work progressively as UI components need real data.

See: [CHILD_TABLES_TODO.md](./CHILD_TABLES_TODO.md)

- [ ] Integrate breed_children collection with SpaceStore
- [ ] Implement `loadChildRecords()` in SpaceStore
- [ ] Create `useChildRecords` hook
- [ ] Connect to real Supabase data

---

## Phase 6: Testing & Validation ⏳

**Goal**: Comprehensive test coverage

- [ ] Unit tests for ComponentRegistry
- [ ] Config validation tests
- [ ] Integration tests for config → rendering flow
- [ ] E2E tests for user flows
- [ ] CI/CD integration

---

## Phase 7: Expand to Other Entities ⏳

**Goal**: Roll out to all main entities

- [ ] Pet page config
- [ ] Kennel page config
- [ ] Account page config
- [ ] Contact page config
- [ ] Other entities (10+)

---

## Quick Reference

### Key Files (already created)

**Page Template:**
- `apps/app/src/components/template/PublicPageTemplate.tsx`
- `apps/app/src/components/blocks/TabOutletRenderer.tsx`
- `apps/app/src/hooks/useTabNavigation.ts`

**Outlets:**
- `apps/app/src/components/template/TabOutlet.tsx`
- `apps/app/src/components/template/CoverOutlet.tsx`
- `apps/app/src/components/template/NameOutlet.tsx`

**Tabs:**
- `apps/app/src/components/tabs/TabsContainer.tsx`
- `apps/app/src/components/tabs/PageMenu.tsx`
- `apps/app/src/components/tabs/TabHeader.tsx`
- `apps/app/src/components/breed/tabs/*Tab.tsx`

**Routing:**
- `apps/app/src/router/AppRouter.tsx`
- `apps/app/src/pages/SlugResolver.tsx`

### Files to Create (Phase 8)

- `apps/app/src/pages/TabFullscreenResolver.tsx`
- `apps/app/src/pages/TabFullscreenPage.tsx`
- `apps/app/src/components/tabs/TabFullscreenContent.tsx`
- `apps/app/src/hooks/useInfiniteChildRecords.ts`
- `apps/app/src/components/shared/InfiniteScrollTrigger.tsx`

---

## Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| Initial page load | < 500ms | ✅ OK |
| Tab switch | < 200ms | ✅ OK |
| Child table load | < 300ms | ⏳ Not measured |
| Infinite scroll batch | < 200ms | ⏳ Not implemented |

---

## Related Documents

- [PUBLIC_PAGE_ARCHITECTURE.md](./PUBLIC_PAGE_ARCHITECTURE.md) - Architecture decisions
- [CHILD_TABLES_ARCHITECTURE.md](./CHILD_TABLES_ARCHITECTURE.md) - Child tables storage
- [CHILD_TABLES_TODO.md](./CHILD_TABLES_TODO.md) - Child tables checklist
- [done/DYNAMIC_PUBLIC_PAGE_TODO.md](./done/DYNAMIC_PUBLIC_PAGE_TODO.md) - Completed work
