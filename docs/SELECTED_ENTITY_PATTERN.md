# 🎯 Selected Entity Pattern - Implementation Plan

## 📅 Створено: 2025-10-26
## 📅 Оновлено: 2025-10-26 (Revised after UI analysis)

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

**2. SpaceComponent - URL-based selection** ✅
```typescript
// State
const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);

// Reads from URL (lines 450-460)
useEffect(() => {
  const pathSegments = location.pathname.split("/");
  const hasEntityId = pathSegments.length > 2 && pathSegments[2] !== "new";
  setIsDrawerOpen(hasEntityId);

  if (hasEntityId) {
    setSelectedEntityId(pathSegments[2]);  // ✅ Syncs with URL!
  }
}, [location.pathname]);

// Click handler (lines 478-485)
const handleEntityClick = useCallback((entity: T) => {
  setSelectedEntityId(entity.Id);
  navigate(`${entity.Id}#overview`);  // ✅ Updates URL + opens drawer!
}, [navigate]);
```
**Файл:** `/apps/app/src/components/space/SpaceComponent.tsx`

**3. SpaceView - Passes selection state to cards** ✅
```typescript
<CardComponent
  entity={entity}
  selected={selectedId === entity.Id}  // ✅ Correctly identifies selected
  onClick={() => onEntityClick?.(entity)}  // ✅ Triggers selection
/>
```
**Файл:** `/apps/app/src/components/space/SpaceView.tsx`

**4. Drawer - Opens on navigation** ✅
- Three modes: `over` (mobile), `side` (tablet), `side-transparent` (desktop 2xl+)
- Auto-opens when entity URL is detected
- Uses `<Outlet />` for detail pages

**5. BreedListCard - Proper highlighting pattern** ✅
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

**6. EntityListCardWrapper - Proper CSS variables** ✅
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

### Phase 2: Connect SpaceStore Selection (30 min) 🟡 ENHANCEMENT

**Goal:** Use EntityStore.selectedId instead of local state

**Current:** SpaceComponent має власний `selectedEntityId` state
**Better:** Використати `spaceStore.selectEntity()` methods

**Changes in SpaceComponent:**
```typescript
// BEFORE
const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);

// AFTER
const selectedId = spaceStore.getSelectedId(config.entitySchemaName);

// Update selection method
const handleEntityClick = useCallback((entity: T) => {
  spaceStore.selectEntity(config.entitySchemaName, entity.Id);
  navigate(`${entity.Id}#overview`);
}, [navigate, config.entitySchemaName]);
```

**Benefits:**
- ✅ Centralized state (спільний з іншими компонентами)
- ✅ Could use in other contexts (e.g., keyboard shortcuts)
- ✅ Could add selectNext()/selectPrev() for arrow keys

**Files to modify:**
- `/apps/app/src/components/space/SpaceComponent.tsx`
- `/packages/rxdb-store/src/stores/space-store.signal-store.ts` (if needed)

---

### Phase 3: Auto-Select First Entity (15 min) 🟢 NICE-TO-HAVE

**Goal:** Auto-select first entity on 2xl+ screens (already partially implemented!)

**Current state (lines 391-398 in SpaceComponent):**
```typescript
// ✅ Already implemented!
if (isMoreThan2XL && data.entities.length > 0 && !selectedEntityId) {
  const pathSegments = location.pathname.split("/");
  const hasEntityId = pathSegments.length > 2 && pathSegments[2] !== "new";
  if (!hasEntityId) {
    navigate(`${data.entities[0].Id}#overview`);
  }
}
```

**What's missing:** Nothing! This already works! 🎉

---

### Phase 4: Keyboard Navigation (1-2 hours) 🟢 FUTURE

**Goal:** Arrow keys to navigate between entities

**Implementation:**
```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      // Select next entity
      const currentIndex = entities.findIndex(e => e.Id === selectedId);
      if (currentIndex < entities.length - 1) {
        const nextEntity = entities[currentIndex + 1];
        navigate(`${nextEntity.Id}#overview`);
      }
    }
    if (e.key === 'ArrowUp') {
      // Select previous entity
      const currentIndex = entities.findIndex(e => e.Id === selectedId);
      if (currentIndex > 0) {
        const prevEntity = entities[currentIndex - 1];
        navigate(`${prevEntity.Id}#overview`);
      }
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [selectedId, entities, navigate]);
```

**Status:** Not implemented, можна додати пізніше

---

## 📋 STEP-BY-STEP IMPLEMENTATION

### ✅ Already Working (No action needed)
- [x] EntityStore selection logic
- [x] URL-based selectedId management
- [x] Drawer opening on entity click
- [x] Auto-select first on 2xl+ screens
- [x] BreedListCard proper highlighting

### 🔴 Phase 1: Fix GenericListCard (15 min) - DO NOW
1. Open `/apps/app/src/components/space/GenericListCard.tsx`
2. Import `EntityListCardWrapper`
3. Replace root `<div>` with `<EntityListCardWrapper>`
4. Remove `bg-blue-50 border-blue-300` classes
5. Test in browser - highlighting should be subtle

### 🟡 Phase 2: Connect SpaceStore (30 min) - OPTIONAL
1. Add `getSelectedId()` method to SpaceStore if missing
2. Replace local state in SpaceComponent
3. Update `handleEntityClick` to use `spaceStore.selectEntity()`
4. Test selection persistence

### 🟢 Phase 3: Auto-select (SKIP - Already done!)
- Nothing to do, already implemented in SpaceComponent lines 391-398

### 🟢 Phase 4: Keyboard Nav (FUTURE)
- Add when user requests it
- Estimated 1-2 hours

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

## 🚀 SUMMARY FOR USER

### ЩО ПОТРІБНО ЗРОБИТИ

**Phase 1: Fix GenericListCard (15 хвилин) - ЗАРАЗ**
- Замінити `<div>` на `<EntityListCardWrapper>`
- Видалити `bg-blue-50 border-blue-300`
- Результат: правильна підкраска як у BreedListCard

**Phase 2: Connect SpaceStore (30 хвилин) - ОПЦІОНАЛЬНО**
- Використати `spaceStore.selectedId` замість локального state
- Результат: централізований state, можливість додати keyboard navigation

**Phase 3: Auto-select - ВЖЕ ПРАЦЮЄ!**
- Нічого робити не потрібно ✅

**Phase 4: Keyboard Navigation - МАЙБУТНЄ**
- Arrow keys для навігації
- Додамо коли буде потрібно

---

## ✅ SUCCESS CRITERIA

**Before:**
- ❌ Entire row background blue when selected
- ❌ Inconsistent with BreedListCard pattern
- ❌ No design system colors

**After Phase 1:**
- ✅ Subtle highlighting using --focus-card-ground
- ✅ Consistent with BreedListCard
- ✅ Hover state included
- ✅ Drawer opens on click (already works!)

**After Phase 2 (optional):**
- ✅ Centralized selection state
- ✅ Could add keyboard shortcuts

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

**Status:** Ready for Phase 1 implementation (15 min fix) 🚀
