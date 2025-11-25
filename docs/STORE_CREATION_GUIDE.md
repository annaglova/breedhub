# Покрокова інструкція створення нового Store в BreedHub

## 🎯 Поточна Архітектура (2024-11-25)

BreedHub використовує **SpaceStore** як центральний інструмент для роботи з даними.

### Три рівні Store Architecture:

1. **SpaceStore (PRIMARY)** - Універсальний config-driven store для всіх entity types
   - ✅ Використовується для 95% випадків
   - ✅ Config-driven через `app_config` з Supabase
   - ✅ ID-First loading pattern
   - ✅ Dictionary support через DictionaryStore
   - ✅ Child records support через `breed_children` collection

2. **DictionaryStore** - Спеціалізований store для довідників
   - ✅ Universal `dictionaries` collection
   - ✅ Optional `additional` JSON field для extra полів
   - ✅ ID-First pattern для мінімального трафіку

3. **Entity Store Pattern** - Для специфічних випадків
   - ⚠️ Використовується рідко
   - ⚠️ Тільки коли SpaceStore не підходить

### Коли що використовувати:

| Сценарій | Інструмент | Приклад |
|----------|-----------|---------|
| Списки entities (breeds, pets, kennels) | **SpaceStore** | Breed list, Pet profiles |
| Довідники (achievements, colors, sizes) | **DictionaryStore** | Achievement levels, Coat colors |
| Дочірні записи (achievements_in_breed) | **SpaceStore.loadChildRecords()** | Breed achievements, Kennel breeds |
| Складна custom логіка | **Entity Store** | Special calculations |

---

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
- Прямі запити до Supabase

---

## 🏠 Local-First Principle

**ЗАВЖДИ:** Всі дані йдуть через RxDB → Store → UI, ніколи напряму з Supabase в UI.

### Data Flow:
```
Supabase ↔ RxDB (local cache) ↔ Store → UI
```

### Обов'язково:
- ✅ Entity lists через `SpaceStore.applyFilters()` / `loadMore()`
- ✅ Dictionaries через `DictionaryStore.getDictionary()`
- ✅ Child records через `SpaceStore.loadChildRecords()`
- ❌ **НІКОЛИ** не робити `supabase.from('table').select()` напряму в UI

### Приклад (правильно ✅):
```typescript
// ✅ CORRECT: Через SpaceStore
const spaceStore = useSpaceStore();
await spaceStore.applyFilters('breed', { status: 'active' });
const breeds = spaceStore.getEntityStore('breed').entityList.value;
```

### Приклад (неправильно ❌):
```typescript
// ❌ WRONG: Напряму до Supabase в UI
const { data } = await supabase.from('breed').select('*');
```

---

## 🎯 Метод 1: SpaceStore (РЕКОМЕНДОВАНО для 95% випадків)

### Коли використовувати:
- **Завжди** як перший варіант для нових features
- Списки entities (breeds, pets, kennels, clubs)
- Фільтрація та пагінація
- CRUD операції
- Child records (achievements_in_breed, breed_divisions)

### Що НЕ потрібно створювати:
- ❌ Нові stores
- ❌ Нові RxDB schemas
- ❌ Нові collections
- ❌ Нові types

**SpaceStore вже налаштований і готовий до використання!**

### Крок 1: Переконатися що entity config існує в Supabase

Entity configs зберігаються в таблиці `app_config`:

```sql
-- Приклад entity config для breed
SELECT * FROM app_config
WHERE key = 'entity.breed';
```

Config містить:
- `table_name` - назва таблиці в Supabase
- `id_field` - primary key поле (зазвичай 'id')
- `name_field` - поле для відображення назви
- `filters` - доступні фільтри
- `sorts` - доступні сортування
- `fields` - список полів для завантаження

### Крок 2: Використання SpaceStore в компоненті

```typescript
import { useSpaceStore, useSelectedEntity } from '@/contexts/SpaceContext';
import { useEffect } from 'react';

function BreedListComponent() {
  const spaceStore = useSpaceStore();
  const selectedEntity = useSelectedEntity();

  // 1. Load entities з фільтрами
  useEffect(() => {
    spaceStore.applyFilters('breed', {
      status: 'active',
      country: 'Ukraine'
    });
  }, []);

  // 2. Отримати entity store для конкретного типу
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
      {isLoading && <Loader />}

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

### Крок 3: Child Records через SpaceStore

Для дочірніх таблиць (як `achievement_in_breed`) використовуємо `loadChildRecords`:

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

  // achievements тепер містить дані з 'additional' JSON поля
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

### Переваги SpaceStore:

✅ **Zero configuration** - працює out of the box
✅ **ID-First loading** - 70% зменшення трафіку
✅ **Automatic caching** - через RxDB
✅ **Config-driven** - все через `app_config`
✅ **Selection support** - `selectedEntity`, `selectFirst()`
✅ **Pagination** - `loadMore()` з cursor
✅ **Filtering** - через `applyFilters()`
✅ **Child records** - через `loadChildRecords()`

---

## 📚 Метод 2: DictionaryStore (для довідників)

### Коли використовувати:
- Довідники (achievements, coat_colors, pet_sizes)
- Малі таблиці з простою структурою
- Статичні дані що рідко змінюються

### Що НЕ потрібно створювати:
- ❌ Нові schemas
- ❌ Нові collections
- ❌ Нові stores

**DictionaryStore вже налаштований і готовий!**

### Використання в компоненті:

```typescript
import { dictionaryStore } from '@breedhub/rxdb-store';
import { useEffect, useState } from 'react';

function AchievementDictionaryComponent() {
  const [achievements, setAchievements] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadDictionary() {
      try {
        // Ensure initialized
        if (!dictionaryStore.initialized.value) {
          await dictionaryStore.initialize();
        }

        // Load dictionary (ID-First: Supabase IDs → RxDB cache → fetch missing)
        const { records } = await dictionaryStore.getDictionary('achievement', {
          idField: 'id',
          nameField: 'name',
          limit: 100,
          additionalFields: ['int_value', 'position', 'description', 'entity']
        });

        // Filter and transform
        const breedAchievements = records
          .filter(r => r.additional?.entity === 'breed')
          .map(r => ({
            id: r.id,
            name: r.name,
            description: r.additional?.description || '',
            intValue: r.additional?.int_value || 0,
            position: r.additional?.position || 0
          }))
          .sort((a, b) => a.position - b.position);

        setAchievements(breedAchievements);
      } catch (err) {
        console.error('Error loading dictionary:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadDictionary();
  }, []);

  return (
    <div>
      {isLoading ? <Loader /> : (
        achievements.map(achievement => (
          <AchievementCard key={achievement.id} achievement={achievement} />
        ))
      )}
    </div>
  );
}
```

### DictionaryStore Structure:

```typescript
interface DictionaryDocument {
  composite_id: string;  // "achievement::uuid"
  table_name: string;    // "achievement"
  id: string;
  name: string;
  additional?: {         // Optional JSON для extra полів
    int_value?: number;
    position?: number;
    description?: string;
    entity?: string;
    // ... будь-які інші поля
  };
  cachedAt: number;
}
```

### Переваги DictionaryStore:

✅ **Universal schema** - один collection для всіх довідників
✅ **Additional fields** - гнучкість через JSON поле
✅ **ID-First** - завантажує тільки missing records
✅ **Automatic caching** - TTL-based cleanup
✅ **Zero maintenance** - не потрібно створювати нові collections

---

## 🔧 Метод 3: Entity Store Pattern (рідко потрібен)

### Коли використовувати:
- ⚠️ **Тільки якщо SpaceStore не підходить**
- Складна специфічна логіка
- Custom computed values
- Унікальні бізнес-правила

### Передумови:
Таблиця вже створена в Supabase з полем `id` (не `uid`!)

### Крок 1: Створити типи

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
      type: 'string',
      maxLength: 250  // ВАЖЛИВО для timestamps з мікросекундами
    },
    updated_at: {
      type: 'string',
      maxLength: 250
    },
    _deleted: {
      type: 'boolean'
    }
  },
  required: ['id', 'name', 'created_at', 'updated_at'],
  indexes: [
    'name',  // Тільки якщо потрібен пошук
    ['_deleted', 'created_at']  // Composite для filtered lists
  ]
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
  dictionaries: DictionaryCollection;
  breed_children: BreedChildrenCollection;
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

### Крок 4: Створити Entity Store

**Файл:** `packages/rxdb-store/src/stores/[entity-name].store.ts`

```typescript
import { computed } from '@preact/signals-react';
import { EntityStore } from './base/entity-store';
import { getDatabase } from '../services/database.service';
import { createClient } from '@supabase/supabase-js';
import type { EntityDefinition } from '../types/[entity-name].types';

class EntityStoreImpl extends EntityStore<EntityDefinition> {
  private static instance: EntityStoreImpl;
  private supabase: any = null;

  static getInstance() {
    if (!this.instance) {
      this.instance = new EntityStoreImpl();
      this.instance.initialize();
    }
    return this.instance;
  }

  private constructor() {
    super();
    this.initializeSupabase();
  }

  private initializeSupabase() {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey);
    }
  }

  // Специфічні computed
  activeEntities = computed(() =>
    this.entityList.value.filter(e => !e._deleted)
  );

  // RxDB інтеграція
  async initialize() {
    try {
      this.loading.value = true;
      const db = await getDatabase();
      const collection = db.collections.entities;

      // Завантаження даних з RxDB
      const docs = await collection.find().exec();
      this.setAll(docs.map(d => d.toJSON()));

      // Підписка на зміни
      collection.$.subscribe(changeEvent => {
        if (changeEvent.operation === 'INSERT' || changeEvent.operation === 'UPDATE') {
          const data = changeEvent.documentData;
          if (data && data.id) {
            this.addOne(data);
          }
        } else if (changeEvent.operation === 'DELETE') {
          const deleteId = changeEvent.documentId || changeEvent.documentData?.id;
          if (deleteId) {
            this.removeOne(deleteId);
          }
        }
      });

      // Auto-sync з Supabase
      if (this.supabase) {
        await this.syncFromSupabase();
      }
    } catch (error) {
      this.error.value = error instanceof Error ? error.message : 'Failed to initialize';
    } finally {
      this.loading.value = false;
    }
  }

  // CRUD з RxDB + Supabase sync
  async create(data: Omit<EntityDefinition, 'id' | 'created_at' | 'updated_at'>) {
    this.loading.value = true;
    try {
      const db = await getDatabase();
      const id = crypto.randomUUID();
      const now = new Date().toISOString();

      const newEntity: EntityDefinition = {
        ...data,
        id,
        created_at: now,
        updated_at: now,
        _deleted: false
      };

      // 1. Insert to RxDB (local)
      await db.collections.entities.insert(newEntity);
      this.addOne(newEntity);

      // 2. Sync to Supabase
      if (this.supabase) {
        await this.supabase
          .from('entities')
          .insert({
            ...newEntity,
            deleted: newEntity._deleted  // Map _deleted → deleted
          });
      }

      return newEntity;
    } catch (error) {
      this.error.value = `Failed to create: ${error}`;
      throw error;
    } finally {
      this.loading.value = false;
    }
  }

  async update(id: string, changes: Partial<EntityDefinition>) {
    this.loading.value = true;
    try {
      const db = await getDatabase();
      const doc = await db.collections.entities.findOne(id).exec();

      if (!doc) {
        throw new Error(`Entity ${id} not found`);
      }

      const updates = {
        ...changes,
        updated_at: new Date().toISOString()
      };

      // 1. Update RxDB
      await doc.patch(updates);
      this.updateOne(id, updates);

      // 2. Sync to Supabase
      if (this.supabase) {
        await this.supabase
          .from('entities')
          .update(updates)
          .eq('id', id);
      }
    } catch (error) {
      this.error.value = `Failed to update: ${error}`;
      throw error;
    } finally {
      this.loading.value = false;
    }
  }

  async delete(id: string) {
    this.loading.value = true;
    try {
      const db = await getDatabase();
      const doc = await db.collections.entities.findOne(id).exec();

      if (!doc) {
        throw new Error(`Entity ${id} not found`);
      }

      // Soft delete
      await doc.patch({
        _deleted: true,
        updated_at: new Date().toISOString()
      });

      if (this.supabase) {
        await this.supabase
          .from('entities')
          .update({
            deleted: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', id);
      }
    } catch (error) {
      this.error.value = `Failed to delete: ${error}`;
      throw error;
    } finally {
      this.loading.value = false;
    }
  }

  private async syncFromSupabase() {
    try {
      const { data, error } = await this.supabase
        .from('entities')
        .select('*')
        .order('name');

      if (error) throw error;

      if (data && data.length > 0) {
        const db = await getDatabase();
        const collection = db.collections.entities;

        // Map Supabase fields → RxDB
        const mappedData = data.map((item: any) => ({
          id: item.id,
          name: item.name,
          created_at: item.created_at,
          updated_at: item.updated_at,
          _deleted: item.deleted || false  // deleted → _deleted
        }));

        await collection.bulkUpsert(mappedData);
      }
    } catch (error) {
      console.error('[EntityStore] Sync failed:', error);
    }
  }
}

export const entityStore = EntityStoreImpl.getInstance();
```

### Крок 5: Експортувати з index.ts

**Файл:** `packages/rxdb-store/src/index.ts`

```typescript
// Entity Store
export { entityStore } from './stores/[entity-name].store';
export type { EntityDefinition, EntityDocument } from './types/[entity-name].types';
export { entitySchema } from './collections/[entity-name].schema';
```

### Використання в компонентах:

```typescript
import { entityStore } from '@breedhub/rxdb-store';

const MyComponent = () => {
  const entities = entityStore.activeEntities.value;
  const total = entityStore.total.value;
  const isLoading = entityStore.loading.value;

  const handleCreate = async (data) => {
    await entityStore.create(data);
  };

  const handleUpdate = async (id, changes) => {
    await entityStore.update(id, changes);
  };

  const handleDelete = async (id) => {
    await entityStore.delete(id);
  };

  return (
    <div>
      <h2>Total: {total}</h2>
      {isLoading && <Loader />}
      {entities.map(entity => (
        <EntityCard
          key={entity.id}
          entity={entity}
          onUpdate={(changes) => handleUpdate(entity.id, changes)}
          onDelete={() => handleDelete(entity.id)}
        />
      ))}
    </div>
  );
};
```

---

## 🎯 Порівняння підходів

| Аспект | SpaceStore | DictionaryStore | Entity Store |
|--------|-----------|----------------|--------------|
| **Використання** | 95% випадків | Довідники | Рідко |
| **Setup** | Zero config | Zero config | Складний |
| **Гнучкість** | Висока | Середня | Максимальна |
| **ID-First** | ✅ Так | ✅ Так | ⚠️ Manual |
| **Caching** | ✅ Auto | ✅ Auto | ⚠️ Manual |
| **Config-driven** | ✅ Так | ⚠️ Частково | ❌ Ні |
| **Child records** | ✅ Так | ❌ Ні | ⚠️ Manual |
| **Selection** | ✅ Так | ❌ Ні | ✅ Так |
| **Pagination** | ✅ Так | ❌ Ні | ⚠️ Manual |
| **Maintenance** | Низький | Низький | Високий |

---

## КРИТИЧНІ моменти - НЕ ЗАБУТИ!

### 1. Local-First Pattern
- ✅ Всі дані через RxDB → Store → UI
- ❌ **НІКОЛИ** напряму `supabase.from()` в компонентах

### 2. Primary Key
- ✅ Завжди використовуйте `id`, НЕ `uid`
- ✅ Тип: `string` з `maxLength: 100`

### 3. Мапінг полів при синхронізації
- Supabase `deleted` → RxDB `_deleted`
- RxDB `_deleted` → Supabase `deleted`

### 4. Timestamps
- ✅ `maxLength: 250` для timestamps (підтримка мікросекунд)
- ✅ ISO 8601 format

### 5. Soft Delete
- ✅ Використовуйте `_deleted: boolean`
- ❌ НЕ використовуйте фізичне видалення

### 6. SpaceStore First
- ✅ **Завжди** спочатку розглядайте SpaceStore
- ✅ Тільки потім інші варіанти

### 7. Additional Fields Pattern
- ✅ DictionaryStore: `additional` JSON поле
- ✅ Child Collections: `additional` JSON поле
- ✅ Flexible schema без bloat

---

## Типові помилки

### Помилки RxDB:
- **"Cannot access 'getDatabase' before initialization"** - circular dependency, розділіть файли
- **"collection not found"** - забули додати в database.service.ts
- **"another instance created this collection with different schema"** - схема змінилась, очистіть IndexedDB

### Помилки схеми:
- **422 status при bulkUpsert** - невірний мапінг полів або схема не відповідає даним
- **"must NOT have more than X characters"** - збільште maxLength (рекомендовано 250 для timestamps)
- **"must NOT have additional properties"** - не додавайте `deleted` в RxDB, тільки `_deleted`
- **"object does not match schema"** - перевірте що всі required поля присутні

### Помилки бази:
- **"db.destroy is not a function"** - база зламана, очистіть IndexedDB через браузер
- **Boolean поля в індексах** - МАЮТЬ бути в `required`
- **Nullable поля** - НЕ можна використовувати в індексах

---

## Важливі особливості RxDB схем

### maxLength для текстових полів
Всі текстові поля що використовуються в індексах МАЮТЬ мати `maxLength`:
- ID та основні поля: `100`
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

---

## Очищення бази при помилках схеми

Якщо змінили схему і отримуєте помилку "another instance created this collection with different schema":

### 1. Через UI браузера:
- Відкрийте Developer Tools (F12)
- Application/Storage → IndexedDB
- Видаліть базу `breedhub`
- Перезавантажте сторінку

### 2. Через консоль браузера:
```javascript
// Видалити всі бази
const dbs = await indexedDB.databases();
for (const db of dbs) {
  indexedDB.deleteDatabase(db.name);
}
location.reload();
```

### 3. Конкретні бази RxDB:
```javascript
indexedDB.deleteDatabase('breedhub');
indexedDB.deleteDatabase('_rxdb_internal');
indexedDB.deleteDatabase('rxdb-dexie-breedhub');
location.reload();
```

---

## Налагодження синхронізації

Додайте логування в store для діагностики:

```typescript
console.log('[Store] Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('[Store] Query result:', { data, error });
console.log('[Store] Mapped data:', mappedData);
console.log('[Store] BulkUpsert result:', result);
```

### Перевірка даних з Supabase:
1. Чи є файл `.env` з правильними credentials
2. Чи повертає Supabase дані (перевірте в Network tab)
3. Чи всі required поля присутні в даних
4. Чи правильно мапляться поля (особливо `deleted` → `_deleted`)

---

## Чеклист для нового store

### SpaceStore (РЕКОМЕНДОВАНО - 95% випадків)
- [ ] Перевірено що це entity з CRUD операціями
- [ ] Entity config існує в `app_config` Supabase
- [ ] Використовується `useSpaceStore()` в компонентах
- [ ] Використовується `applyFilters()` для фільтрації
- [ ] Використовується `loadMore()` для пагінації
- [ ] Для child records використовується `useChildRecords()` hook
- [ ] **НЕ створено** нових stores/schemas/collections

### DictionaryStore (для довідників)
- [ ] Це довідник (мала таблиця з простою структурою)
- [ ] Використовується `dictionaryStore.getDictionary()`
- [ ] Вказано `additionalFields` для extra полів
- [ ] Дані фільтруються client-side (малі обсяги)
- [ ] **НЕ створено** нових schemas/collections

### Entity Store (тільки якщо SpaceStore не підходить!)
- [ ] Обґрунтовано чому SpaceStore не підходить
- [ ] Створено типи в `types/[entity].types.ts`
- [ ] Створено схему в `collections/[entity].schema.ts`
- [ ] Всі string поля в індексах мають `maxLength`
- [ ] Boolean поля в індексах додані в `required`
- [ ] Використовується `_deleted`, НЕ `deleted` в RxDB
- [ ] Додано колекцію в `database.service.ts`
- [ ] Створено Entity Store що extends EntityStore
- [ ] Правильний мапінг `deleted` <-> `_deleted`
- [ ] Експортовано з `index.ts`
- [ ] Немає circular dependencies

---

## 🔗 Пов'язана документація

- [CORE_PRINCIPLES.md](./CORE_PRINCIPLES.md) - Local-First Architecture principles
- [CONFIG_ARCHITECTURE.md](./CONFIG_ARCHITECTURE.md) - Config-driven development
- [LOCAL_FIRST_ROADMAP.md](./LOCAL_FIRST_ROADMAP.md) - Overall architecture roadmap
- [CHILD_TABLES_IMPLEMENTATION_PLAN.md](./CHILD_TABLES_IMPLEMENTATION_PLAN.md) - Child collections pattern

---

**Last Updated:** 2024-11-25
