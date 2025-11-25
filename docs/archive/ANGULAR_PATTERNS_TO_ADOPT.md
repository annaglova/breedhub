# Патерни з Angular проекту для впровадження

## 🎯 Що взяти зі старого проекту

### 1. ✅ **withSelectedEntity Pattern**

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

### 2. ✅ **Lifecycle Hooks**

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

### 3. ✅ **Filter Composition**

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

### 4. ✅ **Unique ID Generation Pattern**

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

### 5. ✅ **Factory Pattern для Dynamic Stores**

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

## 📊 Порівняльна таблиця

| Функція | Angular (старий) | React (новий) | Статус |
|---------|-----------------|---------------|---------|
| Normalized storage | withEntities | EntityStore class | ✅ Готово |
| Selected entity | withSelectedId | selectedEntity signal | 🔄 Додати |
| Lifecycle hooks | withHooks | initializeEntity/cleanup | 🔄 Додати |
| Filters | withFilteredByFilterStore | filteredEntities computed | 🔄 Додати |
| Auto-select first | withSelectedEntityWithFirstDefault | selectFirst() | 🔄 Додати |
| Dynamic creation | Factory pattern | getEntityStore() | ✅ Готово |
| Config-driven | DI tokens | Props/context | ✅ Готово |

## 🚀 План імплементації

1. **Фаза 1: Selection (ЗАРАЗ)**
   - Додати selectedId та selectedEntity в EntityStore
   - Імплементувати selectEntity(), selectFirst()
   - Тестування з UI

2. **Фаза 2: Lifecycle**
   - initializeEntity() в SpaceStore
   - cleanupEntity() для cleanup
   - Auto-load при mount

3. **Фаза 3: Filters**
   - filters signal в EntityStore
   - filteredEntities computed
   - Integration з UI фільтрами

4. **Фаза 4: Real-time**
   - Supabase realtime subscriptions
   - Auto-sync при змінах
   - Optimistic updates

## 💡 Висновки

Старий Angular проект має багато корисних патернів, але ми беремо тільки те, що:
1. Спрощує роботу з даними
2. Покращує UX (selection, auto-select)
3. Не ускладнює архітектуру
4. Легко адаптується до React

Основний принцип: **Беремо ідеї, а не імплементацію**. Адаптуємо під нашу просту архітектуру з одним SpaceStore.