# Space Store Architecture

## 🎯 Концепція Space Store

**Space Store** - це універсальний динамічний store для ВСІХ бізнес-сутностей в системі.

### Ключова ідея
Замість створення окремого store для кожної сутності (animals, users, breeds, etc.), ми маємо **ОДИН універсальний Space Store**, який:
- Динамічно створює RxDB колекції на основі конфігурацій
- Обробляє CRUD операції для будь-якої бізнес-сутності
- Керує UI представленням даних через конфігурації

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
  getEntity(entityType: string)
  createEntity(entityType: string, data: any)
  updateEntity(entityType: string, id: string, changes: any)
  deleteEntity(entityType: string, id: string)
}
```

## 🏗 Архітектура

### 1. Configuration-Driven підхід

Кожна бізнес-сутність описується конфігурацією:
```typescript
// app_config для entity "animals"
{
  id: "config_entity_animals",
  type: "entity",
  data: {
    tableName: "animals",
    fields: [
      { name: "name", type: "string", required: true },
      { name: "breed_id", type: "reference", ref: "breeds" },
      { name: "birth_date", type: "date" }
    ],
    validations: [...],
    ui: {
      listView: { columns: ["name", "breed", "age"] },
      formView: { sections: [...] }
    }
  }
}
```

### 2. Динамічне створення колекцій

Space Store на основі конфігурації:
1. Читає entity config
2. Генерує RxDB schema
3. Створює колекцію
4. Налаштовує синхронізацію з Supabase

```typescript
class SpaceStore {
  private entityCollections = new Map<string, RxCollection>();
  
  async initializeEntity(entityType: string) {
    // Завантажити конфіг
    const config = await loadEntityConfig(entityType);
    
    // Згенерувати RxDB schema з конфігу
    const schema = generateSchemaFromConfig(config);
    
    // Створити колекцію
    const collection = await db.addCollections({
      [entityType]: { schema }
    });
    
    this.entityCollections.set(entityType, collection);
  }
}
```

### 3. Універсальні CRUD операції

```typescript
class SpaceStore extends EntityStore {
  // Отримати всі записи сутності
  getEntities(entityType: string) {
    const collection = this.entityCollections.get(entityType);
    return collection?.find().exec();
  }
  
  // Створити новий запис
  async createEntity(entityType: string, data: any) {
    const collection = this.entityCollections.get(entityType);
    const config = this.getEntityConfig(entityType);
    
    // Валідація на основі конфігу
    await this.validateEntity(config, data);
    
    // Створення
    return collection?.insert(data);
  }
  
  // Оновити запис
  async updateEntity(entityType: string, id: string, changes: any) {
    const collection = this.entityCollections.get(entityType);
    const doc = await collection?.findOne(id).exec();
    return doc?.patch(changes);
  }
  
  // Видалити запис
  async deleteEntity(entityType: string, id: string) {
    const collection = this.entityCollections.get(entityType);
    const doc = await collection?.findOne(id).exec();
    return doc?.remove();
  }
}
```

### 4. Entity Store Pattern для Space Store

Space Store використовує Entity Store pattern з withEntities методами:

```typescript
class SpaceStore {
  // Entity Store pattern для кожного типу сутності
  private entityStores = new Map<string, EntityStore<any>>();
  
  getEntityStore(entityType: string): EntityStore {
    if (!this.entityStores.has(entityType)) {
      const store = new EntityStore();
      this.entityStores.set(entityType, store);
    }
    return this.entityStores.get(entityType);
  }
  
  // withEntities методи для конкретної сутності
  setAll(entityType: string, entities: any[]) {
    const store = this.getEntityStore(entityType);
    store.setAll(entities);
  }
  
  addOne(entityType: string, entity: any) {
    const store = this.getEntityStore(entityType);
    store.addOne(entity);
  }
  
  updateOne(entityType: string, id: string, changes: any) {
    const store = this.getEntityStore(entityType);
    store.updateOne(id, changes);
  }
  
  removeOne(entityType: string, id: string) {
    const store = this.getEntityStore(entityType);
    store.removeOne(id);
  }
}
```

## 🔄 Взаємодія з іншими stores

### App Store
- Містить глобальні налаштування додатку
- Workspaces конфігурація
- Не працює з бізнес-даними

### Configuration Store
- Зберігає всі конфігурації (entity configs, UI configs, etc.)
- Space Store читає конфіги звідси

### Space Store
- Працює з ВСІМА бізнес-даними
- Динамічно створює структури на основі конфігів
- Універсальні CRUD операції

## 📦 Приклади використання

### Робота з тваринами (animals)
```typescript
// Ініціалізація
await spaceStore.initializeEntity('animals');

// Отримати всіх тварин
const animals = spaceStore.getEntities('animals');

// Створити нову тварину
await spaceStore.createEntity('animals', {
  name: 'Rex',
  breed_id: 'breed_123',
  birth_date: '2020-01-01'
});

// Оновити
await spaceStore.updateOne('animals', 'animal_456', {
  name: 'Max'
});

// Видалити
await spaceStore.removeOne('animals', 'animal_456');
```

### Робота з породами (breeds)
```typescript
// Та сама логіка для БУДЬ-ЯКОЇ сутності!
await spaceStore.initializeEntity('breeds');
const breeds = spaceStore.getEntities('breeds');
await spaceStore.createEntity('breeds', { name: 'Labrador', species: 'dog' });
```

## 🚀 Переваги підходу

### 1. **Zero-code для нових сутностей**
- Додали конфіг = сутність готова
- Не потрібно писати новий store

### 2. **Консистентність**
- Всі сутності працюють однаково
- Один патерн для всього

### 3. **Масштабованість**
- Легко додавати нові типи сутностей
- Немає дублювання коду

### 4. **Гнучкість**
- Конфігурації визначають поведінку
- Легко змінювати без коду

### 5. **Type Safety**
- TypeScript generics для типізації
- Автогенерація типів з конфігів

## 🔧 Технічна реалізація

### Файлова структура
```
packages/rxdb-store/src/
├── stores/
│   ├── base/
│   │   └── entity-store.ts       # Базовий EntityStore клас
│   │
│   ├── app-store.signal-store.ts # App Store (workspaces, глобальні налаштування)
│   ├── app-config.signal-store.ts # Configuration Store (всі конфіги)
│   └── space.store.ts             # Space Store (всі бізнес-дані)
│
└── utils/
    ├── schema-generator.ts        # Генерація RxDB schemas з конфігів
    └── entity-validator.ts        # Валідація даних на основі конфігів
```

### Приклад конфігурації для сутності
```typescript
{
  id: "config_entity_breeds",
  type: "entity",
  data: {
    tableName: "breeds",
    fields: [
      {
        name: "id",
        type: "string",
        primary: true
      },
      {
        name: "name",
        type: "string",
        required: true,
        maxLength: 100
      },
      {
        name: "species",
        type: "enum",
        values: ["dog", "cat", "bird"],
        required: true
      },
      {
        name: "description",
        type: "text"
      },
      {
        name: "created_at",
        type: "timestamp",
        auto: true
      }
    ],
    indexes: ["name", "species"],
    relations: {
      animals: {
        type: "hasMany",
        target: "animals",
        foreign: "breed_id"
      }
    },
    validations: [
      {
        field: "name",
        rule: "unique"
      }
    ],
    ui: {
      listView: {
        columns: ["name", "species", "animals_count"],
        sortable: ["name", "created_at"],
        searchable: ["name", "description"]
      },
      formView: {
        sections: [
          {
            title: "Basic Info",
            fields: ["name", "species"]
          },
          {
            title: "Details",
            fields: ["description"]
          }
        ]
      }
    }
  }
}
```

## ⚠️ Важливі моменти

### НЕ створюємо:
- ❌ AnimalStore
- ❌ BreedStore
- ❌ ClubStore
- ❌ Окремі stores для кожної типової бізнес-сутності

### Створюємо:
- ✅ ОДИН Space Store для всіх типових бізнес-даних
- ✅ Конфігурації для кожної сутності
- ✅ Динамічні колекції на основі конфігів

### Виключення (потребують окремого рішення):
- ❓ **User Store** - можливо буде окремим store через специфіку автентифікації, прав доступу, etc.
  - Рішення буде прийнято пізніше
  - Поки що відкладаємо

## 🔗 Зв'язані документи

- [STORE_ARCHITECTURE.md](./STORE_ARCHITECTURE.md) - Загальна архітектура stores
- [ENTITY_STORE_IMPLEMENTATION_PLAN.md](./ENTITY_STORE_IMPLEMENTATION_PLAN.md) - План впровадження
- [STORE_CREATION_GUIDE.md](./STORE_CREATION_GUIDE.md) - Інструкція створення stores