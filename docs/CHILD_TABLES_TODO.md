# Child Tables Implementation TODO

**Active Checklist** - завдання для імплементації child tables

**Last Updated:** 2025-12-01

**Architecture Reference:** [CHILD_TABLES_ARCHITECTURE.md](./CHILD_TABLES_ARCHITECTURE.md)

---

## Current Status

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 0 | ✅ Partial | Config structure created |
| Phase 1 | ✅ Complete | Schema generation for breed_children |
| Phase 2 | ⏳ Pending | Collection management |
| Phase 3 | ⏳ Pending | Data loading API |
| Phase 4 | ⏳ Pending | UI integration |
| Phase 5 | ⏳ Pending | Testing |
| Phase 6 | ⏳ Pending | Rollout |
| Phase 7 | ⏳ Pending | Optimization |

---

## Phase 0: Preparation ✅ PARTIAL

**Goal**: Extension config structure

### Completed ✅
- [x] Created extension config directory: `apps/config-admin/src/data/extensions/`
- [x] Created `breed_children.json` with achievement_in_breed

### Deferred ⏳
- [ ] Extension config generator script (`scripts/generate-child-table-configs.cjs`)
- [ ] Add to config regeneration workflow

---

## Phase 1: Schema Generation ✅ COMPLETE

**Goal**: RxDB union schemas from extension configs

### Completed ✅
- [x] Created `breed-children.schema.ts` with union schema
- [x] Added meta fields: `_table_type`, `_parent_id`
- [x] Added indexes: `['_parent_id', '_table_type']`
- [x] Included all 17 breed child table types
- [x] Schema supports achievement_in_breed fields

### Files Created
- `/packages/rxdb-store/src/collections/breed-children.schema.ts`
- `/apps/config-admin/src/data/extensions/breed_children.json`

### Deferred ⏳
- [ ] ChildCollectionSchemaGenerator utility (manual for now)

---

## Phase 2: Collection Management ⏳ PENDING

**Goal**: Lazy collection creation on-demand

### Tasks
- [ ] Add `ensureChildCollection(entityType)` to SpaceStore
- [ ] Lazy creation: only when first accessed
- [ ] Track created collections (avoid duplicates)
- [ ] Do NOT create child collections on SpaceInitializer.init()

### Code Location
`packages/rxdb-store/src/stores/space-store.signal-store.ts`

### Success Criteria
- [ ] Child collections created only when needed
- [ ] No duplicate collection creation
- [ ] Collections persist during session
- [ ] Main collections unaffected

---

## Phase 3: Data Loading ⏳ PENDING

**Goal**: Load child data for specific entity with limits

### Tasks
- [ ] Add `loadChildRecords(parentId, tableType, options)` - Load from Supabase
- [ ] Add `getChildRecords(parentId, tableType, options)` - Query from RxDB
- [ ] Add `subscribeToChildRecords(parentId, tableType, callback)` - RxDB subscription
- [ ] PostgREST query builder with parent_id filter
- [ ] Data transformation: add `_table_type` and `_parent_id` fields

### Success Criteria
- [ ] Child data loads only for selected entity
- [ ] Limit and orderBy from config applied
- [ ] Data properly transformed with meta fields
- [ ] Queries perform efficiently with indexes

---

## Phase 4: UI Integration ⏳ PENDING

**Goal**: Connect child data loading to UI components

### Tasks
- [ ] Create `useChildRecords` React hook
  - Location: `apps/app/src/hooks/useChildRecords.ts`
  - Takes parentId, tableType, dataConfig
  - Loads on mount or tab selection
  - Subscribes to RxDB changes

- [ ] Update TabOutlet components
  - Read childTable config from block config
  - Use useChildRecords hook
  - Pass records to child component

- [ ] Add loading states
  - Skeleton while loading
  - Error handling
  - Empty state

### Success Criteria
- [ ] Child records load when tab selected
- [ ] Loading states work properly
- [ ] RxDB subscriptions update UI automatically
- [ ] No unnecessary re-renders

---

## Phase 5: Testing ⏳ PENDING

**Goal**: Validate with real child tables

### Tasks
- [ ] Test with breed_division table
- [ ] Test with breed_in_kennel table
- [ ] Performance testing (collection creation, queries)
- [ ] Test with large datasets (1000+ records)
- [ ] Error handling tests

### Success Criteria
- [ ] Both test tables work correctly
- [ ] Performance acceptable (<100ms queries)
- [ ] No memory leaks
- [ ] Errors handled gracefully

---

## Phase 6: Rollout ⏳ PENDING

**Goal**: Add more child tables gradually

### Wave 1: Simple child tables
- [ ] breed_division
- [ ] breed_in_kennel

### Wave 2: Child tables with relationships
- [ ] litter (has dam_id, sire_id references)
- [ ] pet_profile_in_competition

### Wave 3: Complex child tables
- [ ] breed_standard_section
- [ ] breeding_program_registration

### Per-Wave Checklist
1. [ ] Add table schema to extension config
2. [ ] Regenerate config
3. [ ] Create outlet component
4. [ ] Add to page config
5. [ ] Test thoroughly
6. [ ] Deploy

---

## Phase 7: Optimization ⏳ PENDING

**Goal**: Fine-tune performance and UX

### Tasks
- [ ] Smart preloading (first tab on page load)
- [ ] Batch loading (multiple child tables in single request)
- [ ] Pagination support (infinite scroll / load more)
- [ ] Offline support (keep in RxDB, sync when online)

### Success Criteria
- [ ] Page loads feel instant
- [ ] Tab switches smooth
- [ ] Data stays fresh
- [ ] Works offline

---

## Open Questions

### To Answer in Phase 4
1. How to distinguish child tables vs main entities in tab config?
   - Option A: `sourceType: 'child_table' | 'main_entity'`
   - Option B: Auto-detect based on table name
   - Option C: Different config properties (`childTable` vs `entity`)

2. Filter configuration for main entities in tabs?
3. Preload strategy for main entity tabs?
4. Sorting and pagination for main entity tabs?

---

## Quick Reference

### Files to Modify
- `packages/rxdb-store/src/stores/space-store.signal-store.ts` - SpaceStore methods
- `apps/app/src/hooks/useChildRecords.ts` - New hook (create)
- `apps/app/src/components/blocks/TabOutletRenderer.tsx` - Pass childTable config

### Existing Files
- `/packages/rxdb-store/src/collections/breed-children.schema.ts` - Schema
- `/apps/config-admin/src/data/extensions/breed_children.json` - Extension config

---

## Recommended Next Step

**Option A: UI First** ⚡ (RECOMMENDED)
1. Create tab component with mock data
2. Get visual feedback
3. Then implement data layer

**Option B: Backend First** 🔧
1. Phase 2: Collection Management
2. Phase 3: Data Loading
3. Phase 4: UI Integration
