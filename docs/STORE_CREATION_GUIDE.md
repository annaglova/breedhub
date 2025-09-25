# Покрокова інструкція створення нового Store в BreedHub

## 🆕 ОНОВЛЕНО: Entity Store Pattern

Тепер ми використовуємо **два підходи** для stores:
1. **Entity Store Pattern** - для всіх нових бізнес-сутностей (РЕКОМЕНДОВАНО)
2. **Legacy підхід** - для складних конфігурацій (залишаємо як є)

Дивіться [STORE_ARCHITECTURE.md](./STORE_ARCHITECTURE.md) для детальної інформації про вибір підходу.

## КРИТИЧНО ВАЖЛИВИЙ ПРИНЦИП

### Функціонал пишемо на сторах, а НЕ на компонентах!
**ЗАВЖДИ** вся бізнес-логіка, обробка даних, розрахунки та правила мають бути в stores. Компоненти React відповідають ТІЛЬКИ за відображення UI та виклик методів store.

#### ✅ Що має бути в Store:
- Вся бізнес-логіка
- Обробка і трансформація даних
- Валідація
- Розрахунки
- API виклики
- Управління станом
- Кешування
- Оптимізація

#### ✅ Що має бути в Компоненті:
- Рендеринг UI
- Обробка подій користувача
- Виклик методів store
- Локальний UI стан (відкрито/закрито модал тощо)

#### ❌ НІКОЛИ не робіть в Компоненті:
- Прямі трансформації даних
- Бізнес-правила
- Складні розрахунки
- Фільтрацію/сортування (окрім UI презентації)

## Передумови
- Таблиця вже створена в Supabase
- Всі таблиці мають стандартну структуру з полем `id` (не `uid`!)

## 🎯 Метод 1: Entity Store Pattern (РЕКОМЕНДОВАНО)

### Коли використовувати
- Для всіх нових бізнес-сутностей (тварини, користувачі, повідомлення, клуби, події)
- Коли потрібні стандартні CRUD операції
- Для простих списків з фільтрацією та сортуванням

### Крок 1: Створити базовий EntityStore (якщо ще не існує)

**Файл:** `packages/rxdb-store/src/stores/base/entity-store.ts`

```typescript
import { signal, computed } from '@preact/signals-react';

export class EntityStore<T extends { id: string }> {
  protected ids = signal<string[]>([]);
  protected entities = signal<Map<string, T>>(new Map());
  
  // Computed як в NgRx withEntities
  entityMap = computed(() => this.entities.value);
  entityList = computed(() => 
    this.ids.value.map(id => this.entities.value.get(id)!).filter(Boolean)
  );
  total = computed(() => this.ids.value.length);
  
  // Entity methods
  setAll(entities: T[]) { /* ... */ }
  addOne(entity: T) { /* ... */ }
  updateOne(id: string, changes: Partial<T>) { /* ... */ }
  removeOne(id: string) { /* ... */ }
  // ... інші методи
}
```

### Крок 2: Створити специфічний Entity Store

**Файл:** `packages/rxdb-store/src/stores/[entity-name].store.ts`

```typescript
import { computed } from '@preact/signals-react';
import { EntityStore } from './base/entity-store';
import { getDatabase } from '../services/database.service';
import type { EntityDefinition } from '../types/[entity-name].types';

class EntityStoreImpl extends EntityStore<EntityDefinition> {
  private static instance: EntityStoreImpl;
  
  static getInstance() {
    if (!this.instance) {
      this.instance = new EntityStoreImpl();
      this.instance.initialize();
    }
    return this.instance;
  }
  
  // Специфічні computed
  activeEntities = computed(() => 
    this.entityList.value.filter(e => !e._deleted)
  );
  
  // RxDB інтеграція
  async initialize() {
    const db = await getDatabase();
    const collection = db.collections.entities;
    
    // Завантаження даних
    const docs = await collection.find().exec();
    this.setAll(docs.map(d => d.toJSON()));
    
    // Підписка на зміни
    collection.$.subscribe(changeEvent => {
      // Оновлення store при змінах
    });
  }
  
  // CRUD з RxDB
  async create(data: Omit<EntityDefinition, 'id'>) {
    const db = await getDatabase();
    const newEntity = {
      ...data,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString()
    };
    
    await db.collections.entities.insert(newEntity);
    this.addOne(newEntity as EntityDefinition);
    return newEntity;
  }
  
  async update(id: string, changes: Partial<EntityDefinition>) {
    const db = await getDatabase();
    const doc = await db.collections.entities.findOne(id).exec();
    if (doc) {
      await doc.patch(changes);
      this.updateOne(id, changes);
    }
  }
}

export const entityStore = EntityStoreImpl.getInstance();
```

## 🔧 Метод 2: Legacy підхід (для складних випадків)

### Коли використовувати
- Для конфігурацій UI
- Коли є складні ієрархічні залежності
- Для систем з каскадними оновленнями

### Крок 1: Створити типи для нової сутності

**Файл:** `packages/rxdb-store/src/types/[entity-name].types.ts`

```typescript
import type { RxDocument, RxCollection } from 'rxdb';

// 1. Основний інтерфейс сутності
export interface EntityDefinition {
  id: string;
  name: string;
  // ... інші поля з Supabase таблиці
  created_at: string;
  updated_at: string;
  _deleted?: boolean;  // ВАЖЛИВО: для soft delete
}

// 2. RxDB типи
export type EntityDocument = RxDocument<EntityDefinition>;
export type EntityCollection = RxCollection<EntityDefinition>;
```

### Крок 2: Створити RxDB схему

**Файл:** `packages/rxdb-store/src/collections/[entity-name].schema.ts`

```typescript
import { RxJsonSchema } from 'rxdb';
import { EntityDefinition } from '../types/[entity-name].types';

export const entitySchema: RxJsonSchema<EntityDefinition> = {
  version: 0,
  primaryKey: 'id',  // ЗАВЖДИ 'id', не 'uid'!
  type: 'object',
  properties: {
    id: {
      type: 'string',
      maxLength: 100
    },
    name: {
      type: 'string'
    },
    // ... інші поля відповідно до типу
    created_at: {
      type: 'string'
    },
    updated_at: {
      type: 'string'
    },
    _deleted: {
      type: 'boolean'
    }
  },
  required: ['id', 'name', 'created_at', 'updated_at']
};
```

### Крок 3: Додати колекцію до Database Service

**Файл:** `packages/rxdb-store/src/services/database.service.ts`

```typescript
// 1. Імпортувати схему та типи
import { entitySchema } from '../collections/[entity-name].schema';
import { EntityCollection } from '../types/[entity-name].types';

// 2. Додати до типу DatabaseCollections
export type DatabaseCollections = {
  breeds: BreedCollectionTyped;
  books: BookCollection;
  property_registry: PropertyCollection;
  entities: EntityCollection;  // <-- ДОДАТИ
};

// 3. Додати колекцію в createDatabase()
const collectionsToAdd = {
  // ... існуючі колекції
  entities: {
    schema: entitySchema
  }
};
```

### Крок 4: Створити Signal Store (Legacy підхід)

**Файл:** `packages/rxdb-store/src/stores/[entity-name].signal-store.ts`

```typescript
import { signal, computed, batch } from '@preact/signals-react';
import { getDatabase } from '../services/database.service';
import { createClient } from '@supabase/supabase-js';
import { Subscription } from 'rxjs';
import type { RxCollection } from 'rxdb';
import { EntityDefinition, EntityDocument } from '../types/[entity-name].types';

export type { EntityDefinition, EntityDocument } from '../types/[entity-name].types';

class EntitySignalStore {
  private static instance: EntitySignalStore;
  
  // Signals
  entities = signal<Map<string, EntityDefinition>>(new Map());
  loading = signal<boolean>(false);
  error = signal<string | null>(null);
  syncEnabled = signal<boolean>(false);
  
  // Computed values
  entitiesList = computed(() => {
    const entitiesMap = this.entities.value;
    return Array.from(entitiesMap.values())
      .filter(entity => !entity._deleted)
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  });
  
  totalCount = computed(() => {
    return this.entitiesList.value.length;
  });
  
  private dbSubscription: Subscription | null = null;
  private supabase: any = null;
  
  private constructor() {
    this.initializeSupabase();
    this.initializeStore();
  }
  
  static getInstance(): EntitySignalStore {
    if (!EntitySignalStore.instance) {
      EntitySignalStore.instance = new EntitySignalStore();
    }
    return EntitySignalStore.instance;
  }
  
  private initializeSupabase() {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey);
    }
  }
  
  private async initializeStore() {
    try {
      this.loading.value = true;
      const db = await getDatabase();
      
      if (!db.collections.entities) {  // <-- ЗМІНИТИ назву колекції
        this.error.value = 'Entities collection not initialized';
        return;
      }
      
      const collection = db.collections.entities as RxCollection<EntityDefinition>;
      
      // Load initial data
      const allEntities = await collection.find().exec();
      const entitiesMap = new Map<string, EntityDefinition>();
      
      allEntities.forEach((doc: EntityDocument) => {
        entitiesMap.set(doc.id, doc.toJSON() as EntityDefinition);
      });
      
      this.entities.value = entitiesMap;
      
      // Subscribe to changes
      this.dbSubscription = collection.$.subscribe((changeEvent: any) => {
        if (changeEvent.operation === 'INSERT' || changeEvent.operation === 'UPDATE') {
          const newEntities = new Map(this.entities.value);
          const entityData = changeEvent.documentData;
          
          if (entityData && entityData.id) {
            newEntities.set(entityData.id, entityData);
          }
          
          this.entities.value = newEntities;
        } else if (changeEvent.operation === 'DELETE') {
          const newEntities = new Map(this.entities.value);
          const deleteId = changeEvent.documentId || changeEvent.documentData?.id;
          
          if (deleteId) {
            newEntities.delete(deleteId);
          }
          
          this.entities.value = newEntities;
        }
      });
      
      // Auto-enable sync if Supabase configured
      if (this.supabase) {
        try {
          await this.enableSync();
        } catch (syncError) {
          console.error('Failed to enable sync:', syncError);
        }
      }
      
    } catch (error) {
      this.error.value = error instanceof Error ? error.message : 'Failed to initialize store';
    } finally {
      this.loading.value = false;
    }
  }
  
  async enableSync(): Promise<void> {
    if (!this.supabase) {
      throw new Error('Supabase client not initialized');
    }
    
    try {
      const db = await getDatabase();
      const collection = db.collections.entities as RxCollection<EntityDefinition>;
      
      // Pull from Supabase
      const { data, error } = await this.supabase
        .from('entities')  // <-- ЗМІНИТИ назву таблиці
        .select('*')
        .order('name');
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        // ВАЖЛИВО: Мапінг полів Supabase -> RxDB
        const mappedData = data.map((item: any) => ({
          id: item.id,
          name: item.name,
          // ... інші поля
          created_at: item.created_at,
          updated_at: item.updated_at,
          _deleted: item.deleted || false  // ВАЖЛИВО: deleted -> _deleted
        }));
        
        await collection.bulkUpsert(mappedData);
      }
      
      this.syncEnabled.value = true;
      
    } catch (error) {
      throw error;
    }
  }
  
  async createEntity(entity: Omit<EntityDefinition, 'id' | 'created_at' | 'updated_at'>): Promise<EntityDefinition> {
    this.loading.value = true;
    try {
      const db = await getDatabase();
      const collection = db.collections.entities as RxCollection<EntityDefinition>;
      
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      
      const newEntity: EntityDefinition = {
        ...entity,
        id,
        created_at: now,
        updated_at: now,
        _deleted: false
      };
      
      await collection.insert(newEntity);
      
      if (this.syncEnabled.value && this.supabase) {
        await this.supabase
          .from('entities')  // <-- ЗМІНИТИ назву таблиці
          .insert({
            ...newEntity,
            deleted: newEntity._deleted  // ВАЖЛИВО: _deleted -> deleted
          });
      }
      
      return newEntity;
    } catch (error) {
      this.error.value = `Failed to create entity: ${error}`;
      throw error;
    } finally {
      this.loading.value = false;
    }
  }
  
  async updateEntity(id: string, updates: Partial<EntityDefinition>): Promise<void> {
    this.loading.value = true;
    try {
      const db = await getDatabase();
      const collection = db.collections.entities as RxCollection<EntityDefinition>;
      
      const doc = await collection.findOne(id).exec();
      if (!doc) {
        throw new Error(`Entity ${id} not found`);
      }
      
      await doc.patch({
        ...updates,
        updated_at: new Date().toISOString()
      });
      
      if (this.syncEnabled.value && this.supabase) {
        await this.supabase
          .from('entities')  // <-- ЗМІНИТИ назву таблиці
          .update({
            ...updates,
            updated_at: new Date().toISOString()
          })
          .eq('id', id);
      }
      
    } catch (error) {
      this.error.value = `Failed to update entity: ${error}`;
      throw error;
    } finally {
      this.loading.value = false;
    }
  }
  
  async deleteEntity(id: string): Promise<void> {
    this.loading.value = true;
    try {
      const db = await getDatabase();
      const collection = db.collections.entities as RxCollection<EntityDefinition>;
      
      const doc = await collection.findOne(id).exec();
      if (!doc) {
        throw new Error(`Entity ${id} not found`);
      }
      
      // Soft delete
      await doc.patch({
        _deleted: true,
        updated_at: new Date().toISOString()
      });
      
      if (this.syncEnabled.value && this.supabase) {
        await this.supabase
          .from('entities')  // <-- ЗМІНИТИ назву таблиці
          .update({ 
            deleted: true, 
            updated_at: new Date().toISOString() 
          })
          .eq('id', id);
      }
      
    } catch (error) {
      this.error.value = `Failed to delete entity: ${error}`;
      throw error;
    } finally {
      this.loading.value = false;
    }
  }
  
  cleanup() {
    if (this.dbSubscription) {
      this.dbSubscription.unsubscribe();
      this.dbSubscription = null;
    }
  }
}

export const entityStore = EntitySignalStore.getInstance();
```

### Крок 5: Експортувати з index.ts

**Файл:** `packages/rxdb-store/src/index.ts`

```typescript
// Entity Store
export { entityStore } from './stores/[entity-name].signal-store';
export type { EntityDefinition, EntityDocument } from './types/[entity-name].types';
export { entitySchema } from './collections/[entity-name].schema';
```

## Використання в компонентах

### Entity Store Pattern

```typescript
import { entityStore } from '@breedhub/rxdb-store';

const MyComponent = () => {
  const entities = entityStore.entityList.value;
  const total = entityStore.total.value;
  
  const handleCreate = async (data) => {
    await entityStore.create(data);
  };
  
  const handleUpdate = (id, changes) => {
    entityStore.updateOne(id, changes);
  };
  
  return (
    <div>
      <h2>Total: {total}</h2>
      {entities.map(entity => (
        <EntityCard key={entity.id} entity={entity} />
      ))}
    </div>
  );
};
```

### Legacy підхід

```typescript
import { entityStore, type EntityDefinition } from '@breedhub/rxdb-store';

const MyComponent = () => {
  const entities = entityStore.entitiesList.value;
  const loading = entityStore.loading.value;
  const error = entityStore.error.value;
  
  // Subscribe to changes
  useEffect(() => {
    const unsubscribe = entityStore.entitiesList.subscribe(() => {
      forceUpdate({});
    });
    return () => unsubscribe();
  }, []);
  
  // CRUD operations
  const handleCreate = async (data) => {
    await entityStore.createEntity(data);
  };
  
  const handleUpdate = async (id, updates) => {
    await entityStore.updateEntity(id, updates);
  };
  
  const handleDelete = async (id) => {
    await entityStore.deleteEntity(id);
  };
  
  return (
    // Your UI
  );
};
```

## КРИТИЧНІ моменти - НЕ ЗАБУТИ!

1. **Завжди використовуйте `id`, НЕ `uid`** як primary key
2. **Мапінг полів при синхронізації:**
   - Supabase `deleted` -> RxDB `_deleted`
   - RxDB `_deleted` -> Supabase `deleted`
3. **Розділіть типи, схеми та стори** у різні файли щоб уникнути circular dependencies
4. **Автоматична синхронізація** відбувається в `initializeStore()` - не потрібні кнопки
5. **Soft delete** - використовуйте `_deleted` поле замість фізичного видалення

## 🚀 Стратегія розвитку Store Architecture

### Поточний стан
1. **Configuration Store** - залишається для UI конфігурацій (НЕ чіпаємо)
2. **Entity Store Pattern** - для всіх нових бізнес-сутностей (АКТИВНО використовуємо)
3. **Legacy stores** - поступова міграція на Entity Store Pattern де можливо

### План розвитку

#### Phase 1 (CURRENT) - Entity Store для нових сутностей
- ✅ Створено базовий EntityStore клас
- ✅ Документовано підхід
- 🔄 Використовуємо для всіх нових features

#### Phase 2 - Оптимізація Entity Store
- Додати підтримку pagination
- Додати підтримку virtual scrolling
- Додати caching strategies
- Додати optimistic updates

#### Phase 3 - Selective Migration
- Ідентифікувати прості legacy stores
- Мігрувати на Entity Store Pattern
- Configuration Store залишити як є

## Майбутнє: Universal Store Architecture (довгострокова перспектива)

### Концепція
Замість створення окремого store для кожної сутності, ми рухаємось до єдиного універсального store, який конфігурується:

```typescript
// Замість цього:
class BreedStore { /* специфічний код */ }
class PetStore { /* специфічний код */ }

// Будемо мати це:
class UniversalStore {
  constructor(config: EntityConfig) {
    // Store адаптується під конфігурацію
  }
}

// Використання:
const breedStore = new UniversalStore(breedConfig);
const petStore = new UniversalStore(petConfig);
```

### Переваги Universal Store:

1. **Zero-code для нових сутностей** - тільки конфігурація
2. **Консистентність** - всі stores працюють однаково
3. **Легше тестування** - один store для всіх випадків
4. **Автоматичні оптимізації** - покращення в одному місці
5. **Type-safety** - через TypeScript generics

### Конфігурація визначатиме:

```typescript
interface EntityConfig {
  tableName: string;
  primaryKey: string;
  fields: FieldConfig[];
  validations: ValidationRule[];
  relations: RelationConfig[];
  indexes: IndexConfig[];
  hooks: {
    beforeCreate?: (data: any) => any;
    afterCreate?: (data: any) => void;
    beforeUpdate?: (data: any) => any;
    afterUpdate?: (data: any) => void;
  };
  features: {
    softDelete: boolean;
    versioning: boolean;
    audit: boolean;
    realtime: boolean;
  };
}
```

### Міграція на Universal Store:

1. **Phase 1**: Створити UniversalStore клас
2. **Phase 2**: Адаптувати існуючі stores
3. **Phase 3**: Генерувати конфігурації з app_config
4. **Phase 4**: Повністю перейти на конфігураційний підхід

### Інтеграція з Property-Based Config:

- Конфігурації stores будуть частиною app_config
- Properties визначатимуть поведінку полів
- Наслідування та override працюватимуть для stores
- Динамічне створення stores з конфігурацій

## Перевірка роботи

1. Перевірте що колекція додана в `database.service.ts`
2. Перевірте експорти в `index.ts`
3. Запустіть додаток і перевірте консоль на помилки
4. Перевірте що дані завантажуються з Supabase автоматично
5. Перевірте CRUD операції

## Типові помилки

- **"Cannot access 'getDatabase' before initialization"** - circular dependency, розділіть файли
- **"collection not found"** - забули додати в database.service.ts
- **"does not provide an export"** - забули додати експорт в index.ts
- **422 status при bulkUpsert** - невірний мапінг полів або схема не відповідає даним
- **"must NOT have more than X characters"** - збільште maxLength для текстових полів (рекомендовано 250)
- **"must NOT have additional properties"** - не додавайте поле `deleted` в RxDB документ, використовуйте тільки `_deleted`
- **"object does not match schema"** - перевірте що всі required поля присутні
- **"db.destroy is not a function"** - база зламана, очистіть IndexedDB через браузер
- **"another instance created this collection with different schema"** - схема змінилась, потрібно видалити IndexedDB

## Важливі особливості RxDB схем

### maxLength для текстових полів
Всі текстові поля що використовуються в індексах МАЮТЬ мати `maxLength`. Рекомендовані значення:
- ID та основні поля: `250` 
- Enum поля: `50`
- Timestamps: `250` (для підтримки різних форматів з мікросекундами)

### Зарезервовані поля
RxDB автоматично додає ці поля, НЕ додавайте їх в схему вручну:
- `_attachments` - додається автоматично
- `_meta` - додається автоматично
- `_rev` - додається автоматично

### Мапінг полів Supabase <-> RxDB
| Supabase | RxDB | Примітка |
|----------|------|----------|
| `deleted` | `_deleted` | Soft delete поле |
| `id` | `id` | Primary key, завжди string |
| всі інші | без змін | |

### Boolean поля в індексах
Boolean поля що використовуються в індексах МАЮТЬ бути в `required`. Наприклад `_deleted`.

### Nullable поля
Поля з типом `['string', 'null']` НЕ можна використовувати в індексах. Або робіть поле required, або не індексуйте.

## Очищення бази при помилках схеми

Якщо змінили схему і отримуєте помилку "another instance created this collection with different schema":

1. **Через UI браузера:**
   - Відкрийте Developer Tools (F12)
   - Application/Storage → IndexedDB
   - Видаліть базу `breedhub`
   - Перезавантажте сторінку

2. **Через консоль браузера:**
```javascript
// Видалити всі бази
const dbs = await indexedDB.databases();
for (const db of dbs) {
  indexedDB.deleteDatabase(db.name);
}
location.reload();
```

3. **Конкретні бази RxDB:**
```javascript
indexedDB.deleteDatabase('breedhub');
indexedDB.deleteDatabase('_rxdb_internal');
indexedDB.deleteDatabase('rxdb-dexie-breedhub');
location.reload();
```

## Налагодження синхронізації

Додайте логування в store для діагностики:

```typescript
console.log('[Store] Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('[Store] Query result:', { data, error });
console.log('[Store] Mapped data:', mappedData);
console.log('[Store] BulkUpsert result:', result);
```

### Перевірка даних з Supabase
1. Чи є файл `.env` з правильними credentials
2. Чи повертає Supabase дані (перевірте в Network tab)
3. Чи всі required поля присутні в даних
4. Чи правильно мапляться поля (особливо `deleted` → `_deleted`)

## Чеклист для нового store

### Entity Store Pattern (РЕКОМЕНДОВАНО)
- [ ] Визначено що це бізнес-сутність (не конфігурація)
- [ ] Створено або перевірено існування `base/entity-store.ts`
- [ ] Створено типи в `types/[entity].types.ts`
- [ ] Створено схему в `collections/[entity].schema.ts`
- [ ] Створено Entity Store в `stores/[entity].store.ts` що extends EntityStore
- [ ] Додано специфічні computed values
- [ ] Реалізовано CRUD методи з RxDB
- [ ] Додано колекцію в `database.service.ts`
- [ ] Експортовано з `index.ts`

### Legacy підхід (для складних випадків)
- [ ] Створено типи в `types/[entity].types.ts`
- [ ] Створено схему в `collections/[entity].schema.ts` 
- [ ] Всі string поля в індексах мають `maxLength`
- [ ] Boolean поля в індексах додані в `required`
- [ ] Використовується `_deleted`, НЕ `deleted` в RxDB
- [ ] Додано колекцію в `database.service.ts`
- [ ] Створено signal store в `stores/[entity].signal-store.ts`
- [ ] Правильний мапінг `deleted` <-> `_deleted`
- [ ] Експортовано з `index.ts`
- [ ] Немає circular dependencies
- [ ] Store автоматично синхронізується в `initializeStore()`
- [ ] НЕ додано кнопок для ручної синхронізації

## 🔗 Пов'язана документація

- [STORE_ARCHITECTURE.md](./STORE_ARCHITECTURE.md) - Детальна архітектура Store Pattern
- [PRODUCT_STRATEGY.md](./PRODUCT_STRATEGY.md) - Стратегія розвитку продукту