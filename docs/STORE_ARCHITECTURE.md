# Store Architecture Guide

## Огляд архітектури

BreedHub використовує три основні stores:

1. **Configuration Store** - складна ієрархічна система для конфігурацій UI
2. **App Store** - глобальні налаштування додатку, workspaces
3. **Space Store** - універсальний динамічний store для ВСІХ бізнес-сутностей

## 🎯 Стратегія використання

### Коли використовувати Configuration Store

Configuration Store (`app-config.signal-store.ts`) залишається для:
- Конфігурації UI компонентів
- Ієрархічні структури (app → workspace → space → page)
- Складні залежності між конфігураціями
- Каскадні оновлення
- Property-based налаштування

**НЕ РЕФАКТОРИМО** існуючий Configuration Store - він працює і виконує специфічні задачі.

### Коли використовувати Space Store

Space Store - це ОДИН універсальний store для типових бізнес-сутностей:
- Тварини (animals)
- Породи (breeds)  
- Повідомлення (messages)
- Клуби (clubs)
- Події (events)
- Marketplace listings
- Будь-які інші типові бізнес-дані

**Виключення**: 
- Користувачі (users) - можливо окремий store (рішення відкладено)

**ВАЖЛИВО**: НЕ створюємо окремий store для кожної сутності. Space Store динамічно працює з усіма на основі конфігурацій.

## 📦 Entity Store Pattern

### Базовий клас EntityStore

```typescript
// packages/rxdb-store/src/stores/base/entity-store.ts
import { signal, computed } from '@preact/signals-react';

export class EntityStore<T extends { id: string }> {
  // Стан як в NgRx
  protected ids = signal<string[]>([]);
  protected entities = signal<Map<string, T>>(new Map());
  
  // Computed як в NgRx withEntities
  entityMap = computed(() => this.entities.value);
  entityList = computed(() => 
    this.ids.value.map(id => this.entities.value.get(id)!).filter(Boolean)
  );
  total = computed(() => this.ids.value.length);
  
  // Entity Management Methods (як в NgRx)
  setAll(entities: T[]) {
    const newEntities = new Map<string, T>();
    const newIds: string[] = [];
    
    entities.forEach(entity => {
      newEntities.set(entity.id, entity);
      newIds.push(entity.id);
    });
    
    this.entities.value = newEntities;
    this.ids.value = newIds;
  }
  
  setOne(entity: T) {
    this.entities.value = new Map([[entity.id, entity]]);
    this.ids.value = [entity.id];
  }
  
  addOne(entity: T) {
    const newEntities = new Map(this.entities.value);
    newEntities.set(entity.id, entity);
    
    this.entities.value = newEntities;
    if (!this.ids.value.includes(entity.id)) {
      this.ids.value = [...this.ids.value, entity.id];
    }
  }
  
  addMany(entities: T[]) {
    const newEntities = new Map(this.entities.value);
    const newIds = [...this.ids.value];
    
    entities.forEach(entity => {
      if (!newEntities.has(entity.id)) {
        newEntities.set(entity.id, entity);
        newIds.push(entity.id);
      }
    });
    
    this.entities.value = newEntities;
    this.ids.value = newIds;
  }
  
  updateOne(id: string, changes: Partial<T>) {
    const entity = this.entities.value.get(id);
    if (!entity) return;
    
    const newEntities = new Map(this.entities.value);
    newEntities.set(id, { ...entity, ...changes });
    this.entities.value = newEntities;
  }
  
  updateMany(updates: Array<{id: string, changes: Partial<T>}>) {
    const newEntities = new Map(this.entities.value);
    
    updates.forEach(({id, changes}) => {
      const entity = newEntities.get(id);
      if (entity) {
        newEntities.set(id, { ...entity, ...changes });
      }
    });
    
    this.entities.value = newEntities;
  }
  
  removeOne(id: string) {
    const newEntities = new Map(this.entities.value);
    newEntities.delete(id);
    
    this.entities.value = newEntities;
    this.ids.value = this.ids.value.filter(existingId => existingId !== id);
  }
  
  removeMany(ids: string[]) {
    const newEntities = new Map(this.entities.value);
    ids.forEach(id => newEntities.delete(id));
    
    this.entities.value = newEntities;
    this.ids.value = this.ids.value.filter(id => !ids.includes(id));
  }
  
  removeAll() {
    this.entities.value = new Map();
    this.ids.value = [];
  }
}
```

### Приклад використання для нової сутності

```typescript
// packages/rxdb-store/src/stores/animal.store.ts
import { computed } from '@preact/signals-react';
import { EntityStore } from './base/entity-store';
import { getDatabase } from '../services/database.service';
import type { Animal } from '../types/animal.types';

class AnimalEntityStore extends EntityStore<Animal> {
  // Додаткові специфічні computed
  dogs = computed(() => 
    this.entityList.value.filter(a => a.species === 'dog')
  );
  
  cats = computed(() => 
    this.entityList.value.filter(a => a.species === 'cat')
  );
  
  byBreed = (breedId: string) => computed(() =>
    this.entityList.value.filter(a => a.breedId === breedId)
  );
  
  // RxDB інтеграція
  async loadFromDatabase() {
    const db = await getDatabase();
    const animals = await db.collections.animals.find().exec();
    this.setAll(animals.map(doc => doc.toJSON()));
  }
  
  // CRUD операції з RxDB
  async create(animal: Omit<Animal, 'id' | 'created_at'>) {
    const db = await getDatabase();
    const newAnimal = {
      ...animal,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString()
    };
    
    await db.collections.animals.insert(newAnimal);
    this.addOne(newAnimal as Animal);
    return newAnimal;
  }
  
  async update(id: string, changes: Partial<Animal>) {
    const db = await getDatabase();
    const doc = await db.collections.animals.findOne(id).exec();
    
    if (doc) {
      await doc.patch(changes);
      this.updateOne(id, changes);
    }
  }
  
  async delete(id: string) {
    const db = await getDatabase();
    const doc = await db.collections.animals.findOne(id).exec();
    
    if (doc) {
      await doc.patch({ _deleted: true });
      this.removeOne(id);
    }
  }
}

export const animalStore = new AnimalEntityStore();
```

## 🔄 Порівняння з NgRx

| NgRx Signal Store | Наш Entity Store |
|-------------------|------------------|
| `withEntities({ entity: Todo })` | `extends EntityStore<Todo>` |
| `patchState(store, setAllEntities(todos))` | `store.setAll(todos)` |
| `patchState(store, addEntity(todo))` | `store.addOne(todo)` |
| `patchState(store, updateEntity({ id, changes }))` | `store.updateOne(id, changes)` |
| `patchState(store, removeEntity(id))` | `store.removeOne(id)` |
| `store.todosEntities()` | `store.entityList.value` |
| `store.todosEntityMap()` | `store.entityMap.value` |
| `store.todosIds()` | `store.ids.value` |

## 📝 Покрокова інструкція створення Entity Store

### Крок 1: Визначити чи потрібен Entity Store

Питання для перевірки:
- Це бізнес-сутність (не конфігурація)?
- Потрібні стандартні CRUD операції?
- Немає складних ієрархічних залежностей?

Якщо ТАК - використовуйте Entity Store.

### Крок 2: Створити типи

```typescript
// packages/rxdb-store/src/types/[entity].types.ts
export interface Entity {
  id: string;
  name: string;
  // інші поля
  created_at: string;
  updated_at: string;
  _deleted?: boolean;
}
```

### Крок 3: Створити RxDB схему

```typescript
// packages/rxdb-store/src/collections/[entity].schema.ts
export const entitySchema: RxJsonSchema<Entity> = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 },
    name: { type: 'string' },
    // інші поля
  },
  required: ['id', 'name']
};
```

### Крок 4: Створити Entity Store

```typescript
// packages/rxdb-store/src/stores/[entity].store.ts
import { EntityStore } from './base/entity-store';
import type { Entity } from '../types/[entity].types';

class EntityStoreImpl extends EntityStore<Entity> {
  private static instance: EntityStoreImpl;
  
  static getInstance() {
    if (!this.instance) {
      this.instance = new EntityStoreImpl();
    }
    return this.instance;
  }
  
  // Додаткові computed для специфічних потреб
  activeEntities = computed(() => 
    this.entityList.value.filter(e => !e._deleted)
  );
  
  // RxDB інтеграція
  async initialize() {
    const db = await getDatabase();
    // Завантаження початкових даних
    // Підписка на зміни
  }
}

export const entityStore = EntityStoreImpl.getInstance();
```

### Крок 5: Використання в компонентах

```typescript
import { entityStore } from '@breedhub/rxdb-store';

function MyComponent() {
  const entities = entityStore.entityList.value;
  const total = entityStore.total.value;
  
  const handleAdd = async (data) => {
    await entityStore.create(data);
  };
  
  const handleUpdate = (id, changes) => {
    entityStore.updateOne(id, changes);
  };
  
  return (
    <div>
      Total: {total}
      {entities.map(e => <EntityCard key={e.id} entity={e} />)}
    </div>
  );
}
```

## 🔧 Можливості рефакторингу Configuration Store

Хоча ми НЕ рефакторимо весь Configuration Store, можемо додати Entity-style методи для зручності:

```typescript
// Додати до app-config.signal-store.ts
class AppConfigStore {
  // Існуючий код залишається
  
  // Нові Entity-style методи
  setAll(configs: AppConfig[]) {
    const configMap = new Map();
    configs.forEach(c => configMap.set(c.id, c));
    this.configs.value = configMap;
  }
  
  updateMany(updates: Array<{id: string, changes: Partial<AppConfig>}>) {
    batch(() => {
      updates.forEach(({id, changes}) => {
        this.updateConfig(id, changes);
      });
    });
  }
  
  // Computed selectors
  selectByType = (type: string) => computed(() => 
    Array.from(this.configs.value.values()).filter(c => c.type === type)
  );
  
  selectActive = computed(() =>
    Array.from(this.configs.value.values()).filter(c => !c._deleted)
  );
  
  workspaces = computed(() => this.selectByType('workspace').value);
  pages = computed(() => this.selectByType('page').value);
}
```

## 🎯 Переваги Entity Store Pattern

### Стандартизація
- Всі stores мають однакові методи
- Передбачувана поведінка
- Легше для нових розробників

### Продуктивність
- Нормалізоване зберігання (ids + entities)
- Computed автоматично мемоізуються
- Оптимальні оновлення через Signals

### Масштабованість
- Легко додавати нові сутності
- Базовий функціонал успадковується
- Специфічна логіка додається через розширення

### Сумісність з NgRx
- Знайомий API для Angular розробників
- Легка міграція коду
- Використання best practices

## 📊 Коли що використовувати

| Сценарій | Рішення |
|----------|---------|
| Нова бізнес-сутність | Entity Store |
| UI конфігурації | Configuration Store |
| Прості CRUD операції | Entity Store |
| Складні залежності | Configuration Store |
| Список з фільтрами | Entity Store |
| Ієрархічні структури | Configuration Store |
| Marketplace listings | Entity Store |
| Menu налаштування | Configuration Store |

## 🚀 План міграції

### Phase 1 - Підготовка (DONE)
- ✅ Створити базовий EntityStore клас
- ✅ Документувати підхід

### Phase 2 - Нові сутності (CURRENT)
- Всі нові stores створюємо через EntityStore
- Тестуємо підхід на реальних задачах

### Phase 3 - Selective Migration (FUTURE)
- Ідентифікувати прості stores для міграції
- Мігрувати по одному store
- НЕ чіпати Configuration Store

### Phase 4 - Optimization (FUTURE)
- Додати caching
- Додати pagination
- Додати virtual scrolling support

## ❗ Важливі правила

1. **НЕ рефакторимо** Configuration Store повністю
2. **ЗАВЖДИ** використовуємо Entity Store для нових бізнес-сутностей  
3. **Бізнес-логіка** завжди в stores, НЕ в компонентах
4. **Computed values** для всіх похідних даних
5. **Singleton pattern** для stores

## 🔗 Пов'язана документація

- [STORE_CREATION_GUIDE.md](./STORE_CREATION_GUIDE.md) - Детальна інструкція створення stores
- [PRODUCT_STRATEGY.md](./PRODUCT_STRATEGY.md) - Загальна стратегія продукту