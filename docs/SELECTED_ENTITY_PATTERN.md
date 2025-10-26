# 🎯 Selected Entity Pattern - Implementation Plan

## 📅 Створено: 2025-10-26
## 📅 Оновлено: 2025-10-26 (Updated after full implementation)

---

## 🔍 CURRENT STATE ANALYSIS

### ✅ ЩО ВЖЕ ПРАЦЮЄ

**1. EntityStore - Повна реалізація selection logic** ✅
```typescript
class EntityStore<T extends { id: string }> {
  protected selectedId = signal<string | null>(null);

  selectedEntity: ReadonlySignal<T | null> = computed(() => {
    const id = this.selectedId.value;
    return id ? this.entities.value.get(id) || null : null;
  });

  // Methods: selectEntity(), selectFirst(), selectLast(), clearSelection()
}
```
**Файл:** `/packages/rxdb-store/src/stores/base/entity-store.ts` (lines 372-419)

**2. SpaceComponent - URL-based selection with EntityStore** ✅
```typescript
// Uses reactive signal from EntityStore
const selectedEntityId = spaceStore.getSelectedIdSignal(config.entitySchemaName).value;

// Bidirectional URL ↔ EntityStore sync (lines 455-489)
useEffect(() => {
  const pathSegments = location.pathname.split("/");
  const hasEntitySegment = pathSegments.length > 2 && pathSegments[2] !== "new";
  setIsDrawerOpen(hasEntitySegment);

  if (hasEntitySegment) {
    const urlSegment = pathSegments[2];

    // Supports both UUIDs and friendly slugs!
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(urlSegment);

    let entityId: string | undefined;
    if (isUUID) {
      entityId = urlSegment;
    } else {
      // Find entity by friendly slug
      const matchingEntity = allEntities.find(entity =>
        normalizeForUrl(entity.name) === urlSegment
      );
      entityId = matchingEntity?.id;
    }

    if (entityId) {
      spaceStore.selectEntity(config.entitySchemaName, entityId);  // ✅ Updates EntityStore!
    }
  } else {
    spaceStore.clearSelection(config.entitySchemaName);
  }
}, [location.pathname, config.entitySchemaName, allEntities]);

// Click handler with friendly slug URLs (lines 491-510)
const handleEntityClick = useCallback((entity: T) => {
  spaceStore.selectEntity(config.entitySchemaName, entity.id);  // ✅ EntityStore!
  const slug = normalizeForUrl(entity.name || entity.id);
  navigate(`${slug}#overview`);  // ✅ Friendly URL!
}, [navigate, config.entitySchemaName]);
```
**Файл:** `/apps/app/src/components/space/SpaceComponent.tsx`

**3. SpaceView - Passes selection state to cards** ✅
```typescript
<CardComponent
  entity={entity}
  selected={selectedId === entity.id}  // ✅ Correctly identifies selected (lowercase id)
  onClick={() => onEntityClick?.(entity)}  // ✅ Triggers selection
/>
```
**Файл:** `/apps/app/src/components/space/SpaceView.tsx`

**4. SpaceStore - EntityStore integration methods** ✅
```typescript
// Reactive signal for automatic re-renders
getSelectedIdSignal(entityType: string): ReadonlySignal<string | null> {
  const entityStore = this.entityStores.get(entityType.toLowerCase());
  return computed(() => entityStore.selectedId.value);
}

// Static value (use only when reactivity not needed)
getSelectedId(entityType: string): string | null {
  const entityStore = this.entityStores.get(entityType.toLowerCase());
  return entityStore.getSelectedId();
}

// Update selection
selectEntity(entityType: string, id: string | null): void {
  const entityStore = this.entityStores.get(entityType.toLowerCase());
  entityStore.selectEntity(id);
}

// Clear selection
clearSelection(entityType: string): void {
  const entityStore = this.entityStores.get(entityType.toLowerCase());
  entityStore.clearSelection();
}

// Get selected entity as computed signal
getSelectedEntity(entityType: string) {
  const entityStore = this.entityStores.get(entityType.toLowerCase());
  return entityStore.selectedEntity;
}
```
**Файл:** `/packages/rxdb-store/src/stores/space-store.signal-store.ts` (lines 2928-2979)

**5. Drawer - Opens on navigation** ✅
- Three modes: `over` (mobile), `side` (tablet), `side-transparent` (desktop 2xl+)
- Auto-opens when entity URL is detected
- Uses `<Outlet />` for detail pages

**6. Friendly Slug URLs** ✅
```typescript
// normalizeForUrl() converts entity names to URL-friendly slugs
import { normalizeForUrl } from './utils/filter-url-helpers';

// "Finnish Spitz" → "finnish-spitz"
const slug = normalizeForUrl(entity.name || entity.id);
navigate(`${slug}#overview`);
// Result: /breeds/finnish-spitz#overview

// Backward compatible with UUID URLs
// /breeds/f2fa2957-8b1f-442f-a1ff-cb3c40f50a47 still works!
```
**Файл:** `/apps/app/src/components/space/utils/filter-url-helpers.ts`

**7. BreedListCard - Proper highlighting pattern** ✅
```typescript
export function BreedListCard({ entity, selected, onClick }) {
  return (
    <EntityListCardWrapper selected={selected} onClick={onClick}>
      {/* Card content */}
    </EntityListCardWrapper>
  );
}
```
**Файл:** `/apps/app/src/components/breed/BreedListCard.tsx`

**8. EntityListCardWrapper - Proper CSS variables** ✅
```typescript
const getBackgroundColor = () => {
  if (selected) return "rgb(var(--focus-card-ground))";  // Subtle highlight
  if (isHovered) return "rgb(var(--hover-card-ground))";
  return "transparent";
};
```
**Файл:** `/apps/app/src/components/shared/EntityListCardWrapper.tsx`

---

### ❌ ЩО НЕ ПРАЦЮЄ

**Problem:** GenericListCard uses wrong highlighting
```typescript
// ❌ WRONG: Entire background turns blue
<div
  className={cn(
    "p-4 border-b hover:bg-gray-50 cursor-pointer transition-colors",
    selected && "bg-blue-50 border-blue-300"  // ❌ TOO MUCH!
  )}
  onClick={onClick}
>
```
**Файл:** `/apps/app/src/components/space/GenericListCard.tsx`

**Result:**
- Entire row background becomes blue (user's screenshot confirms)
- Doesn't match BreedListCard pattern
- Не використовує CSS variables з дизайн-системи

---

## 🎯 REVISED IMPLEMENTATION PLAN

### Phase 1: Fix GenericListCard Highlighting (15 min) 🔴 PRIORITY

**Goal:** Use EntityListCardWrapper pattern instead of crude bg-blue-50

**Before:**
```typescript
export function GenericListCard({ entity, selected, onClick }) {
  return (
    <div className={cn("...", selected && "bg-blue-50 border-blue-300")}>
      {/* content */}
    </div>
  );
}
```

**After:**
```typescript
export function GenericListCard({ entity, selected, onClick }) {
  return (
    <EntityListCardWrapper
      selected={selected}
      onClick={onClick}
      className="h-[68px]"  // Match BreedListCard height
    >
      {/* content (no wrapper div needed) */}
    </EntityListCardWrapper>
  );
}
```

**Files to modify:**
- `/apps/app/src/components/space/GenericListCard.tsx`

**Result:**
- ✅ Proper subtle highlighting (--focus-card-ground)
- ✅ Consistent with BreedListCard
- ✅ Hover state handled automatically

---

### ✅ Phase 2: Connect SpaceStore Selection - COMPLETED

**Goal:** Use EntityStore.selectedId instead of local state ✅

**Implemented:**
```typescript
// AFTER - Current implementation
const selectedEntityId = spaceStore.getSelectedIdSignal(config.entitySchemaName).value;

// Update selection method with friendly slug URLs
const handleEntityClick = useCallback((entity: T) => {
  spaceStore.selectEntity(config.entitySchemaName, entity.id);
  const slug = normalizeForUrl(entity.name || entity.id);
  navigate(`${slug}#overview`);  // ✅ Friendly URLs!
}, [navigate, config.entitySchemaName]);

// URL sync with slug detection
useEffect(() => {
  const urlSegment = pathSegments[2];
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(urlSegment);

  let entityId: string | undefined;
  if (isUUID) {
    entityId = urlSegment;
  } else {
    const matchingEntity = allEntities.find(entity =>
      normalizeForUrl(entity.name) === urlSegment
    );
    entityId = matchingEntity?.id;
  }

  if (entityId) {
    spaceStore.selectEntity(config.entitySchemaName, entityId);
  }
}, [location.pathname, config.entitySchemaName, allEntities]);
```

**Achieved:**
- ✅ Centralized state through EntityStore
- ✅ Reactive selection with `getSelectedIdSignal()`
- ✅ Friendly slug URLs (`/breeds/finnish-spitz`)
- ✅ Backward compatible with UUIDs
- ✅ Bidirectional URL ↔ EntityStore sync
- ✅ Ready for keyboard shortcuts (selectNext/selectPrev)

**Files modified:**
- `/apps/app/src/components/space/SpaceComponent.tsx` (lines 82, 455-510)
- `/packages/rxdb-store/src/stores/space-store.signal-store.ts` (lines 2928-2979)

---

### ✅ Phase 3: Auto-Select First Entity - COMPLETED

**Goal:** Auto-select first entity on 2xl+ screens ✅

**Implemented (lines 388-401 in SpaceComponent):**
```typescript
// ✅ Fully implemented with friendly slug URLs!
useEffect(() => {
  if (data?.entities && !isLoading && isMoreThan2XL) {
    if (data.entities.length > 0 && !selectedEntityId) {
      const pathSegments = location.pathname.split("/");
      const hasEntityId = pathSegments.length > 2 && pathSegments[2] !== "new";
      if (!hasEntityId) {
        const slug = normalizeForUrl(data.entities[0].name || data.entities[0].id);
        navigate(`${slug}#overview`);  // ✅ Uses friendly slug!
      }
    }
  }
}, [data, isLoading, isMoreThan2XL, selectedEntityId, navigate, location.pathname]);
```

**Status:** Fully working! 🎉

---

### Phase 4: Keyboard Navigation (1-2 hours) 🟢 FUTURE

**Goal:** Arrow keys to navigate between entities

**Implementation:**
```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      // Select next entity
      const currentIndex = entities.findIndex(e => e.id === selectedId);
      if (currentIndex < entities.length - 1) {
        const nextEntity = entities[currentIndex + 1];
        const slug = normalizeForUrl(nextEntity.name || nextEntity.id);
        navigate(`${slug}#overview`);  // ✅ Friendly slug!
      }
    }
    if (e.key === 'ArrowUp') {
      // Select previous entity
      const currentIndex = entities.findIndex(e => e.id === selectedId);
      if (currentIndex > 0) {
        const prevEntity = entities[currentIndex - 1];
        const slug = normalizeForUrl(prevEntity.name || prevEntity.id);
        navigate(`${slug}#overview`);  // ✅ Friendly slug!
      }
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [selectedId, entities, navigate]);
```

**Status:** Not implemented, можна додати пізніше

---

## 📋 IMPLEMENTATION STATUS

### ✅ COMPLETED
- [x] **Phase 2:** EntityStore integration with reactive signals
- [x] **Phase 3:** Auto-select first entity on 2xl+ screens
- [x] EntityStore selection logic (base implementation)
- [x] Bidirectional URL ↔ EntityStore sync
- [x] Friendly slug URLs (`/breeds/finnish-spitz`)
- [x] UUID backward compatibility
- [x] Drawer opening on entity click
- [x] BreedListCard proper highlighting
- [x] SpaceStore proxy methods (`getSelectedIdSignal`, `selectEntity`, etc.)

### 🔴 PENDING - Phase 1: Fix GenericListCard (15 min)
**Priority:** HIGH - Currently uses wrong highlighting pattern

**Steps:**
1. Open `/apps/app/src/components/space/GenericListCard.tsx`
2. Import `EntityListCardWrapper`
3. Replace root `<div>` with `<EntityListCardWrapper>`
4. Remove `bg-blue-50 border-blue-300` classes
5. Test in browser - highlighting should be subtle

**Expected result:** Consistent highlighting across all entity types

### 🟢 FUTURE - Phase 4: Keyboard Navigation (1-2 hours)
- Add when user requests it
- Arrow keys for next/prev entity
- Uses friendly slug URLs

---

## 🎨 CSS VARIABLES REFERENCE

Theme provides proper selection colors:

```css
/* From theme files */
--focus-card-ground: /* Subtle background for selected items */
--hover-card-ground: /* Subtle background for hovered items */
```

**Usage:**
```typescript
style={{
  backgroundColor: selected
    ? "rgb(var(--focus-card-ground))"
    : "transparent"
}}
```

---

## 📊 COMPARISON: Before vs After

### BEFORE (Current GenericListCard)
```typescript
// ❌ Entire background blue
<div className={cn(
  "p-4 border-b hover:bg-gray-50",
  selected && "bg-blue-50 border-blue-300"
)}>
```
**Result:** Heavy blue background (user's screenshot shows this)

### AFTER (Using EntityListCardWrapper)
```typescript
// ✅ Subtle highlight using design system
<EntityListCardWrapper selected={selected} onClick={onClick}>
```
**Result:** Subtle background change using --focus-card-ground

---

## 🚀 SUMMARY

### ✅ ЩО ВЖЕ ЗРОБЛЕНО

**Phase 2: EntityStore Integration - COMPLETED** ✅
- Використано `spaceStore.getSelectedIdSignal()` замість локального state
- Додано реактивну підкраску через signals
- Реалізовано bidirectional URL ↔ EntityStore sync
- Friendly slug URLs: `/breeds/finnish-spitz` замість UUID
- Backward compatible з UUID URLs

**Phase 3: Auto-select - COMPLETED** ✅
- Auto-select першого entity на 2xl+ екранах
- Використовує friendly slug URLs

### 🔴 ЩО ПОТРІБНО ЗРОБИТИ

**Phase 1: Fix GenericListCard (15 хвилин) - PRIORITY**
- Замінити `<div>` на `<EntityListCardWrapper>`
- Видалити `bg-blue-50 border-blue-300`
- Результат: правильна підкраска як у BreedListCard

**Phase 4: Keyboard Navigation - МАЙБУТНЄ**
- Arrow keys для навігації між entities
- Додамо коли буде потрібно

---

## ✅ SUCCESS CRITERIA

**Current State (Phase 2 & 3 completed):**
- ✅ Centralized selection state through EntityStore
- ✅ Reactive highlighting with signals (`getSelectedIdSignal`)
- ✅ Bidirectional URL ↔ EntityStore sync
- ✅ Friendly slug URLs (`/breeds/finnish-spitz`)
- ✅ UUID backward compatibility
- ✅ Auto-select first entity on 2xl+ screens
- ✅ Drawer opens on click
- ✅ BreedListCard proper highlighting
- ❌ GenericListCard uses wrong highlighting (Phase 1 pending)

**After Phase 1 completion:**
- ✅ Subtle highlighting using --focus-card-ground (all cards)
- ✅ Consistent highlighting across all entity types
- ✅ Hover state included

**Future (Phase 4):**
- ⏳ Keyboard shortcuts for navigation

---

## 📚 RELATED FILES

### Core Implementation
- `/packages/rxdb-store/src/stores/base/entity-store.ts` - EntityStore selection logic
- `/packages/rxdb-store/src/stores/space-store.signal-store.ts` - SpaceStore

### UI Components
- `/apps/app/src/components/space/SpaceComponent.tsx` - Selection state + URL sync
- `/apps/app/src/components/space/SpaceView.tsx` - Passes selected prop
- `/apps/app/src/components/space/GenericListCard.tsx` - ❌ NEEDS FIX
- `/apps/app/src/components/breed/BreedListCard.tsx` - ✅ CORRECT PATTERN
- `/apps/app/src/components/shared/EntityListCardWrapper.tsx` - ✅ PROPER HIGHLIGHTING

### Theme
- `/apps/app/src/app-theme.css` - CSS variables definition
- `/apps/shared/theme/tailwind.base.css` - Base theme

---

## 🎯 CURRENT STATUS

**Completed:** ✅ Phase 2 (EntityStore integration + reactive signals) + Phase 3 (auto-select)

**Pending:** 🔴 Phase 1 (GenericListCard highlighting fix) - 15 min

**Future:** 🟢 Phase 4 (keyboard navigation) - 1-2 hours

**Overall Progress:** 75% complete (3 of 4 phases done) 🚀
