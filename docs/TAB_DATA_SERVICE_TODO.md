# Tab Data Service - Implementation TODO

**Created:** 2025-12-11
**Updated:** 2025-12-13
**Related:** [TAB_DATA_SERVICE_ARCHITECTURE.md](./TAB_DATA_SERVICE_ARCHITECTURE.md)

---

## Phase 1: Core Infrastructure ✅ DONE

### 1.1 Types
- [x] Create `packages/rxdb-store/src/types/tab-data.types.ts`
  - [x] `OrderConfig` interface
  - [x] `ChildTableConfig` interface
  - [x] `DictionaryMergeConfig` interface
  - [x] `MainEntityConfig` interface
  - [x] `RpcConfig` interface
  - [x] `DataSourceConfig` interface (main)
  - [x] `TabDataResult` interface
  - [x] `UseTabDataOptions` interface
  - [x] `MergedDictionaryItem` interface
  - [x] `EnrichedChildItem` interface

### 1.2 TabDataService
- [x] Create `packages/rxdb-store/src/services/tab-data.service.ts`
  - [x] `loadTabData()` - main router method
  - [x] `loadChild()` - simple child table
  - [x] `loadChildView()` - VIEW for partitioned tables
  - [x] `loadChildWithDictionary()` - child + dictionary merge
  - [x] `loadMainFiltered()` - main entity with filter
  - [x] `loadRpc()` - Supabase RPC function
  - [x] Helper: `applyFilter()`
  - [x] Helper: `sortRecords()`
  - [x] Helper: `mergeDictWithChildren()`
  - [x] Helper: `enrichChildrenWithDict()`
  - [x] Export singleton `tabDataService`

### 1.3 Hook
- [x] Create `packages/rxdb-store/src/hooks/useTabData.ts`
  - [x] Wait for SpaceStore initialization
  - [x] Call `tabDataService.loadTabData()`
  - [x] Handle loading/error states
  - [x] Implement `refetch()` function
  - [x] Proper cleanup on unmount

### 1.4 Exports
- [x] Update `packages/rxdb-store/src/index.ts`
  - [x] Export `tabDataService`
  - [x] Export `useTabData` hook
  - [x] Export types from `tab-data.types.ts`

### 1.5 Pass dataSource to components
- [x] Update `TabOutletRenderer.tsx` - add `dataSource` to TabConfig
- [x] Update `TabsContainer.tsx` - add `dataSource` to Tab interface and pass to components

---

## Phase 2: Migrate BreedAchievementsTab ✅ DONE

### 2.1 Update Tab Config
- [x] Update achievements tab config in app_config
  ```json
  {
    "dataSource": {
      "type": "child_with_dictionary",
      "childTable": {
        "table": "achievement_in_breed",
        "parentField": "breed_id"
      },
      "dictionary": {
        "table": "achievement",
        "additionalFields": ["int_value", "position", "description", "entity"],
        "filter": { "entity": "breed" },
        "orderBy": [{ "field": "position", "direction": "asc" }],
        "showAll": true,
        "linkField": "achievement_id"
      }
    }
  }
  ```

### 2.2 Refactor Component
- [x] Remove manual `useChildRecords` call
- [x] Remove manual `dictionaryStore.getDictionary` call
- [x] Remove `useMemo` merge logic
- [x] Add `useTabData` with `dataSource` prop
- [x] Update data mapping for timeline items
- [x] Test achievements display
- [x] Test achieved/not-achieved states
- [x] Test loading state
- [x] Test error state

---

## Phase 3: Migrate BreedPatronsTab ✅ DONE

### 3.1 Database Migration
- [x] Create `20251211_create_top_patron_view.sql` migration
- [x] Apply migration to database
  - Creates `top_patron_in_breed_with_contact` VIEW
  - Embeds contact data as JSONB
  - Synthetic UUID from composite key (md5)

### 3.2 Update Tab Config
- [x] Update patrons tab config in app_config
  ```json
  {
    "dataSource": {
      "type": "child_view",
      "childTable": {
        "table": "top_patron_in_breed_with_contact",
        "parentField": "breed_id",
        "orderBy": [{ "field": "placement", "direction": "asc" }],
        "limit": 20
      }
    }
  }
  ```

### 3.3 Refactor Component
- [x] Remove mock data
- [x] Add `useTabData` with `dataSource` prop
- [x] Update data mapping for patron avatars
- [x] Handle embedded `contact` JSONB field
- [x] Test patrons display
- [x] Test empty state
- [x] Test loading state

### 3.4 Fullscreen Support
- [x] Add dataSource passing to TabPageTemplate for fullscreen mode
- [x] Conditional fullscreen button (show only when records >= limit)

---

## Phase 4: Additional Tab Types

### 4.1 Simple Child Type
- [ ] Find/create a tab using simple child table
- [ ] Update config with `type: "child"`
- [ ] Test data loading

### 4.2 Main Filtered Type
- [ ] Find/create a tab for "Top Kennels" or similar
- [ ] Update config with `type: "main_filtered"`
- [ ] Verify `SpaceStore.applyFilters()` integration
- [ ] Test data loading

### 4.3 RPC Type (if needed)
- [ ] Create Supabase RPC function for statistics
- [ ] Add config with `type: "rpc"`
- [ ] Implement caching strategy
- [ ] Test data loading

---

## Phase 5: Cleanup

### 5.1 Remove Old Code
- [ ] Audit components for manual data loading
- [ ] Remove unused `useChildRecords` calls (if all migrated)
- [ ] Remove duplicate merge logic
- [ ] Clean up unused imports

### 5.2 Documentation
- [ ] Update CORE_PRINCIPLES.md with TabDataService reference
- [ ] Add examples to component documentation
- [ ] Document config structure in config-admin

---

## Phase 6: Testing

### 6.1 Unit Tests
- [ ] Test `TabDataService.loadChild()`
- [ ] Test `TabDataService.loadChildWithDictionary()`
- [ ] Test `TabDataService.mergeDictWithChildren()`
- [ ] Test `TabDataService.applyFilter()`
- [ ] Test `TabDataService.sortRecords()`

### 6.2 Integration Tests
- [ ] Test achievements tab end-to-end
- [ ] Test patrons tab end-to-end
- [ ] Test offline fallback behavior
- [ ] Test cache reuse (ID-First)

### 6.3 Manual Testing
- [x] Test achievements tab - WORKS
- [ ] Test on slow network
- [ ] Test offline mode
- [ ] Test tab switching
- [ ] Test data refresh

---

## Completion Criteria

- [ ] All existing tabs migrated to config-driven approach
- [x] No direct Supabase calls in tab components (achievements done)
- [x] All data flows through RxDB (Local-First)
- [x] Tab configs define all data loading behavior
- [ ] New tabs can be added via JSON config only
- [ ] Documentation complete

---

## Notes

### Existing Code to Preserve
- `SpaceStore.loadChildRecords()` - works, don't modify
- `SpaceStore.getChildRecords()` - works, don't modify
- `DictionaryStore.getDictionary()` - works, don't modify
- `useChildRecords` hook - keep for backwards compatibility

### Potential Issues
- Dictionary filter uses `additional` field format - handle both formats
- Child records also use `additional` field - consistent access pattern
- VIEW data structure differs from regular table - test thoroughly

### Performance Considerations
- Dictionary caching is handled by DictionaryStore
- Child caching is handled by SpaceStore
- TabDataService only orchestrates, no additional caching layer
