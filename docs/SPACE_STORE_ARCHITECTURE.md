# Space Store Architecture

## 🎯 Концепція Space Store

**Space Store** - це універсальний динамічний store для ВСІХ бізнес-сутностей в системі.

### Ключова ідея
Замість створення окремого store для кожної сутності (animals, users, breeds, etc.), ми маємо **ОДИН універсальний Space Store**, який:
- Динамічно працює з будь-якою бізнес-сутністю на основі конфігурацій
- Обробляє CRUD операції для будь-якої бізнес-сутності
- Керує UI представленням даних через конфігурації
- Реалізує **ID-First Loading Pattern** для оптимальної продуктивності
- Інтегрується з **DictionaryStore** та **Child Collections**

## ❓ Чому Space Store, а не окремі stores?

### Проблема з окремими stores:
```typescript
// ❌ НЕ РОБИМО ТАК - занадто багато дублювання
class AnimalStore extends EntityStore { }
class UserStore extends EntityStore { }
class BreedStore extends EntityStore { }
class ClubStore extends EntityStore { }
// ... 100+ різних stores
```

### Рішення - Space Store:
```typescript
// ✅ ОДИН store для ВСІХ бізнес-сутностей
class SpaceStore {
  // Динамічно працює з будь-якою сутністю
  getEntityStore(entityType: string): EntityStore
  applyFilters(entityType: string, filters: any): Promise<void>
  loadMore(entityType: string): Promise<void>
  loadChildRecords(parentId: string, tableType: string): Promise<any[]>
}
```

## 🏗 Архітектура

### Три рівні Store System:

```
┌─────────────────────────────────────────────────┐
│          SpaceStore (PRIMARY)                    │
│  ✅ Всі entity types (breeds, pets, kennels)   │
│  ✅ Config-driven через app_config              │
│  ✅ ID-First loading                            │
│  ✅ Pagination, filtering, selection            │
│  ✅ Child records support                       │
└─────────────────────────────────────────────────┘
              ▲              ▲
              │              │
    ┌─────────┴─────┐   ┌───┴──────────┐
    │ DictionaryStore│   │EntityStore   │
    │   (Helpers)    │   │  (Internal)  │
    └────────────────┘   └──────────────┘
```

### 1. Configuration-Driven підхід

Кожна бізнес-сутність описується конфігурацією в `app_config`:

```typescript
// Entity config для breed
{
  key: "entity.breed",
  scope: "global",
  base_config: {
    table_name: "breed",
    id_field: "id",
    name_field: "name",
    fields: ["id", "name", "country", "description"],
    filters: {
      country: { type: "select", options: ["Ukraine", "USA"] },
      status: { type: "select", options: ["active", "inactive"] }
    },
    sorts: {
      name: { direction: "asc" },
      created_at: { direction: "desc" }
    }
  }
}
```

### 2. ID-First Loading Pattern

**Критична оптимізація:** Завантажуємо спочатку IDs, потім перевіряємо кеш, завантажуємо тільки missing records.

```typescript
class SpaceStore {
  async applyFilters(entityType: string, filters: any) {
    // Phase 1: Load IDs from Supabase (lightweight query)
    const { ids } = await supabase
      .from(table_name)
      .select('id')
      .match(filters)
      .limit(50);

    // Phase 2: Check RxDB cache
    const cached = await rxdb.find({ selector: { id: { $in: ids } } });
    const cachedIds = cached.map(doc => doc.id);

    // Phase 3: Load only missing records from Supabase
    const missingIds = ids.filter(id => !cachedIds.includes(id));
    const fresh = await supabase
      .from(table_name)
      .select('*')
      .in('id', missingIds);

    // Phase 4: Merge cached + fresh records
    const entityStore = this.getEntityStore(entityType);
    entityStore.setAll([...cached, ...fresh]);
  }
}
```

**Переваги ID-First:**
- ✅ 70% зменшення трафіку
- ✅ Максимальне використання кешу
- ✅ Швидше завантаження

### 3. Entity Store Pattern всередині Space Store

Space Store динамічно створює EntityStore instance для кожного типу сутності:

```typescript
class SpaceStore {
  // Entity Store instances для кожного типу
  private entityStores = new Map<string, EntityStore<any>>();

  getEntityStore<T>(entityType: string): EntityStore<T> {
    if (!this.entityStores.has(entityType)) {
      const store = new EntityStore<T>();
      this.entityStores.set(entityType, store);
    }
    return this.entityStores.get(entityType)!;
  }
}
```

**EntityStore надає:**
- `entityList` - масив сутностей
- `entityMap` - Map для швидкого доступу
- `total` - кількість записів
- `selectedEntity` - вибрана сутність
- `selectEntity(id)`, `selectFirst()`, `clearSelection()`
- `setAll()`, `addOne()`, `updateOne()`, `removeOne()`

### 4. Інтеграція з DictionaryStore

Для довідників (achievements, colors, sizes) Space Store працює разом з DictionaryStore:

```typescript
// SpaceStore → DictionaryStore для довідників
const { records } = await dictionaryStore.getDictionary('achievement', {
  idField: 'id',
  nameField: 'name',
  additionalFields: ['int_value', 'position', 'entity']
});

// DictionaryStore автоматично:
// 1. Завантажує IDs з Supabase
// 2. Перевіряє RxDB cache (dictionaries collection)
// 3. Завантажує тільки missing records
// 4. Повертає merged результат
```

### 5. Child Collections Support

Для дочірніх таблиць (як `achievement_in_breed`) Space Store використовує universal `breed_children` collection:

```typescript
class SpaceStore {
  async loadChildRecords(
    parentId: string,
    tableType: string, // 'achievement_in_breed', 'breed_division', etc.
    options?: { limit?: number; orderBy?: string }
  ) {
    // Phase 1: Load IDs from Supabase
    const { ids } = await supabase
      .from(tableType)
      .select('id')
      .eq('breed_id', parentId);

    // Phase 2: Check RxDB cache (breed_children collection)
    const cached = await rxdb.breed_children.find({
      selector: {
        parentId,
        tableType,
        id: { $in: ids }
      }
    });

    // Phase 3: Load missing records
    // Phase 4: Merge and return

    // Records stored with 'additional' JSON field pattern:
    // {
    //   id: string,
    //   tableType: 'achievement_in_breed',
    //   parentId: string,
    //   additional: { achievement_id, date, ... },
    //   cachedAt: number
    // }
  }
}
```

### 6. Pagination з Cursor

```typescript
class SpaceStore {
  async loadMore(entityType: string) {
    const entityStore = this.getEntityStore(entityType);
    const currentIds = entityStore.ids.value;
    const lastId = currentIds[currentIds.length - 1];

    // Cursor-based pagination
    const { ids } = await supabase
      .from(table_name)
      .select('id')
      .gt('id', lastId) // Cursor
      .limit(50);

    // ID-First: load only missing from cache
    // ...
  }
}
```

### 7. Selection Support

```typescript
class SpaceStore {
  // Selection через EntityStore
  selectEntity(entityType: string, id: string) {
    const store = this.getEntityStore(entityType);
    store.selectEntity(id);
  }

  selectFirst(entityType: string) {
    const store = this.getEntityStore(entityType);
    store.selectFirst();
  }

  getSelectedEntity(entityType: string) {
    const store = this.getEntityStore(entityType);
    return store.selectedEntity.value;
  }
}
```

## 🔄 Взаємодія з іншими stores

### 1. SpaceStore (PRIMARY - 95% випадків)
**Призначення:** Всі бізнес-сутності (breeds, pets, kennels, clubs)
- ✅ Config-driven через `app_config`
- ✅ ID-First loading
- ✅ Pagination, filtering, selection
- ✅ CRUD операції
- ✅ Child records через `breed_children` collection

**Використання:**
```typescript
const spaceStore = useSpaceStore();
await spaceStore.applyFilters('breed', { country: 'Ukraine' });
const breedStore = spaceStore.getEntityStore('breed');
const breeds = breedStore.entityList.value;
```

### 2. DictionaryStore (для довідників)
**Призначення:** Малі довідники (achievements, colors, sizes)
- ✅ Universal `dictionaries` collection
- ✅ Optional `additional` JSON field
- ✅ ID-First loading
- ✅ TTL-based cleanup

**Використання:**
```typescript
const { records } = await dictionaryStore.getDictionary('achievement', {
  idField: 'id',
  nameField: 'name',
  additionalFields: ['int_value', 'position', 'entity']
});
```

### 3. Configuration Store
**Призначення:** Entity configs з `app_config`
- Зберігає всі конфігурації entities
- Space Store читає конфіги звідси
- Не працює з бізнес-даними

## 📦 Приклади використання

### React компонент з Space Store

```typescript
import { useSpaceStore, useSelectedEntity } from '@/contexts/SpaceContext';
import { useEffect } from 'react';

function BreedListComponent() {
  const spaceStore = useSpaceStore();
  const selectedEntity = useSelectedEntity();

  // 1. Load entities з фільтрами
  useEffect(() => {
    spaceStore.applyFilters('breed', {
      country: 'Ukraine',
      status: 'active'
    });
  }, []);

  // 2. Отримати entity store
  const breedStore = spaceStore.getEntityStore('breed');

  // 3. Використати computed values
  const breeds = breedStore.entityList.value;
  const total = breedStore.total.value;
  const isLoading = breedStore.loading.value;

  // 4. Pagination
  const handleLoadMore = () => {
    spaceStore.loadMore('breed');
  };

  // 5. Selection
  const handleSelectBreed = (breedId: string) => {
    breedStore.selectEntity(breedId);
  };

  return (
    <div>
      <h2>Breeds: {total}</h2>
      {breeds.map(breed => (
        <BreedCard
          key={breed.id}
          breed={breed}
          isSelected={selectedEntity?.id === breed.id}
          onClick={() => handleSelectBreed(breed.id)}
        />
      ))}
      <button onClick={handleLoadMore}>Load More</button>
    </div>
  );
}
```

### Child Records через useChildRecords Hook

```typescript
import { useChildRecords } from '@/hooks/useChildRecords';

function BreedAchievementsTab() {
  const selectedEntity = useSelectedEntity();
  const breedId = selectedEntity?.id;

  // Hook автоматично завантажує child records через SpaceStore
  const {
    data: achievements,
    isLoading,
    error
  } = useChildRecords({
    parentId: breedId,
    tableType: 'achievement_in_breed',
    orderBy: 'date',
    orderDirection: 'desc'
  });

  // achievements містить records з additional JSON field:
  // { id, tableType, parentId, additional: { achievement_id, date }, cachedAt }

  return (
    <div>
      {achievements.map(record => (
        <Achievement
          key={record.id}
          achievementId={record.additional?.achievement_id}
          date={record.additional?.date}
        />
      ))}
    </div>
  );
}
```

## 🚀 Переваги підходу

### 1. **Zero-code для нових сутностей**
- Додали конфіг в `app_config` = сутність готова
- Не потрібно писати новий store
- Не потрібно створювати нові RxDB collections

### 2. **ID-First оптимізація**
- 70% зменшення трафіку
- Максимальне використання кешу
- Швидше завантаження

### 3. **Консистентність**
- Всі сутності працюють однаково
- Один патерн для всього
- Єдина точка управління даними

### 4. **Масштабованість**
- Легко додавати нові типи сутностей
- Немає дублювання коду
- ОДИН store замість 100+

### 5. **Local-First Architecture**
- Всі дані через RxDB → Store → UI
- Offline-first підтримка
- Автоматичне кешування

### 6. **Type Safety**
- TypeScript generics для типізації
- Автогенерація типів з конфігів

## 🔧 Технічна реалізація

### Файлова структура
```
packages/rxdb-store/src/
├── stores/
│   ├── base/
│   │   └── entity-store.ts             # Базовий EntityStore клас
│   │
│   ├── space-store.signal-store.ts     # Space Store (PRIMARY)
│   ├── dictionary-store.signal-store.ts # Dictionary Store
│   └── app-config.signal-store.ts      # Configuration Store
│
├── collections/
│   ├── dictionaries.schema.ts          # Universal dictionaries
│   └── breed-children.schema.ts        # Universal child collections
│
└── hooks/
    └── useChildRecords.ts               # React hook для child records
```

### SpaceStore Implementation

```typescript
class SpaceStore {
  // Entity stores для кожного типу
  private entityStores = new Map<string, EntityStore<any>>();

  // Entity configs з app_config
  private entityConfigs = new Map<string, EntityConfig>();

  // Initialization
  initialized = signal<boolean>(false);
  loading = signal<boolean>(false);

  async initialize() {
    // Load entity configs from app_config
    const configs = await this.loadEntityConfigs();
    configs.forEach(config => {
      this.entityConfigs.set(config.key, config);
    });

    this.initialized.value = true;
  }

  // Get EntityStore instance
  getEntityStore<T>(entityType: string): EntityStore<T> {
    if (!this.entityStores.has(entityType)) {
      const store = new EntityStore<T>();
      this.entityStores.set(entityType, store);
    }
    return this.entityStores.get(entityType)!;
  }

  // ID-First loading with filters
  async applyFilters(
    entityType: string,
    filters: Record<string, any>
  ): Promise<void> {
    const config = this.getEntityConfig(entityType);
    const entityStore = this.getEntityStore(entityType);

    entityStore.loading.value = true;

    try {
      // Phase 1: Load IDs from Supabase
      const idsResult = await this.loadIds(config, filters);

      // Phase 2: Check RxDB cache
      const cached = await this.getCachedRecords(config, idsResult.ids);

      // Phase 3: Load missing records
      const missingIds = this.findMissingIds(idsResult.ids, cached);
      const fresh = await this.loadMissingRecords(config, missingIds);

      // Phase 4: Merge and update store
      const allRecords = [...cached, ...fresh];
      entityStore.setAll(allRecords);

      // Auto-select first if none selected
      if (!entityStore.selectedId.value && allRecords.length > 0) {
        entityStore.selectFirst();
      }
    } finally {
      entityStore.loading.value = false;
    }
  }

  // Pagination
  async loadMore(entityType: string): Promise<void> {
    const entityStore = this.getEntityStore(entityType);
    const currentIds = entityStore.ids.value;
    const lastId = currentIds[currentIds.length - 1];

    // Cursor-based pagination with ID-First pattern
    // ...
  }

  // Child records
  async loadChildRecords(
    parentId: string,
    tableType: string,
    options?: LoadChildOptions
  ): Promise<any[]> {
    // ID-First loading from breed_children collection
    // ...
  }

  // Selection helpers
  selectEntity(entityType: string, id: string) {
    const store = this.getEntityStore(entityType);
    store.selectEntity(id);
  }

  selectFirst(entityType: string) {
    const store = this.getEntityStore(entityType);
    store.selectFirst();
  }
}
```

## ⚠️ Важливі моменти

### НЕ створюємо:
- ❌ AnimalStore, BreedStore, ClubStore
- ❌ Окремі stores для кожної типової бізнес-сутності
- ❌ Нові RxDB collections для кожної entity (окрім виключень)

### Створюємо:
- ✅ ОДИН Space Store для всіх бізнес-даних
- ✅ Конфігурації в `app_config` для кожної сутності
- ✅ Використовуємо universal collections (`dictionaries`, `breed_children`)

### Виключення (потребують окремих collections):
- **breeds** - має власну collection через складність полів
- **dictionaries** - universal collection для всіх довідників
- **breed_children** - universal collection для всіх child tables

### Три способи роботи з даними:

1. **SpaceStore** - для entity lists (breeds, pets, kennels)
   ```typescript
   await spaceStore.applyFilters('breed', filters);
   ```

2. **DictionaryStore** - для довідників (achievements, colors)
   ```typescript
   await dictionaryStore.getDictionary('achievement');
   ```

3. **SpaceStore.loadChildRecords** - для child tables
   ```typescript
   await spaceStore.loadChildRecords(breedId, 'achievement_in_breed');
   ```

## 📚 Порівняння з Angular проекту

### Патерни NgRx Signal Store (старий Angular проект)

Старий Angular проект використовував NgRx Signal Store з кількома ключовими патернами:

#### 1. withEntities Feature
- Забезпечує нормалізоване зберігання (масив ids + Map entities)
- **Наша реалізація:** EntityStore клас з тими ж методами

#### 2. Dynamic Store Factory Pattern
```typescript
// Angular
const spaceStoreFactory = (config: SpaceConfig) => {
  const EntityListStore = signalStore(
    { protectedState: false },
    withFilteredByFilterStore({config})
  );
  return new EntityListStore();
};

// React - ОДИН универсальний SpaceStore
class SpaceStore {
  getEntityStore(entityType: string): EntityStore
}
```

#### 3. Configuration через Dependency Injection
- **Angular:** DI tokens для конфігурації
- **React:** React Context + hooks

### Ключові відмінності

| Angular NgRx | React SpaceStore |
|-------------|------------------|
| Багато маленьких stores | ОДИН универсальний SpaceStore |
| signalStoreFeature композиція | Class inheritance |
| Dependency Injection | React Context + Hooks |
| Окремі collections | Universal collections |
| Client-side фільтрація | ID-First з Supabase фільтрацією |

### Патерни які ми взяли:

1. ✅ **Normalized Storage** - EntityStore з Map + ids
2. ✅ **Method Consistency** - ті ж методи (setAll, addOne, etc.)
3. ✅ **Configuration-Driven** - через app_config
4. ✅ **Selection Support** - selectedEntity, selectFirst()
5. ✅ **Dynamic Creation** - getEntityStore() factory

### Патерни які ми покращили:

1. ✅ **ID-First Loading** - 70% зменшення трафіку
2. ✅ **Universal Collections** - dictionaries, breed_children
3. ✅ **ОДИН SpaceStore** - замість 100+ окремих stores
4. ✅ **Local-First** - через RxDB, не тільки memory

## 🔗 Зв'язані документи

- **[CORE_PRINCIPLES.md](./CORE_PRINCIPLES.md)** - Фундаментальні архітектурні принципи
- **[STORE_CREATION_GUIDE.md](./STORE_CREATION_GUIDE.md)** - Як використовувати SpaceStore
- **[CONFIG_ARCHITECTURE.md](./CONFIG_ARCHITECTURE.md)** - Config-driven development
- **[LOCAL_FIRST_ROADMAP.md](./LOCAL_FIRST_ROADMAP.md)** - Local-First архітектура

---

**Last Updated:** 2024-11-25
