# Public Page Implementation TODO

**Active Checklist** - завдання для імплементації config-driven public pages

**Last Updated:** 2025-12-01

**Architecture Reference:** [PUBLIC_PAGE_ARCHITECTURE.md](./PUBLIC_PAGE_ARCHITECTURE.md)

---

## Current Status

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 1 | ⏳ Pending | RxDB Child Tables Foundation |
| Phase 2 | ✅ Complete | Page Template Core (via DYNAMIC_PUBLIC_PAGE_TODO) |
| Phase 3 | ✅ Partial | Config Structure (tabs have metadata) |
| Phase 4 | ✅ Complete | Routing & Modes (drawer/fullscreen work) |
| Phase 5 | ✅ Complete | Migration breed page |
| Phase 6 | ⏳ Pending | Testing & Validation |
| Phase 7 | ⏳ Pending | Expand to all entities |

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

## Remaining Work

### Phase 1: Child Tables Data Layer ⏳

**Goal**: Connect UI to real child data (not mocks)

See: [CHILD_TABLES_TODO.md](./CHILD_TABLES_TODO.md)

- [ ] Integrate breed_children collection with SpaceStore
- [ ] Implement `loadChildRecords()` in SpaceStore
- [ ] Create `useChildRecords` hook
- [ ] Connect to real Supabase data

### Phase 6: Testing & Validation ⏳

**Goal**: Comprehensive test coverage

- [ ] Unit tests for ComponentRegistry
- [ ] Config validation tests
- [ ] Integration tests for config → rendering flow
- [ ] E2E tests for user flows
- [ ] CI/CD integration

### Phase 7: Expand to Other Entities ⏳

**Goal**: Roll out to all main entities

- [ ] Pet page config
- [ ] Kennel page config
- [ ] Account page config
- [ ] Contact page config
- [ ] Other entities (10+)

---

## Tab Fullscreen Mode ⏳

**Not yet implemented:**

- [ ] `?mode=tab-fullscreen` query param handling
- [ ] Full data loading (no recordsLimit)
- [ ] Pagination for 1000+ records
- [ ] Tab navigation in fullscreen

### URL Structure

```
/:id#divisions?mode=tab-fullscreen
```

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
- `apps/app/src/components/breed/tabs/*Tab.tsx`

### Files to Create

- `apps/app/src/hooks/useChildRecords.ts` - Hook for child data
- `scripts/validate-page-configs.ts` - Config validation

---

## Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| Initial page load | < 500ms | ✅ OK |
| Tab switch | < 200ms | ✅ OK |
| Child table load | < 300ms | ⏳ Not measured |

---

## Related Documents

- [PUBLIC_PAGE_ARCHITECTURE.md](./PUBLIC_PAGE_ARCHITECTURE.md) - Architecture decisions
- [CHILD_TABLES_ARCHITECTURE.md](./CHILD_TABLES_ARCHITECTURE.md) - Child tables storage
- [CHILD_TABLES_TODO.md](./CHILD_TABLES_TODO.md) - Child tables checklist
- [done/DYNAMIC_PUBLIC_PAGE_TODO.md](./done/DYNAMIC_PUBLIC_PAGE_TODO.md) - Completed work
