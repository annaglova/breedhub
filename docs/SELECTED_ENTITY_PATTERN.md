# 🎯 Selected Entity Pattern

## 📅 Створено: 2025-10-26

---

## 🎯 ЩО ЦЕ

**Selected Entity Pattern** - паттерн для роботи з активною/вибраною сутністю в UI.

**Принцип:** UI завжди має активну сутність (selected entity), яка використовується для:
- Деталей сутності (detail view)
- Редагування (edit form)
- Контекстних дій (delete, duplicate, etc.)
- Навігації (next/prev)

**Джерело:** Angular NgRx pattern `withSelectedId` + `withSelectedEntityWithFirstDefault`

---

## ✅ ЩО ВЖЕ Є В ENTITYSTORE

EntityStore **вже має повну імплементацію** selected entity pattern!

### Signals і Computed:

```typescript
class EntityStore<T extends { id: string }> {
  // Selection state (protected)
  protected selectedId = signal<string | null>(null);

  // Computed values (public readonly)
  selectedEntity: ReadonlySignal<T | null> = computed(() => {
    const id = this.selectedId.value;
    return id ? this.entities.value.get(id) || null : null;
  });

  hasSelection: ReadonlySignal<boolean> = computed(() =>
    this.selectedId.value !== null
  );
}
```

### Selection Methods:

```typescript
// Select entity by ID
selectEntity(id: string | null): void

// Select first entity
selectFirst(): void

// Select last entity
selectLast(): void

// Clear selection
clearSelection(): void

// Get selected ID
getSelectedId(): string | null
```

### Auto-Select Support:

```typescript
// setAll з auto-select first
setAll(entities: T[], autoSelectFirst = false): void

// Якщо autoSelectFirst = true:
//   - При завантаженні даних автоматично вибирається перша сутність
//   - Тільки якщо немає поточного selection
```

### Smart Selection Cleanup:

```typescript
// При видаленні сутності:
removeOne(id: string): void {
  // ...
  // Автоматично очищає selection якщо видалена сутність була selected
  if (this.selectedId.value === id) {
    this.selectedId.value = null;
  }
}

// При setAll():
setAll(entities: T[]): void {
  // ...
  // Очищає selection якщо selected entity відсутня в новому списку
  if (this.selectedId.value && !newEntities.has(this.selectedId.value)) {
    this.selectedId.value = null;
  }
}
```

---

## ❌ ЩО НЕ ВИКОРИСТОВУЄТЬСЯ (ЗАРАЗ)

### EntityStore має все, але UI не використовує:

```typescript
// ❌ Ніде не викликається
store.selectEntity(id);
store.selectFirst();

// ❌ Ніде не читається
const selected = store.selectedEntity.value;
const hasSelection = store.hasSelection.value;
```

### URL Params для Selection:

```typescript
// ❌ Немає синхронізації з URL
// URL: /breeds?id=breed-123  (selected breed)
// URL: /animals?id=animal-456  (selected animal)
```

### UI Components:

```typescript
// ❌ Немає компонентів для:
// - Detail view (показати деталі selected entity)
// - Edit form (редагувати selected entity)
// - Navigation (prev/next buttons)
```

---

## 🎨 USE CASES

### 1. Master-Detail Pattern

**Scenario:** Список breeds (master) + деталі breed (detail)

```
┌─────────────────────────────────────────────────────────┐
│ Breeds List                                             │
│ ┌──────────────────┐                                    │
│ │ Labrador        │ ← Selected (highlighted)            │
│ └──────────────────┘                                    │
│ ┌──────────────────┐                                    │
│ │ German Shepherd  │                                    │
│ └──────────────────┘                                    │
│ ┌──────────────────┐                                    │
│ │ Golden Retriever │                                    │
│ └──────────────────┘                                    │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Breed Details                                           │
│                                                         │
│ Name: Labrador                                          │
│ Type: Dog                                               │
│ Size: Large                                             │
│                                                         │
│ [Edit] [Delete] [Duplicate]                             │
└─────────────────────────────────────────────────────────┘
```

### 2. Modal Edit Form

**Scenario:** Click на breed → відкривається modal з формою редагування

```typescript
// User clicks breed card
<BreedCard onClick={() => {
  store.selectEntity(breed.id);
  openEditModal();
}} />

// Modal shows selected breed
<EditBreedModal
  breed={store.selectedEntity.value}
  onSave={handleSave}
/>
```

### 3. Keyboard Navigation

**Scenario:** Arrow keys для навігації між entities

```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      selectNext();
    } else if (e.key === 'ArrowUp') {
      selectPrev();
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, []);
```

### 4. Context Actions

**Scenario:** Дії з selected entity (delete, duplicate, share)

```typescript
// Action buttons disabled якщо немає selection
<Button
  disabled={!store.hasSelection.value}
  onClick={() => deleteEntity(store.selectedEntity.value?.id)}
>
  Delete
</Button>

<Button
  disabled={!store.hasSelection.value}
  onClick={() => duplicateEntity(store.selectedEntity.value)}
>
  Duplicate
</Button>
```

### 5. Auto-Select First (Empty State Prevention)

**Scenario:** При завантаженні списку автоматично вибирається перша сутність

```typescript
// Load breeds and auto-select first
const breeds = await loadBreeds();
store.setAll(breeds, true);  // autoSelectFirst = true

// UI instantly shows details of first breed
// User doesn't see empty detail panel
```

---

## 🚀 PLAN ІМПЛЕМЕНТАЦІЇ

### Phase 1: URL Sync (Foundation) 🔴

**Goal:** Синхронізувати selectedId з URL params

**Implementation:**

```typescript
// SpaceComponent.tsx
export function SpaceComponent({ config }: SpaceComponentProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const store = spaceStore.getEntityStore(config.entitySchemaName);

  // Sync URL → Store (on mount & URL change)
  useEffect(() => {
    const selectedId = searchParams.get('id');

    if (selectedId) {
      // URL has id → select in store
      store.selectEntity(selectedId);
    } else {
      // No URL id → clear selection
      store.clearSelection();
    }
  }, [searchParams, store]);

  // Sync Store → URL (on selection change)
  useEffect(() => {
    const selectedId = store.getSelectedId();

    if (selectedId) {
      // Entity selected → update URL
      setSearchParams(prev => {
        prev.set('id', selectedId);
        return prev;
      });
    } else {
      // No selection → remove id from URL
      setSearchParams(prev => {
        prev.delete('id');
        return prev;
      });
    }
  }, [store.selectedEntity.value, setSearchParams]);

  return (
    <div>
      <EntitiesList />
      <EntityDetail />
    </div>
  );
}
```

**Benefits:**
- ✅ Deep linking (share URL з selected entity)
- ✅ Browser back/forward navigation
- ✅ Reload preserves selection

**Estimated:** 1-2 години

---

### Phase 2: UI Components (Visual Feedback) 🟡

**Goal:** Візуальна індикація selected entity

**Implementation:**

```typescript
// EntitiesList.tsx
export function EntitiesList() {
  const entities = useSignal(store.entityList);
  const selectedId = useSignal(store.getSelectedId);

  return (
    <div className="space-y-2">
      {entities.value.map(entity => (
        <EntityCard
          key={entity.id}
          entity={entity}
          isSelected={entity.id === selectedId.value}
          onClick={() => store.selectEntity(entity.id)}
        />
      ))}
    </div>
  );
}

// EntityCard.tsx
export function EntityCard({ entity, isSelected, onClick }: Props) {
  return (
    <div
      className={cn(
        'p-4 rounded-lg cursor-pointer transition-colors',
        isSelected
          ? 'bg-primary-50 border-2 border-primary'
          : 'bg-surface-100 hover:bg-surface-200'
      )}
      onClick={onClick}
    >
      <h3>{entity.name}</h3>
    </div>
  );
}
```

**Benefits:**
- ✅ Видно яка сутність вибрана
- ✅ Клік вибирає сутність
- ✅ Visual feedback

**Estimated:** 2-3 години

---

### Phase 3: Detail View (Master-Detail) 🟡

**Goal:** Окрема панель для деталей selected entity

**Implementation:**

```typescript
// EntityDetail.tsx
export function EntityDetail() {
  const selected = useSignal(store.selectedEntity);
  const hasSelection = useSignal(store.hasSelection);

  if (!hasSelection.value || !selected.value) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Select an item to view details
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-2xl font-bold">{selected.value.name}</h2>

      <div className="space-y-2">
        <DetailField label="Type" value={selected.value.type} />
        <DetailField label="Created" value={selected.value.created_at} />
        {/* ... more fields */}
      </div>

      <div className="flex gap-2">
        <Button onClick={handleEdit}>Edit</Button>
        <Button variant="destructive" onClick={handleDelete}>Delete</Button>
        <Button variant="outline" onClick={handleDuplicate}>Duplicate</Button>
      </div>
    </div>
  );
}
```

**Layout:**
```typescript
// SpaceComponent.tsx
<div className="grid grid-cols-[350px_1fr] gap-4">
  {/* Master */}
  <div className="border-r">
    <EntitiesList />
  </div>

  {/* Detail */}
  <div>
    <EntityDetail />
  </div>
</div>
```

**Benefits:**
- ✅ Master-Detail pattern
- ✅ Context actions (edit/delete/duplicate)
- ✅ Empty state handling

**Estimated:** 3-4 години

---

### Phase 4: Keyboard Navigation (UX Polish) 🟢

**Goal:** Arrow keys для навігації

**Implementation:**

```typescript
// useKeyboardNavigation.ts
export function useKeyboardNavigation(store: EntityStore<any>) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user typing in input
      if (e.target instanceof HTMLInputElement) return;

      const currentId = store.getSelectedId();
      const ids = store.ids.value;

      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        selectNext(currentId, ids, store);
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        selectPrev(currentId, ids, store);
      } else if (e.key === 'Home') {
        e.preventDefault();
        store.selectFirst();
      } else if (e.key === 'End') {
        e.preventDefault();
        store.selectLast();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [store]);
}

function selectNext(currentId: string | null, ids: string[], store: EntityStore<any>) {
  if (!currentId) {
    store.selectFirst();
    return;
  }

  const currentIndex = ids.indexOf(currentId);
  if (currentIndex < ids.length - 1) {
    store.selectEntity(ids[currentIndex + 1]);
  }
}

function selectPrev(currentId: string | null, ids: string[], store: EntityStore<any>) {
  if (!currentId) {
    store.selectLast();
    return;
  }

  const currentIndex = ids.indexOf(currentId);
  if (currentIndex > 0) {
    store.selectEntity(ids[currentIndex - 1]);
  }
}
```

**Usage:**
```typescript
// SpaceComponent.tsx
export function SpaceComponent({ config }: Props) {
  const store = spaceStore.getEntityStore(config.entitySchemaName);

  // Enable keyboard navigation
  useKeyboardNavigation(store);

  return (/* ... */);
}
```

**Benefits:**
- ✅ Швидка навігація без миші
- ✅ Power user feature
- ✅ Vim-style shortcuts (j/k)

**Estimated:** 2-3 години

---

### Phase 5: Auto-Select First (Empty State Fix) 🟢

**Goal:** Автоматично вибирати першу сутність при завантаженні

**Implementation:**

```typescript
// SpaceComponent.tsx
useEffect(() => {
  const loadData = async () => {
    const data = await spaceStore.applyFilters(entityType, filters, options);

    // Auto-select first if:
    // 1. Data loaded successfully
    // 2. Has entities
    // 3. No current selection
    // 4. No URL param 'id'
    const shouldAutoSelect =
      data.records.length > 0 &&
      !store.getSelectedId() &&
      !searchParams.get('id');

    if (shouldAutoSelect) {
      store.selectFirst();
    }
  };

  loadData();
}, [entityType, filters]);
```

**Benefits:**
- ✅ Не показує пусту detail панель
- ✅ Instant detail view
- ✅ Краща UX

**Estimated:** 1 година

---

## 📊 PRIORITY ROADMAP

### Рекомендований порядок:

1. **Phase 1: URL Sync** (1-2h) 🔴
   - Foundation для всього іншого
   - Deep linking
   - Reload persistence

2. **Phase 2: UI Components** (2-3h) 🟡
   - Візуальна індикація
   - Click handlers
   - Basic interaction

3. **Phase 3: Detail View** (3-4h) 🟡
   - Master-Detail layout
   - Context actions
   - Empty state

4. **Phase 5: Auto-Select** (1h) 🟢
   - Empty state fix
   - Better UX

5. **Phase 4: Keyboard Nav** (2-3h) 🟢
   - Power user feature
   - Nice to have

**Total Estimated:** 9-13 годин

---

## 💡 ВАЖЛИВІ ПРИНЦИПИ

### 1. Single Source of Truth: URL

```
URL (?id=breed-123)
  ↕ (sync)
EntityStore.selectedId
  ↕ (reactive)
UI (highlighted card)
```

**Чому URL?**
- ✅ Deep linking (share selected entity)
- ✅ Browser back/forward
- ✅ Reload preserves state

### 2. EntityStore Already Ready

**Не треба змінювати EntityStore!** Все вже є:
- ✅ selectedId signal
- ✅ selectedEntity computed
- ✅ Selection methods
- ✅ Auto-cleanup on delete

**Треба тільки використати в UI**

### 3. Auto-Select Defensive

```typescript
// Не auto-select якщо:
if (searchParams.get('id')) {
  // URL має конкретний id → не перезаписувати
  return;
}

// Auto-select тільки якщо немає URL params
if (!store.getSelectedId()) {
  store.selectFirst();
}
```

### 4. Clean Selection on Unmount

```typescript
useEffect(() => {
  return () => {
    // Optional: clear selection при unmount
    // (залежить від UX рішення)
    store.clearSelection();
  };
}, []);
```

---

## 🎯 ПРИКЛАДИ КОДУ

### Example 1: Simple List with Selection

```typescript
export function BreedsList() {
  const store = spaceStore.getEntityStore('breed');
  const breeds = useSignal(store.entityList);
  const selectedId = useSignal(store.getSelectedId);

  return (
    <div className="space-y-2">
      {breeds.value.map(breed => (
        <div
          key={breed.id}
          className={cn(
            'p-4 rounded cursor-pointer',
            breed.id === selectedId.value
              ? 'bg-primary-50 border-primary'
              : 'bg-surface-100'
          )}
          onClick={() => store.selectEntity(breed.id)}
        >
          {breed.name}
        </div>
      ))}
    </div>
  );
}
```

### Example 2: Detail Panel with Actions

```typescript
export function BreedDetail() {
  const store = spaceStore.getEntityStore('breed');
  const selected = useSignal(store.selectedEntity);

  if (!selected.value) {
    return <EmptyState message="Select a breed to view details" />;
  }

  const handleDelete = async () => {
    if (confirm('Delete this breed?')) {
      await deleteBreed(selected.value.id);
      store.removeOne(selected.value.id);
      // Auto-clears selection if deleted entity was selected
    }
  };

  return (
    <div className="p-6">
      <h2>{selected.value.name}</h2>
      <p>{selected.value.description}</p>

      <div className="flex gap-2 mt-4">
        <Button onClick={() => openEditModal(selected.value)}>
          Edit
        </Button>
        <Button variant="destructive" onClick={handleDelete}>
          Delete
        </Button>
      </div>
    </div>
  );
}
```

### Example 3: URL Sync

```typescript
export function SpaceComponent({ config }: Props) {
  const [searchParams, setSearchParams] = useSearchParams();
  const store = spaceStore.getEntityStore(config.entitySchemaName);

  // URL → Store
  useEffect(() => {
    const id = searchParams.get('id');
    if (id && store.hasEntity(id)) {
      store.selectEntity(id);
    }
  }, [searchParams]);

  // Store → URL
  useEffect(() => {
    const id = store.getSelectedId();

    if (id) {
      setSearchParams(prev => {
        prev.set('id', id);
        return prev;
      }, { replace: true });  // replace to avoid history spam
    }
  }, [store.selectedEntity.value]);

  return (/* ... */);
}
```

---

## 📚 RELATED DOCS

- `/docs/ANGULAR_PATTERNS_TO_ADOPT.md` - Джерело pattern
- `/packages/rxdb-store/src/stores/base/entity-store.ts` - EntityStore implementation
- `/docs/SESSION_RESTART.md` - Current project status

---

## ✅ SUCCESS CRITERIA

**Before (no selection):**
- ❌ Клік на entity нічого не робить
- ❌ Немає візуальної індикації активної entity
- ❌ Немає detail view
- ❌ Context actions (edit/delete) працюють з хардкод ID

**After (with selection):**
- ✅ Клік на entity → вибирається (highlight)
- ✅ URL синхронізується (?id=breed-123)
- ✅ Detail panel показує деталі selected entity
- ✅ Context actions працюють з selected entity
- ✅ Keyboard navigation (arrows)
- ✅ Auto-select first при завантаженні
- ✅ Deep linking works (share URL)
- ✅ Browser back/forward navigation

**Status:** ⚙️ EntityStore ready, UI integration needed

---

## 🎨 UI/UX CONSIDERATIONS

### Layout Options:

**Option 1: Side-by-Side (Desktop)**
```
┌──────────────┬─────────────────────┐
│ List (350px) │ Detail (flex-1)     │
│              │                     │
│ [Entity 1] ← │ Name: Entity 1      │
│ [Entity 2]   │ Type: ...           │
│ [Entity 3]   │                     │
│              │ [Edit] [Delete]     │
└──────────────┴─────────────────────┘
```

**Option 2: Modal (Mobile-Friendly)**
```
┌─────────────────────────┐
│ List                    │
│                         │
│ [Entity 1] ←            │
│ [Entity 2]              │
│ [Entity 3]              │
│                         │
└─────────────────────────┘

Click → Opens modal:

┌─────────────────────────┐
│ × Entity 1              │
│                         │
│ Name: Entity 1          │
│ Type: ...               │
│                         │
│ [Edit] [Delete]         │
└─────────────────────────┘
```

**Option 3: Drawer (Slide-in)**
```
┌─────────────────────────────────────┐
│ List                    │ Drawer    │
│                         │           │
│ [Entity 1] ←            │ Entity 1  │
│ [Entity 2]              │           │
│ [Entity 3]              │ Name: ... │
│                         │           │
│                         │ [Edit]    │
└─────────────────────────┴───────────┘
```

**Рекомендація:** Почати з Option 1 (Side-by-Side), додати Option 2 (Modal) для mobile.

---

## 🚀 NEXT STEPS

1. **Review & Approve** - обговорити план з командою
2. **Phase 1: URL Sync** - імплементувати базову синхронізацію
3. **Phase 2: UI Components** - додати візуальну індикацію
4. **Phase 3: Detail View** - master-detail layout
5. **Testing** - перевірити на різних entities
6. **Documentation** - update docs після імплементації

**Ready to start?** EntityStore вже готовий, треба тільки підключити UI! 🎉

---
