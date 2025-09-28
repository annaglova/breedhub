# Entity Store Implementation Plan

## 📋 Поточний статус

### ✅ Вже зроблено
- [x] Документовано концепцію Entity Store Pattern
- [x] Оновлено STORE_CREATION_GUIDE.md
- [x] Створено STORE_ARCHITECTURE.md
- [x] Визначено стратегію (Entity Store для бізнес-даних, Config Store залишаємо)
- [x] Знайдено існуючий `app-store.signal-store.ts` з початковою реалізацією

### 🔄 В процесі
- [ ] Оновлення app-store.signal-store.ts на Entity Store pattern
- [ ] Створення space.store.ts

## 📝 Архітектурне рішення для реплікації

### Розподіл відповідальностей:

```typescript
// EntityStore залишається чистим
class EntityStore<T> {
  // Тільки state management
  // Ніяких залежностей від RxDB/Supabase
  // Pure reactive state with signals
}

// SpaceStore керує реплікацією
class SpaceStore {
  private entityStores: Map<string, EntityStore>
  private replicationStates: Map<string, boolean>

  async setupEntityReplication(entityType: string) {
    // 1. Створює EntityStore якщо немає
    // 2. Створює RxDB collection
    // 3. Налаштовує реплікацію через EntityReplicationService
    // 4. Підписує EntityStore на зміни з RxDB
  }
}
```

### 🔄 Потік даних:

```
Supabase ←→ EntityReplicationService ←→ RxDB ←→ SpaceStore → EntityStore → UI
```

**Переваги цього підходу:**
- EntityStore залишається простим і тестованим
- SpaceStore керує всією інфраструктурою
- Легко додавати нові entity types
- Можна вимкнути реплікацію для певних entities
- Чітке розділення concerns

## 🎯 ОНОВЛЕНИЙ план впровадження (з реальним контекстом)

### Phase 0: Використати існуючу інфраструктуру

**Ми вже маємо:**
- `app-store.signal-store.ts` - частково реалізований з entityStores Map
- Початкова структура EntityStore interface
- Методи для динамічних entity stores

### Phase 1: Рефакторинг існуючого app-store (1 день)

#### 1.1 Винести EntityStore інтерфейс в окремий файл
**Файл:** `packages/rxdb-store/src/stores/base/entity-store.ts`

```typescript
export class EntityStore<T extends { id: string }> {
  protected ids = signal<string[]>([]);
  protected entities = signal<Map<string, T>>(new Map());
  
  // Computed
  entityMap = computed(() => this.entities.value);
  entityList = computed(() => 
    this.ids.value.map(id => this.entities.value.get(id)!).filter(Boolean)
  );
  total = computed(() => this.ids.value.length);
  
  // withEntities methods
  setAll(entities: T[]) { }
  addOne(entity: T) { }
  updateOne(id: string, changes: Partial<T>) { }
  removeOne(id: string) { }
  // ... інші
}
```

#### 1.2 Рефакторити app-store.signal-store.ts
Додати Entity Store методи до існуючого AppStore:
- Замінити `entityStores: Map` на використання EntityStore класу
- Додати методи withEntities pattern
- Зберегти існуючу функціональність workspaces

### Phase 2: Створення Space Store (1 день)

#### 2.1 Space Store
**Файл:** `packages/rxdb-store/src/stores/space.store.ts`

```typescript
class SpaceStore extends EntityStore<Space> {
  // Spaces належать до workspaces
  getSpacesByWorkspace(workspaceId: string) {
    return computed(() => 
      this.entityList.value.filter(s => s.workspaceId === workspaceId)
    );
  }
  
  // Views і Pages в space
  getViews(spaceId: string) { }
  getPages(spaceId: string) { }
}
```

### Phase 3: Додаткові stores на основі Entity Store (3-5 днів)

#### 3.1 Додаткові Entity Stores

**Пріоритет 1 - Прості сутності:**
- [ ] **Users Store** - `users.store.ts`
- [ ] **Messages Store** - `messages.store.ts`
- [ ] **Breeds Store** - `breeds.store.ts`

**Пріоритет 2 - Складніші:**
- [ ] **Clubs Store** - `clubs.store.ts`
- [ ] **Events Store** - `events.store.ts`
- [ ] **Documents Store** - `documents.store.ts`

#### 3.2 Покращення Configuration Store
**Файл:** `packages/rxdb-store/src/stores/app-config.signal-store.ts`

Додати Entity-style методи (НЕ рефакторити все):
```typescript
// Нові методи
- setAll(configs: AppConfig[])
- updateMany(updates: Array<{id: string, changes: Partial<AppConfig>}>)
- selectByType(type: string): computed
- selectActive(): computed
```

### Phase 4: Оптимізація (наступний спринт)

#### 4.1 Додаткові features для EntityStore
- [ ] Pagination support
- [ ] Virtual scrolling integration  
- [ ] Caching strategies
- [ ] Optimistic updates
- [ ] Undo/Redo support

#### 4.2 Performance оптимізації
- [ ] Batch updates
- [ ] Debounced sync
- [ ] Lazy loading
- [ ] Memory management

### Phase 5: Міграція legacy stores (опціонально)

#### Кандидати для міграції (прості stores):
1. **books.store.ts** → BookEntityStore
2. **property-registry.store.ts** → PropertyEntityStore

#### НЕ мігрувати:
- **app-config.signal-store.ts** - занадто специфічний
- Будь-які stores з складними залежностями

## 📊 Структура файлів після впровадження

```
packages/rxdb-store/src/
├── stores/
│   ├── base/                      # NEW
│   │   ├── entity-store.ts        # Базовий клас
│   │   └── entity-store.utils.ts  # Утиліти
│   │
│   ├── entities/                  # NEW - Entity Stores
│   │   ├── animal.store.ts
│   │   ├── user.store.ts
│   │   ├── message.store.ts
│   │   ├── breed.store.ts
│   │   ├── club.store.ts
│   │   └── event.store.ts
│   │
│   ├── legacy/                    # Перенести старі stores
│   │   ├── books.store.ts
│   │   └── property-registry.store.ts
│   │
│   └── app-config.signal-store.ts # Залишається як є
│
├── types/
│   ├── animal.types.ts            # NEW
│   ├── user.types.ts              # NEW
│   └── ...
│
└── collections/
    ├── animal.schema.ts           # NEW
    ├── user.schema.ts             # NEW
    └── ...
```

## 🚀 Команди для створення

### Створити новий Entity Store:
```bash
# 1. Створити типи
touch packages/rxdb-store/src/types/[entity].types.ts

# 2. Створити схему
touch packages/rxdb-store/src/collections/[entity].schema.ts

# 3. Створити store
touch packages/rxdb-store/src/stores/entities/[entity].store.ts

# 4. Додати в database.service.ts
# 5. Експортувати з index.ts
```

## ✅ Критерії успіху

### Phase 1
- [ ] EntityStore клас працює
- [ ] Всі методи покриті типами
- [ ] Немає помилок TypeScript

### Phase 2
- [ ] Animals Store повністю функціональний
- [ ] Дані синхронізуються з Supabase
- [ ] UI оновлюється реактивно

### Phase 3
- [ ] Мінімум 3 Entity Stores працюють
- [ ] Configuration Store має Entity-style методи
- [ ] Код консистентний між stores

## 🔍 Моніторинг прогресу

### Метрики успіху:
- Скорочення коду на 30-40% порівняно з legacy stores
- Стандартизовані операції працюють однаково
- Нові stores створюються за 30 хвилин
- Менше помилок при CRUD операціях

### Ризики:
- Складність інтеграції з RxDB
- Можливі проблеми з TypeScript generics
- Потреба в додатковій оптимізації для великих datasets

## 📝 Нотатки

### Що НЕ робимо:
- НЕ рефакторимо Configuration Store повністю
- НЕ мігруємо всі stores одразу
- НЕ ламаємо існуючий функціонал

### Пріоритети:
1. Стабільність існуючого коду
2. Поступове впровадження
3. Тестування на реальних use cases
4. Документація кожного кроку

## 🔗 Посилання

- [STORE_ARCHITECTURE.md](./STORE_ARCHITECTURE.md)
- [STORE_CREATION_GUIDE.md](./STORE_CREATION_GUIDE.md)
- [NgRx Entity Management](https://ngrx.io/guide/signals/signal-store/entity-management)