# [ARCHIVED] Патерни з Angular проекту для впровадження

> ⚠️ **СТАТУС: АРХІВНИЙ** - Документ застарів, більшість patterns вже реалізовано
>
> **Дата архівації:** 2024-11-25
>
> **Причина:** Корисні patterns вже впроваджені в EntityStore та SpaceStore.
> Залишкові patterns не актуальні через різницю Angular vs React архітектури.

---

## 🎯 Що взяти зі старого проекту

### 1. ✅ **withSelectedEntity Pattern** [РЕАЛІЗОВАНО]

> **Статус:** ✅ ПОВНІСТЮ РЕАЛІЗОВАНО в EntityStore
> - `selectedId`, `selectedEntity`, `hasSelection`
> - `selectEntity()`, `selectFirst()`, `clearSelection()`
> - Використовується через `useSelectedEntity()` hook

**Старий Angular код:**
```typescript
withSelectedId<Entity, Collection>(config),
withSelectedEntityWithFirstDefault<Entity, Collection>(config)
```

**Навіщо це потрібно:**
- UI завжди має активну/вибрану сутність
- При завантаженні автоматично вибирається перша сутність
- Спрощує роботу з деталями та редагуванням

**Як імплементувати в нашому EntityStore:**
```typescript
class EntityStore<T extends { id: string }> {
  // Existing code...
  
  // Selection support
  protected selectedId = signal<string | null>(null);
  
  selectedEntity = computed(() => {
    const id = this.selectedId.value;
    return id ? this.entities.value.get(id) : null;
  });
  
  selectEntity(id: string): void {
    if (this.entities.value.has(id)) {
      this.selectedId.value = id;
    }
  }
  
  selectFirst(): void {
    const firstId = this.ids.value[0];
    if (firstId) {
      this.selectedId.value = firstId;
    }
  }
  
  clearSelection(): void {
    this.selectedId.value = null;
  }
}
```

### 2. ❌ **Lifecycle Hooks** [НЕ АКТУАЛЬНО]

> **Статус:** ❌ НЕ ПОТРІБНО
> - React має `useEffect` для lifecycle management
> - Cleanup автоматичний через React component lifecycle
> - SpaceStore ініціалізація через React Context

**Старий Angular код:**
```typescript
withHooks((store) => ({
  onInit() {
    store.setAllEntities(config.data);
  },
  onDestroy() {
    // cleanup subscriptions
  }
}))
```

**Навіщо це потрібно:**
- Автоматичне завантаження даних при ініціалізації
- Cleanup при розмонтуванні
- Керування підписками та ресурсами

**Як імплементувати в SpaceStore:**
```typescript
class SpaceStore {
  async initializeEntity(entityType: string): Promise<void> {
    const config = this.getEntityConfig(entityType);
    const store = this.getEntityStore(entityType);
    
    // Load initial data
    const data = await this.loadFromSupabase(entityType);
    store.setAll(data);
    
    // Auto-select first entity
    store.selectFirst();
    
    // Set up real-time subscriptions
    this.setupRealtimeSync(entityType);
  }
  
  cleanupEntity(entityType: string): void {
    // Clean up subscriptions
    this.removeRealtimeSync(entityType);
    
    // Clear store data if needed
    const store = this.getEntityStore(entityType);
    store.removeAll();
  }
}
```

### 3. ⚠️ **Filter Composition** [ЧАСТКОВО - ІНШИЙ ПІДХІД]

> **Статус:** ⚠️ РЕАЛІЗОВАНО ІНАКШЕ
> - Фільтрація через `SpaceStore.applyFilters()` на рівні Supabase
> - ID-First pattern: Supabase фільтрує → IDs → завантажуємо records
> - Client-side `filteredEntities` computed НЕ потрібен
> - Фільтри застосовуються безпосередньо в SQL запитах

**Старий Angular код:**
```typescript
withFilteredByFilterStore({config})
```

**Навіщо це потрібно:**
- Динамічна фільтрація даних
- Computed результати на основі фільтрів
- Інтеграція з UI фільтрами

**Як імплементувати:**
```typescript
class EntityStore<T> {
  // Filter support
  protected filters = signal<Record<string, any>>({});
  
  filteredEntities = computed(() => {
    const allEntities = this.entityList.value;
    const activeFilters = this.filters.value;
    
    if (Object.keys(activeFilters).length === 0) {
      return allEntities;
    }
    
    return allEntities.filter(entity => {
      // Apply filters
      return this.applyFilters(entity, activeFilters);
    });
  });
  
  setFilters(filters: Record<string, any>): void {
    this.filters.value = filters;
  }
}
```

### 4. ❌ **Unique ID Generation Pattern** [НЕ АКТУАЛЬНО]

> **Статус:** ❌ НЕ ВИКОРИСТОВУЄТЬСЯ
> - Використовуємо прості UUID з Supabase
> - Тип визначається через параметр `entityType`, не через composite ID
> - DictionaryDocument має `composite_id` (`table_name::id`), але для інших цілей

**Старий Angular код:**
```typescript
selectId: (c: SuperConfig) => c.type + '-' + c.id
```

**Навіщо це потрібно:**
- Уникнення колізій ID між різними типами
- Легка ідентифікація типу сутності по ID
- Консистентність ID across системи

**Як використовувати:**
```typescript
class SpaceStore {
  generateEntityId(entityType: string, id: string): string {
    return `${entityType}-${id}`;
  }
  
  parseEntityId(compositeId: string): { type: string; id: string } {
    const [type, ...idParts] = compositeId.split('-');
    return { type, id: idParts.join('-') };
  }
}
```

### 5. ✅ **Factory Pattern для Dynamic Stores** [РЕАЛІЗОВАНО]

> **Статус:** ✅ ПОВНІСТЮ РЕАЛІЗОВАНО
> - `SpaceStore.getEntityStore()` динамічно створює EntityStore instances
> - Config-driven через `entityConfigs`
> - Автоматичне створення stores для різних entity types

**Старий Angular код:**
```typescript
const spaceStoreFactory = (config: SpaceConfig) => {
  const EntityListStore = signalStore(
    { protectedState: false },
    withFilteredByFilterStore({config}),
    withLogger(`[SpaceStore]`)
  );
  return new EntityListStore();
};
```

**Як адаптувати:**
```typescript
class SpaceStore {
  private createEntityStore<T>(entityType: string): EntityStore<T> {
    const config = this.getEntityConfig(entityType);
    const store = new EntityStore<T>();
    
    // Apply configuration
    this.applyStoreConfig(store, config);
    
    return store;
  }
}
```

## ❌ Що НЕ брати

### 1. **Багато малих stores**
- Angular: Окремий store для кожної сутності
- Наш підхід: ОДИН SpaceStore для всіх

### 2. **Dependency Injection**
- Angular: Складна система DI з providers
- Наш підхід: React hooks та context

### 3. **signalStoreFeature композиція**
- Angular: Складна композиція features
- Наш підхід: Простий class inheritance

### 4. **Окремі filter/page stores**
- Angular: FilterStore, PageStore, etc.
- Наш підхід: Все в одному SpaceStore

## 📊 Порівняльна таблиця (ФІНАЛЬНИЙ СТАТУС)

| Функція | Angular (старий) | React (новий) | Статус | Примітки |
|---------|-----------------|---------------|---------|----------|
| Normalized storage | withEntities | EntityStore class | ✅ Готово | Повністю реалізовано |
| Selected entity | withSelectedId | selectedEntity signal | ✅ Готово | + hasSelection computed |
| Lifecycle hooks | withHooks | React useEffect | ✅ Готово | Через React, не store |
| Filters | withFilteredByFilterStore | SpaceStore.applyFilters | ✅ Готово | Server-side, ID-First |
| Auto-select first | withSelectedEntityWithFirstDefault | selectFirst() | ✅ Готово | В EntityStore |
| Dynamic creation | Factory pattern | getEntityStore() | ✅ Готово | SpaceStore factory |
| Config-driven | DI tokens | entityConfigs + Context | ✅ Готово | React patterns |
| Composite IDs | type-id pattern | Simple UUIDs | ❌ Не потрібно | Supabase UUIDs |

## ~~🚀 План імплементації~~ ✅ ЗАВЕРШЕНО

~~1. **Фаза 1: Selection (ЗАРАЗ)**~~ ✅ ГОТОВО
   - ✅ Додано selectedId та selectedEntity в EntityStore
   - ✅ Імплементовано selectEntity(), selectFirst(), clearSelection()
   - ✅ Протестовано з UI через useSelectedEntity()

~~2. **Фаза 2: Lifecycle**~~ ✅ ГОТОВО (через React)
   - ✅ React useEffect замість lifecycle hooks
   - ✅ SpaceContext ініціалізація
   - ✅ Автоматичний cleanup

~~3. **Фаза 3: Filters**~~ ✅ ГОТОВО (інший підхід)
   - ✅ SpaceStore.applyFilters() з ID-First pattern
   - ✅ Server-side фільтрація через Supabase
   - ✅ Pagination з cursor

~~4. **Фаза 4: Real-time**~~ ⚠️ ВИМКНЕНО
   - ⚠️ Supabase realtime конфліктує з ID-First pagination
   - ⚠️ Залишено можливість увімкнути при потребі

## 💡 Висновки (ФІНАЛЬНІ)

✅ **Міграція завершена успішно!** Всі корисні patterns з Angular проекту адаптовані:

**Що реалізовано:**
1. ✅ Selection pattern (selectedEntity, selectFirst)
2. ✅ Normalized storage (EntityStore з Map)
3. ✅ Dynamic stores (factory pattern в SpaceStore)
4. ✅ Config-driven (entityConfigs)
5. ✅ Filters (через Supabase ID-First pattern)

**Що не потрібно:**
1. ❌ NgRx lifecycle hooks → React useEffect
2. ❌ Client-side filters → Server-side через Supabase
3. ❌ Composite IDs → Prості Supabase UUIDs
4. ❌ DI system → React Context

**Основний принцип виконаний:** Взяли ідеї, адаптували під React + RxDB + Local-First архітектуру.

---

**Документація поточної архітектури:**
- [CORE_PRINCIPLES.md](./CORE_PRINCIPLES.md) - Local-First Architecture patterns
- [LOCAL_FIRST_ROADMAP.md](./LOCAL_FIRST_ROADMAP.md) - Overall architecture
- EntityStore: `/packages/rxdb-store/src/stores/base/entity-store.ts`
- SpaceStore: `/packages/rxdb-store/src/stores/space-store.signal-store.ts`