# Public Page Implementation Plan - Config-Driven Architecture

**Дата:** 2025-10-27
**Статус:** 🟡 Planning Phase
**Автор:** Analysis & Architecture Design

---

## 📋 Executive Summary

**🎯 Angular Reference:** `/Users/annaglova/projects/org` - 99% UI вже зроблено
**Підхід:** Переносимо крок за кроком, дивлячись на Angular implementation

Задача: Створити config-driven систему для Public Pages з підтримкою:
1. **Universal Page Template** - замість хардкоду окремих компонентів
2. **Child Tables Storage** - ефективне зберігання в RxDB для дочірніх таблиць
3. **Tabs System** - динамічне рендерування табів з конфігу
4. **Three view modes:**
   - Drawer mode (preview з recordsLimit)
   - Page fullscreen mode (preview з recordsLimit)
   - Tab fullscreen mode (ВСІ дані, tab navigation, pagination)

**✅ ВАЖЛИВО: Config структура ВЖЕ існує!**
- Pages вже є під spaces: `workspaces → spaces → pages → tabs`
- Fields вже наповнені
- Tabs існують, але ПОРОЖНІ - треба додати метадату (label, icon, component, order, etc.)

**Scope:**
- ~20+ main entities (breed, pet, kennel, etc.)
- ~8 child tables per entity на середньому
- ~10-1000 records per child table
- PWA offline-first architecture

**Не треба:**
- ❌ Створювати нову структуру config
- ❌ Міняти існуючу архітектуру app_config
- ❌ Переписувати appStore

**Треба:**
- ✅ Наповнити існуючі tabs метадатою
- ✅ Створити UniversalPageTemplate компонент
- ✅ Створити generic tab components (OverviewTab, ChildTableTab, StatsTab)
- ✅ Реалізувати RxDB storage для child tables
- ✅ Замінити хардкод на config-driven rendering

---

## 🗄️ ЧАСТИНА 1: RxDB Storage Strategy для Child Tables

### Context & Requirements

**Дані:**
- Main entities: ~10-15 (breed, pet, kennel, contact, litter, account, competition, event, product, tag)
- Child tables per entity: ~8-12 на середньому
- Child records: 10-1000 per table per entity instance
- Total child records across app: ~40,000-400,000

**Use Cases:**
1. Load limited preview (recordsLimit: 5-100) для public page tabs
2. Load full list з pagination для tab fullscreen mode
3. Filter/search в fullscreen mode
4. Offline support

---

### ⚠️ Критична Проблема: IndexedDB ObjectStore Limits

**Browser Limits:**
- **Chrome:** ~100 ObjectStores per database
- **Firefox:** ~100 ObjectStores
- **Safari:** ~50-80 ObjectStores

**Наша ситуація:**
```
Main entities:    10-15 collections
Child tables:     120+ child entity types
                  ─────────────────────
Total if 1:1:     130-150 ObjectStores ❌ BROWSER CRASH!
```

**Висновок:** Не можна створювати окрему RxDB collection для кожної child table!

---

### 🔍 Аналіз Варіантів Storage Strategy

#### ❌ ВАРІАНТ A (ВІДХИЛЕНО): Окрема Collection per Child Table

**Структура:**
```typescript
db.breed                    // Main
db.breed_division           // Child 1
db.breed_in_kennel          // Child 2
db.breed_synonym            // Child 3
... × 120 child tables
db.pet                      // Main
db.pet_award                // Child
... × 120 child tables
```

**Плюси:**
- ✅ Повна type safety
- ✅ Native RxDB indexes на всіх полях
- ✅ SpaceStore вже підтримує
- ✅ ID-First pagination працює

**Мінуси (критичні):**
- ❌ **120+ ObjectStores** → Browser crash
- ❌ Неможливо створити всі collections одразу
- ❌ Lazy loading не вирішує - досягнемо ліміту після кількох навігацій
- ❌ Memory overhead - кожна collection має metadata

**Вердикт:** ❌ Не підходить через IndexedDB limits

---

#### ❌ ВАРІАНТ B (ВІДХИЛЕНО): One Global Collection для ВСЬОГО

**Структура:**
```typescript
db.child_tables  // Одна collection для ВСІХ child records

// Records:
{
  id: 'division_123',
  _table_type: 'breed_division',
  _parent_id: 'breed_456',
  data: { name: 'Long Hair', ... } // JSON blob
}
```

**Плюси:**
- ✅ Тільки 1 ObjectStore - no limits
- ✅ Проста структура

**Мінуси (критичні):**
- ❌ **Flexible schema** - `data` field = any JSON
- ❌ Немає type safety - TypeScript не допомагає
- ❌ Не можна індексувати nested fields: `data.name`, `data.created_at`
- ❌ Sorting/filtering тільки in-memory (повільно)
- ❌ Суміш breed_division + pet_award + kennel_address в одній collection (логічно неправильно)
- ❌ Query завжди з двома умовами: `WHERE _table_type='X' AND _parent_id='Y'`
- ❌ ID-First pagination не працює

**Критичний приклад:**
```typescript
// ❌ НЕ працює - nested fields не індексуються:
db.child_tables.find({ 'data.name': { $regex: 'Long' } })

// ✅ Треба робити in-memory:
const all = await db.child_tables.find({ _table_type: 'breed_division' }).exec();
const filtered = all.filter(d => d.data.name.includes('Long')); // ПОВІЛЬНО!
```

**Вердикт:** ❌ Не підходить - втрата performance і type safety

---

### ✅ ВАРІАНТ C (ОБРАНО): Per-Entity Child Collections з Proper Schema

**Структура:**
```typescript
// Групуємо child tables по parent entity
db.breed                    // Main entity
db.breed_children           // ВСІ child tables для breed з proper fields!

db.pet                      // Main entity
db.pet_children             // ВСІ child tables для pet з proper fields!

db.kennel                   // Main entity
db.kennel_children          // ВСІ child tables для kennel з proper fields!
```

**Schema (ключове покращення - NOT flexible!):**
```typescript
const breedChildrenSchema: RxJsonSchema = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    // Meta fields
    id: { type: 'string', maxLength: 36 },
    _table_type: { type: 'string', maxLength: 50 },  // 'breed_division', 'breed_in_kennel'
    _parent_id: { type: 'string', maxLength: 36 },    // breed_id

    // ✅ ACTUAL FIELDS (not JSON blob!) - union of all child table fields
    name: { type: 'string', maxLength: 250 },
    description: { type: 'string', maxLength: 1000 },
    breed_id: { type: 'string', maxLength: 36 },
    breed_standard_id: { type: 'string', maxLength: 36 },
    division_by_color: { type: 'boolean' },
    division_by_size: { type: 'boolean' },
    is_main: { type: 'boolean' },
    // ... всі поля з breed_division, breed_in_kennel, breed_synonym

    // System fields
    created_at: { type: 'string' },
    updated_at: { type: 'string' },
    _deleted: { type: 'boolean' }
  },
  required: ['id', '_table_type', '_parent_id'],
  indexes: [
    '_table_type',
    '_parent_id',
    ['_table_type', '_parent_id'],  // Compound index - критично!
    'name',                         // ✅ Можна індексувати!
    'created_at',
    'updated_at'
  ]
};
```

**Query Examples:**
```typescript
// Get all divisions for breed
const divisions = await db.breed_children
  .find({
    selector: {
      _table_type: 'breed_division',
      _parent_id: breedId
    }
  })
  .sort('name')  // ✅ Native RxDB sort - ШВИДКО!
  .limit(20)
  .exec();

// Search by name - ✅ працює index!
const searched = await db.breed_children
  .find({
    selector: {
      _table_type: 'breed_division',
      name: { $regex: '.*Long.*' }  // ✅ Index на name!
    }
  })
  .exec();

// ID-First pagination - ✅ працює!
const nextPage = await db.breed_children
  .find({
    selector: {
      _table_type: 'breed_division',
      _parent_id: breedId,
      id: { $gt: lastId }
    }
  })
  .limit(20)
  .exec();
```

**Плюси:**
- ✅ **20-30 ObjectStores** - в межах browser limits!
- ✅ **Type safety** - всі поля явно в schema
- ✅ **Native RxDB indexes** - швидкі queries
- ✅ **Sorting/filtering** - native, не in-memory
- ✅ **ID-First pagination** - працює
- ✅ **Logical grouping** - breed children окремо від pet children
- ✅ **Memory management** - закрив breed page → cleanup breed_children
- ✅ **Query performance** - тільки 1 умова `_parent_id` (не 2 як в Variant B)
- ✅ **SpaceStore reuse** - можна використати існуючу логіку

**Мінуси (some є):**
- ⚠️ Union schema - містить поля з різних child tables
- ⚠️ Деякі поля будуть null для певних `_table_type`
- ⚠️ Schema generation складніший - треба об'єднати всі child entity configs

**Підрахунок ObjectStores:**
```
Main entities:       10-15 collections
Child collections:   10-15 collections (по одній на entity)
Dictionaries:        1 collection
App config:          1 collection
Books (demo):        1 collection
                     ──────────────
Total:              ~25-35 ObjectStores ✅ Влізає!
```

---

## 📊 Порівняльна Таблиця

| Критерій | Variant A (120 cols) | Variant B (1 global) | ✅ Variant C (per-entity) |
|----------|---------------------|----------------------|--------------------------|
| **ObjectStores** | 130-150 ❌ | 12-16 ✅ | 25-35 ✅ |
| **Browser Limits** | ❌ Crash | ✅ OK | ✅ OK |
| **Type Safety** | ✅ Повна | ❌ Немає | ✅ Є (union types) |
| **Native Indexing** | ✅ Всі поля | ❌ Root only | ✅ Всі поля |
| **Query Performance** | ✅ Відмінна | ❌ Погана | ✅ Відмінна |
| **ID-First Pagination** | ✅ Працює | ❌ Не працює | ✅ Працює |
| **Sorting/Filtering** | ✅ Native | ❌ In-memory | ✅ Native |
| **Memory Management** | ⚠️ Складно | ✅ Просто | ✅ Просто |
| **Code Complexity** | ⚠️ Середня | ✅ Проста | ⚠️ Середня |
| **SpaceStore Reuse** | ✅ Так | ❌ Ні | ✅ Так |
| **Logical Grouping** | ⚠️ Fragmented | ❌ All mixed | ✅ Per entity |

---

## 🎯 ОСТАТОЧНА РЕКОМЕНДАЦІЯ: Variant C (Per-Entity Child Collections)

### Чому саме цей варіант?

1. **Вирішує IndexedDB Limits** ✅
   - 25-35 ObjectStores - це нормально для PWA
   - Browser не крешнеться
   - Є запас на додаткові features

2. **Зберігає Type Safety** ✅
   - Schema validation працює
   - TypeScript intellisense працює (з union types)
   - Немає "magic strings" в `data` blob

3. **Performance як у Variant A** ✅
   - Native RxDB indexes
   - O(log n) queries
   - Sorting/filtering без in-memory обробки

4. **Logical Architecture** ✅
   - breed_children окремо від pet_children
   - Cleanup простий - видалив одну collection
   - Memory management - unload breed_children коли user покинув breed page

5. **Можливість використати SpaceStore** ✅
   - Та сама логіка що для main entities
   - ID-First pagination працює
   - Filtering API той самий

### Schema Generation Strategy:

```typescript
class ChildCollectionSchemaGenerator {
  // Generate union schema для всіх child tables entity
  generateSchema(entityType: string): RxJsonSchema {
    // 1. Load all child entity configs from JSON
    const childConfigs = this.loadChildEntityConfigs(entityType);
    // breed → [breed_division.json, breed_in_kennel.json, ...]

    // 2. Collect unique fields from all configs
    const allFields = new Map<string, FieldConfig>();
    childConfigs.forEach(config => {
      config.fields.forEach(field => {
        if (!allFields.has(field.name)) {
          allFields.set(field.name, field);
        }
      });
    });

    // 3. Generate schema properties
    const properties = {
      id: { type: 'string', maxLength: 36 },
      _table_type: { type: 'string', maxLength: 50 },
      _parent_id: { type: 'string', maxLength: 36 }
    };

    allFields.forEach((field, name) => {
      properties[name] = this.fieldToRxDBProperty(field);
    });

    // 4. Create indexes on common fields
    const indexes = [
      '_table_type',
      '_parent_id',
      ['_table_type', '_parent_id'],
      'created_at',
      'updated_at'
    ];

    // Add indexes for searchable fields (name, title, etc.)
    if (allFields.has('name')) indexes.push('name');
    if (allFields.has('title')) indexes.push('title');

    return {
      version: 0,
      primaryKey: 'id',
      type: 'object',
      properties,
      required: ['id', '_table_type', '_parent_id'],
      indexes
    };
  }
}
```

---

## 📥 Loading Strategies для Child Tables

### ВАРІАНТ 1: Extend SpaceStore (Recommended)

```typescript
class SpaceStore {
  // Existing method
  async applyFilters(entityType: string, filters: Record<string, any>, options: Options) {
    // Works for both main entities AND child tables!
  }

  // New helper method
  async loadChildRecords(
    parentType: string,
    parentId: string,
    childTable: string,
    options: { limit?: number, offset?: number } = {}
  ) {
    // Just a convenience wrapper
    return this.applyFilters(childTable, {
      [`${parentType}_id`]: parentId // breed_id, pet_id, etc.
    }, {
      limit: options.limit || 10,
      orderBy: { field: 'created_at', direction: 'desc' }
    });
  }
}

// Usage:
const divisions = await spaceStore.loadChildRecords('breed', breedId, 'breed_division', { limit: 10 });
```

**✅ Плюси:**
- Переисковуємо існуючу логіку
- ID-First pagination працює
- Filtering/sorting працює
- Код мінімальний

**❌ Мінуси:**
- Немає

---

### ВАРІАНТ 2: Dedicated ChildTableStore

```typescript
class ChildTableStore {
  async load(tableName: string, filters: Record<string, any>, options: Options) {
    const collection = await this.ensureCollection(tableName);

    // Manual RxDB query
    let query = collection.find({ selector: filters });

    if (options.orderBy) {
      query = query.sort(options.orderBy.field);
    }

    return query.limit(options.limit).exec();
  }
}
```

**❌ Мінуси:**
- Дублювання логіки
- Немає ID-First pagination
- Немає smart caching
- Більше коду

---

### ВАРІАНТ 3: Extension Methods on SpaceStore

```typescript
// Extend SpaceStore з child-specific методами
class SpaceStore {
  // Child table helpers
  async loadAllChildTables(parentType: string, parentId: string, limit = 10) {
    const childTables = this.getChildTables(parentType); // From config

    const results = await Promise.all(
      childTables.map(table =>
        this.loadChildRecords(parentType, parentId, table, { limit })
      )
    );

    return Object.fromEntries(
      childTables.map((table, i) => [table, results[i]])
    );
  }

  private getChildTables(parentType: string): string[] {
    // Read from entity config or entity-categories.json
    const config = entityCategories.child[parentType];
    return config || [];
  }
}

// Usage:
const allChildren = await spaceStore.loadAllChildTables('breed', breedId, 10);
// Returns: { breed_division: [...], breed_in_kennel: [...], ... }
```

**✅ Плюси:**
- Batch loading всіх child tables одразу
- Зручний API
- Переисковує SpaceStore

---

## 🏗️ ЧАСТИНА 2: Page Template Architecture

### ✅ ІСНУЮЧА Структура Config (вже є в системі!)

```typescript
// App Config структура (вже існує)
{
  "workspaces": {
    "config_workspace_1757849573673": {
      "id": "home",
      "spaces": {
        "config_space_1757849573745": {
          "id": "breeds",
          "entitySchemaName": "breed",

          // ✅ Pages вже існують!
          "pages": {
            "config_page_1757849573807": {
              // ❌ Tabs існують, але ПОРОЖНІ - треба наповнити
              "tabs": {
                "config_tab_1761479883747": {
                  "fields": {}  // Порожньо
                },
                "config_tab_1761571069286": {
                  "fields": {}  // Порожньо
                }
              },

              // ✅ Fields вже є!
              "fields": {
                "breed_field_name": {
                  "displayName": "Name",
                  "component": "TextInput",
                  "fieldType": "string",
                  "sortOrder": 10
                  // ... повний конфіг поля
                }
              }
            }
          },

          // Views для list view (не чіпаємо)
          "views": { ... }
        }
      }
    }
  }
}
```

### 🎯 Задача: Наповнити метадату табів

**Було (зараз):**
```json
{
  "tabs": {
    "config_tab_1761479883747": {
      "fields": {}  // ❌ Тільки порожній fields
    }
  }
}
```

**Треба (після):**
```json
{
  "tabs": {
    "config_tab_overview": {
      // ✅ Додаємо метадату
      "id": "overview",
      "label": "Overview",
      "icon": "file-text",
      "fragment": "overview",
      "component": "OverviewTab",
      "order": 0,
      "layout": "custom",

      // ✅ Вказуємо які поля показувати
      "fields": {
        "breed_field_name": {},
        "breed_field_description": {},
        "breed_field_rating": {}
      }
    },

    "config_tab_divisions": {
      "id": "divisions",
      "label": "Divisions",
      "icon": "layers",
      "fragment": "divisions",
      "component": "ChildTableTab",
      "order": 1,

      // ✅ Для child tables
      "childTable": "breed_division",

      // ✅ Динамічний ліміт (різний для кожного табу!)
      "recordsLimit": 20,  // Divisions - показуємо більше
      "layout": "list",

      "fields": {}  // Поля візьмуться з breed_division entity
    }
  }
}
```

### TypeScript Interfaces для Tabs:

```typescript
interface TabConfig {
  id: string;              // 'overview', 'divisions'
  label: string;           // 'Overview', 'Divisions'
  icon: string;            // 'file-text', 'layers'
  fragment: string;        // URL hash - 'overview', 'divisions'
  component: string;       // Component name - 'OverviewTab', 'ChildTableTab'
  order: number;           // Tab order - 0, 1, 2...
  layout?: 'grid' | 'list' | 'custom';

  // Tab-specific fields (references to page.fields)
  fields?: Record<string, any>;

  // Child table reference (для ChildTableTab)
  childTable?: string;       // 'breed_division', 'breed_in_kennel'

  // ✅ ДИНАМІЧНИЙ ліміт записів (різний для кожного табу!)
  recordsLimit?: number;     // 5, 10, 20, 50, 100 - залежить від типу даних
                             // Приклад: Awards = 5, Divisions = 20, Photos = 50
}

interface PageConfig {
  // Tabs з метадатою
  tabs: Record<string, TabConfig>;

  // Всі доступні поля для page
  fields: Record<string, FieldConfig>;
}
```

### Приклад ПОВНОГО Config для Breed Page:

```json
{
  "pages": {
    "config_page_1757849573807": {
      "tabs": {
        "config_tab_overview": {
          "id": "overview",
          "label": "Overview",
          "icon": "file-text",
          "fragment": "overview",
          "component": "OverviewTab",
          "order": 0,
          "layout": "custom",
          "fields": {
            "breed_field_name": {},
            "breed_field_authentic_name": {},
            "breed_field_description": {},
            "breed_field_pet_type_id": {},
            "breed_field_rating": {}
          }
        },

        "config_tab_divisions": {
          "id": "divisions",
          "label": "Divisions",
          "icon": "layers",
          "fragment": "divisions",
          "component": "ChildTableTab",
          "order": 1,
          "childTable": "breed_division",
          "recordsLimit": 20,    // ✅ Більше записів - важлива інформація
          "layout": "list",
          "fields": {}
        },

        "config_tab_kennels": {
          "id": "kennels",
          "label": "Kennels",
          "icon": "building",
          "fragment": "kennels",
          "component": "ChildTableTab",
          "order": 2,
          "childTable": "breed_in_kennel",
          "recordsLimit": 10,    // ✅ Менше записів - preview
          "layout": "grid",
          "fields": {}
        },

        "config_tab_photos": {
          "id": "photos",
          "label": "Photos",
          "icon": "image",
          "fragment": "photos",
          "component": "ChildTableTab",
          "order": 4,
          "childTable": "breed_photo",
          "recordsLimit": 50,    // ✅ Багато фото - gallery preview
          "layout": "grid",
          "fields": {}
        },

        "config_tab_stats": {
          "id": "stats",
          "label": "Statistics",
          "icon": "bar-chart-3",
          "fragment": "stats",
          "component": "StatsTab",
          "order": 3,
          "layout": "custom",
          "fields": {
            "breed_field_pet_profile_count": {},
            "breed_field_kennel_count": {},
            "breed_field_patron_count": {},
            "breed_field_achievement_progress": {}
          }
        }
      },

      "fields": {
        "breed_field_name": {
          "isSystem": false,
          "isUnique": false,
          "required": true,
          "component": "TextInput",
          "fieldType": "string",
          "maxLength": 250,
          "sortOrder": 10,
          "displayName": "Name",
          "placeholder": "Enter name",
          "permissions": {
            "read": ["*"],
            "write": ["admin", "editor"]
          }
        },
        "breed_field_description": {
          "component": "TextareaInput",
          "fieldType": "text",
          "sortOrder": 20,
          "displayName": "Description"
        }
        // ... всі інші поля
      }
    }
  }
}
```

---

## 🎨 Universal Page Template Component

### Як читати config з AppStore:

```typescript
// hooks/usePageConfig.ts
export function usePageConfig(spaceSlug: string) {
  const { workspaces } = useAppWorkspaces();

  // Знайти space за slug
  const space = useMemo(() => {
    for (const workspace of workspaces) {
      if (workspace.spaces) {
        const spacesArray = Object.values(workspace.spaces);
        const found = spacesArray.find(s => s.id === spaceSlug);
        if (found) return found;
      }
    }
    return null;
  }, [workspaces, spaceSlug]);

  // Взяти перший page config (зазвичай один page на space)
  const pageConfig = useMemo(() => {
    if (!space?.pages) return null;
    const pagesArray = Object.values(space.pages);
    return pagesArray[0]; // Перший page
  }, [space]);

  return {
    space,
    pageConfig,
    loading: !pageConfig
  };
}
```

### React Component Architecture:

```typescript
// UniversalPageTemplate.tsx
interface UniversalPageTemplateProps {
  spaceSlug: string;  // 'breeds' (з space.id)
  entityId: string;   // UUID
  mode: 'drawer' | 'fullscreen';
}

export function UniversalPageTemplate({ spaceSlug, entityId, mode }: UniversalPageTemplateProps) {
  // 1. Load page config з AppStore
  const { pageConfig, space } = usePageConfig(spaceSlug);

  // 2. Load entity data з SpaceStore
  const entityType = space?.entitySchemaName; // 'breed'
  const entity = spaceStore.getEntityById(entityType, entityId);

  // 3. Active tab state
  const [activeTab, setActiveTab] = useActiveTab(pageConfig?.tabs);

  if (!pageConfig || !entity) {
    return <LoadingState />;
  }

  return (
    <div className={cn('h-full flex flex-col', mode === 'drawer' && 'bg-white')}>
      {/* Header - only in drawer mode */}
      {mode === 'drawer' && (
        <DrawerHeader
          title={entity.name}
          onClose={() => navigate(-1)}
          onExpand={() => navigate(`/${entityId}`)}
        />
      )}

      {/* Tabs Navigation */}
      <TabsNav
        tabs={Object.values(pageConfig.tabs).sort((a, b) => a.order - b.order)}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        <TabContentRenderer
          tabConfig={pageConfig.tabs[activeTab]}
          pageFields={pageConfig.fields}
          entity={entity}
          entityType={entityType}
          mode={mode}
        />
      </div>
    </div>
  );
}
```

---

## 🔌 Component Registry & Dynamic Rendering

### Component Registry Pattern:

```typescript
// ComponentRegistry.ts
type ComponentType = React.ComponentType<any>;

class ComponentRegistry {
  private static components = new Map<string, ComponentType>();

  static register(name: string, component: ComponentType) {
    this.components.set(name, component);
  }

  static get(name: string): ComponentType | undefined {
    return this.components.get(name);
  }

  static has(name: string): boolean {
    return this.components.has(name);
  }
}

// Register components
ComponentRegistry.register('OverviewTab', OverviewTab);
ComponentRegistry.register('ChildTableTab', ChildTableTab);
ComponentRegistry.register('StatsTab', StatsTab);
ComponentRegistry.register('PageHeader', PageHeader);
ComponentRegistry.register('PageCover', PageCover);
ComponentRegistry.register('Avatar', Avatar);
ComponentRegistry.register('PageActions', PageActions);

export default ComponentRegistry;
```

### Dynamic Tab Renderer:

```typescript
// TabContentRenderer.tsx
interface TabContentRendererProps {
  tabConfig: TabConfig;
  entity: any;
  mode: 'drawer' | 'fullscreen';
}

export function TabContentRenderer({ tabConfig, entity, mode }: TabContentRendererProps) {
  const Component = ComponentRegistry.get(tabConfig.component);

  if (!Component) {
    console.error(`Component "${tabConfig.component}" not found in registry`);
    return <div className="p-6 text-red-500">Component not found: {tabConfig.component}</div>;
  }

  // Pass config + entity + mode to component
  return (
    <Component
      config={tabConfig}
      entity={entity}
      mode={mode}
    />
  );
}
```

---

## 📦 Generic Tab Components

### 1. OverviewTab - для загальної інформації:

```typescript
interface OverviewTabProps {
  config: TabConfig;
  entity: any;
  mode: 'drawer' | 'fullscreen';
}

export function OverviewTab({ config, entity, mode }: OverviewTabProps) {
  const fields = Object.values(config.fields || {});

  return (
    <div className="p-6">
      {/* Render fields dynamically */}
      {fields
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(field => (
          <FieldRenderer
            key={field.id}
            field={field}
            value={entity[field.name]}
            mode="display"
          />
        ))}
    </div>
  );
}
```

### 2. ChildTableTab - для child tables:

```typescript
interface ChildTableTabProps {
  config: TabConfig;
  entity: any;
  mode: 'drawer' | 'fullscreen';
}

export function ChildTableTab({ config, entity, mode }: ChildTableTabProps) {
  const [childRecords, setChildRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChildRecords();
  }, [entity.id, config.childTable]);

  const loadChildRecords = async () => {
    if (!config.childTable) return;

    setLoading(true);

    // ✅ Використовуємо динамічний ліміт з конфігу
    const limit = config.recordsLimit || 10; // Default 10 якщо не вказано

    // Load через SpaceStore
    const records = await spaceStore.loadChildRecords(
      config.entityType, // 'breed'
      entity.id,
      config.childTable, // 'breed_division'
      { limit }
    );

    setChildRecords(records);
    setLoading(false);
  };

  const handleViewAll = () => {
    // Navigate to fullscreen mode with child table focus
    navigate(`/${entity.id}#${config.fragment}?mode=fullscreen`);
  };

  if (loading) {
    return <LoadingState />;
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">{config.label}</h3>
        {/* ✅ Показуємо "View All" якщо досягнуто ліміту */}
        {mode === 'drawer' && childRecords.length >= (config.recordsLimit || 10) && (
          <Button variant="outline" size="sm" onClick={handleViewAll}>
            View All →
          </Button>
        )}
      </div>

      {/* Render based on layout */}
      {config.layout === 'list' ? (
        <ChildRecordsList records={childRecords} fields={config.fields} />
      ) : config.layout === 'grid' ? (
        <ChildRecordsGrid records={childRecords} fields={config.fields} />
      ) : (
        <div>Custom layout</div>
      )}

      {mode === 'fullscreen' && (
        <ChildTablePagination
          total={childRecords.length}
          onLoadMore={loadChildRecords}
        />
      )}
    </div>
  );
}
```

### 3. StatsTab - для статистики:

```typescript
export function StatsTab({ config, entity }: StatsTabProps) {
  const fields = Object.values(config.fields || {});

  return (
    <div className="p-6 space-y-4">
      {fields.map(field => (
        <StatCard
          key={field.id}
          label={field.displayName}
          value={entity[field.name]}
          icon={field.icon}
        />
      ))}
    </div>
  );
}
```

---

## 🛣️ Routing Strategy для Drawer/Fullscreen Modes

### ✅ Angular Reference: `/Users/annaglova/projects/org/libs/schema/domain/breed/pages/breed-page/breed.routing.ts`

### URL Structure:

```
// 1. Public Page - Drawer mode (in /breeds list)
/breeds/:id#overview
/breeds/:id#divisions    // Preview з recordsLimit
/breeds/:id#stats

// 2. Public Page - Fullscreen mode (dedicated page)
/:id#overview
/:id#divisions          // Preview з recordsLimit
/:id#stats

// 3. Tab Fullscreen mode (повні дані конкретного табу)
/:id#divisions?mode=tab-fullscreen    // ВСІ дані, tab navigation, scroll/pagination
/:id#kennels?mode=tab-fullscreen
```

### Режими перегляду:

**Mode 1: Page Drawer** (на /breeds)
- Обмежені дані (recordsLimit)
- Кнопка "View All →" для переходу в Tab Fullscreen
- Scroll в межах drawer

**Mode 2: Page Fullscreen** (окрема сторінка)
- Обмежені дані (recordsLimit)
- Кнопка "View All →" для переходу в Tab Fullscreen
- Full page scroll

**Mode 3: Tab Fullscreen** (конкретний таб на full screen)
- ВСІ дані з child table (без recordsLimit)
- Tab navigation доступна
- Scroll + pagination для 1000+ records
- Filtering (опціонально)

### Router Configuration:

```typescript
// App Routes
<Routes>
  {/* List view with drawer */}
  <Route path="/breeds" element={<BreedsListView />}>
    <Route path=":id" element={<DrawerOutlet />} />
  </Route>

  {/* Fullscreen public page */}
  <Route path="/:id" element={<PublicPageView />} />
</Routes>
```

### DrawerOutlet Component:

```typescript
export function DrawerOutlet() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const entityType = useEntityTypeFromId(id);
  const mode = searchParams.get('mode'); // 'tab-fullscreen' або null

  const handleClose = () => {
    navigate('/breeds');
  };

  const handleExpand = () => {
    navigate(`/${id}${location.hash}${location.search}`);
  };

  return (
    <Drawer open onClose={handleClose}>
      <UniversalPageTemplate
        entityType={entityType}
        entityId={id}
        mode={mode === 'tab-fullscreen' ? 'tab-fullscreen' : 'drawer'}
        onExpand={handleExpand}
      />
    </Drawer>
  );
}
```

### PublicPageView Component:

```typescript
export function PublicPageView() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();

  const entityType = useEntityTypeFromId(id);
  const mode = searchParams.get('mode'); // 'tab-fullscreen' або null

  return (
    <UniversalPageTemplate
      entityType={entityType}
      entityId={id}
      mode={mode === 'tab-fullscreen' ? 'tab-fullscreen' : 'fullscreen'}
    />
  );
}
```

### Tab Fullscreen Mode Logic:

```typescript
// ChildTableTab.tsx
const handleViewAll = () => {
  // Перехід в tab fullscreen mode
  if (mode === 'drawer') {
    navigate(`/breeds/${entity.id}#${config.fragment}?mode=tab-fullscreen`);
  } else {
    navigate(`/${entity.id}#${config.fragment}?mode=tab-fullscreen`);
  }
};

// В tab-fullscreen mode:
// - Показуємо ВСІ записи (не обмежені recordsLimit)
// - Tab navigation доступна
// - Pagination/infinite scroll для великих обсягів
```

---

## 📅 Implementation Phases

**⚠️ Flexible Timeline:** 6 тижнів реалістично, але можна розбити на менші інкременти. Паузи між фазами - OK!

**🎯 Підхід:**
- Маленькі delivery increments (working feature кожні 3-5 днів)
- Можна зупинитися після кожної фази
- Тести пишемо паралельно з розробкою (не чекаємо Phase 6)
- Використовуємо Angular reference для швидкості

---

### Phase 1: Foundation (Week 1) - 5 days

**Goal:** Setup RxDB child tables infrastructure

**Priority: HIGH** - базова інфраструктура для всього іншого

- [ ] Create ChildTableManager class
- [ ] Implement dynamic schema generation
- [ ] Add lazy collection loading
- [ ] Extend SpaceStore with `loadChildRecords()`
- [ ] ✅ **Write unit tests паралельно** (не чекаємо Phase 6!)
- [ ] Test with breed_division table
- [ ] Test with 2-3 other child tables

**Deliverables:**
- Working child table loading
- Unit tests for ChildTableManager
- Documentation

**💡 Можна зупинитися тут:** Child tables працюють, але ще не інтегровані в UI

---

### Phase 2: Page Template Core (Week 2) - 5 days

**Goal:** Build Universal Page Template

**Priority: HIGH** - core rendering engine

- [ ] Create UniversalPageTemplate component
- [ ] Implement ComponentRegistry + **validation tests**
- [ ] Build TabContentRenderer + **tests**
- [ ] Create generic tab components:
  - OverviewTab + **tests**
  - ChildTableTab + **tests**
  - StatsTab + **tests**
- [ ] Create usePageConfig hook + **tests**
- [ ] Test with breed page config (читаємо з існуючого appStore)

**Deliverables:**
- Working page template
- Config-driven rendering
- 3 generic tab components
- Test coverage ~80%

**💡 Можна зупинитися тут:** Template працює з моками, але ще не з реальними routes

---

### Phase 3: Config Structure (Week 2-3) - 3 days

**Goal:** Наповнити tabs метадатою

**Priority: MEDIUM** - можна зробити потроху

- [ ] Наповнити breed page tabs метадатою (label, icon, component, order, recordsLimit)
- [ ] **Config validation script** + tests
- [ ] Додати 2-3 tabs для breed (overview, divisions, stats)
- [ ] Generate configs для pet, kennel (базові)
- [ ] Документувати structure

**Deliverables:**
- Breed page має повні tabs configs
- Config validation script працює
- 2-3 entities мають базові configs

**💡 Можна зупинитися тут:** Configs готові, але ще не підключені до routing

---

### Phase 4: Routing & Modes (Week 3) - 3 days

**Goal:** Implement drawer/fullscreen/tab-fullscreen routing

- [ ] Setup router configuration
- [ ] Create DrawerOutlet component
- [ ] Create PublicPageView component
- [ ] Implement mode switching (drawer/fullscreen/tab-fullscreen)
- [ ] Handle URL state (hash, ?mode=tab-fullscreen)
- [ ] "View All →" button logic

**Deliverables:**
- Working drawer mode
- Working fullscreen mode
- Working tab-fullscreen mode (з tab navigation)
- Smooth transitions

---

### Phase 5: Migration from Hardcode (Week 4) - 5 days

**Goal:** Replace existing BreedDrawerView with new system

- [ ] Migrate breed page to config
- [ ] Create breed-specific tab components if needed
- [ ] Test all tabs
- [ ] Fix styling/UX issues
- [ ] Performance testing

**Deliverables:**
- Breed page fully migrated
- Zero hardcode
- Same UX as before

---

### Phase 6: Testing & Validation (Week 5) - 5 days

**Goal:** Comprehensive test coverage - ZERO prod errors

**Testing Strategy:**
- [ ] **Unit Tests** - кожен компонент окремо
  - ComponentRegistry має всі components
  - Кожен generic tab component (OverviewTab, ChildTableTab, etc.)
  - usePageConfig hook
  - ChildTableManager

- [ ] **Config Validation Tests**
  - Всі tabs мають валідний `component` field
  - Всі components існують в registry
  - Всі childTable references існують
  - recordsLimit в допустимих межах

- [ ] **Integration Tests**
  - Config → Component rendering
  - Tab switching працює
  - ChildTable loading працює
  - Mode switching (drawer/fullscreen/tab-fullscreen)

- [ ] **E2E Tests**
  - Повний user flow: list → drawer → tab → fullscreen
  - Navigation між табами
  - "View All →" button
  - Scroll/pagination

**Deliverables:**
- 100% test coverage для critical paths
- Config validation script
- CI/CD integration
- ❌ ZERO "component not found" errors possible

---

### Phase 7: Expand to Other Entities (Week 6) - 5 days

**Goal:** Roll out to all main entities

- [ ] Create page configs for:
  - pet (most complex - ~1000 awards)
  - kennel
  - account
  - contact
  - 5-10 other entities
- [ ] Run full test suite для кожної entity
- [ ] Create entity-specific tab components as needed
- [ ] Document patterns

**Deliverables:**
- All entities have public pages
- Reusable tab components
- Pattern library
- All tests passing ✅

---

## 🎯 Success Criteria

### Functional Requirements:
- ✅ Config-driven page rendering (zero hardcode)
- ✅ All main entities have public pages
- ✅ Drawer, fullscreen, tab-fullscreen modes work
- ✅ Child tables load efficiently (10-1000 records)
- ✅ Tabs switch smoothly
- ✅ URL state preserved on navigation
- ✅ Offline support works

### Performance Requirements:
- ✅ Initial page load < 500ms
- ✅ Tab switch < 200ms
- ✅ Child table load < 300ms
- ✅ Memory usage < 100MB for typical session
- ✅ Works with 50+ active collections

### Code Quality:
- ✅ TypeScript strict mode
- ✅ **100% test coverage для critical paths**
- ✅ **Config validation в CI/CD**
- ✅ **Zero runtime config errors**
- ✅ Documentation for all public APIs
- ✅ Reusable component library

### Testing Requirements:
- ✅ **Unit tests:** Всі компоненти + ComponentRegistry
- ✅ **Config validation:** Всі tabs мають валідні components
- ✅ **Integration tests:** Config → rendering повний flow
- ✅ **E2E tests:** User journeys (list → drawer → fullscreen)
- ✅ **CI/CD integration:** Build fails if tests fail
- ✅ **❌ ZERO "component not found" в проді**

---

## 📝 Додаткові рекомендації

### 1. Config Storage Strategy

✅ **Config вже існує в app_config!**

```typescript
// Структура ВЖЕ є:
{
  "workspaces": {
    "config_workspace_XXX": {
      "spaces": {
        "config_space_XXX": {
          "pages": {
            "config_page_XXX": {
              "tabs": { ... },    // ← Треба наповнити метадату
              "fields": { ... }   // ← Вже є
            }
          }
        }
      }
    }
  }
}
```

**Задача:** Не створювати нову структуру, а НАПОВНИТИ існуючі tabs метадатою!

**Development:**
- Редагуємо через Config Admin UI
- Зміни зберігаються в Supabase app_config
- RxDB sync автоматично

**Production:**
- Один великий предгенерований JSON
- AppStore завантажує і парсить
- React компоненти читають через usePageConfig()

### 2. Performance Optimization

```typescript
// Preload child collections для часто використовуваних entities
class PerformanceOptimizer {
  async preloadPopularChildTables() {
    // Top 5 most viewed entities
    const popular = ['breed', 'pet', 'kennel', 'account', 'contact'];

    for (const entity of popular) {
      const childTables = this.getChildTables(entity);

      // Create collections але не завантажувати дані
      for (const table of childTables) {
        await childTableManager.ensureCollection(table);
      }
    }
  }
}
```

### 3. Config Validation (Development Time)

```typescript
// ✅ Config Validation Script - запускається В CI/CD
// scripts/validate-page-configs.ts

interface ValidationError {
  configId: string;
  tabId: string;
  error: string;
}

function validatePageConfigs(appConfig: AppConfig): ValidationError[] {
  const errors: ValidationError[] = [];

  // Перевіряємо всі pages
  for (const workspace of Object.values(appConfig.workspaces)) {
    for (const space of Object.values(workspace.spaces || {})) {
      for (const [pageId, page] of Object.entries(space.pages || {})) {

        // Перевіряємо кожен tab
        for (const [tabId, tab] of Object.entries(page.tabs || {})) {

          // ✅ Component має існувати в registry
          if (!ComponentRegistry.has(tab.component)) {
            errors.push({
              configId: pageId,
              tabId,
              error: `Component "${tab.component}" not found in registry`
            });
          }

          // ✅ childTable має існувати якщо вказано
          if (tab.childTable && !childTableExists(tab.childTable)) {
            errors.push({
              configId: pageId,
              tabId,
              error: `Child table "${tab.childTable}" does not exist`
            });
          }

          // ✅ recordsLimit в допустимих межах
          if (tab.recordsLimit && (tab.recordsLimit < 1 || tab.recordsLimit > 1000)) {
            errors.push({
              configId: pageId,
              tabId,
              error: `recordsLimit ${tab.recordsLimit} out of range (1-1000)`
            });
          }
        }
      }
    }
  }

  return errors;
}

// ✅ В CI/CD pipeline:
// npm run validate:configs
// Якщо є errors → build fails → деплой НЕ йде
```

### 4. Runtime Safety (якщо щось пішло не так)

```typescript
// TabContentRenderer.tsx - на всяк випадок
function TabContentRenderer({ tabConfig, entity, mode }: TabContentRendererProps) {
  const Component = ComponentRegistry.get(tabConfig.component);

  // ❌ Це НЕ має траплятися в проді (спіймано тестами)
  if (!Component) {
    console.error(`CRITICAL: Component "${tabConfig.component}" not found`);

    // Error tracking (Sentry, etc.)
    captureError(new Error(`Missing component: ${tabConfig.component}`));

    // Показати розробницький error (тільки в dev!)
    if (process.env.NODE_ENV === 'development') {
      return (
        <div className="p-6 bg-red-50 border border-red-200">
          <h3 className="text-red-700 font-bold">Dev Error: Component Not Found</h3>
          <p>Component "{tabConfig.component}" is not registered.</p>
          <p>Check ComponentRegistry or config validation.</p>
        </div>
      );
    }

    // В проді - minimal fallback (не має траплятися!)
    return null;
  }

  return (
    <ErrorBoundary fallback={<TabErrorState />}>
      <Component config={tabConfig} entity={entity} mode={mode} />
    </ErrorBoundary>
  );
}
```

### 4. Caching Strategy

```typescript
// Cache page configs
class PageConfigCache {
  private cache = new Map<string, PageConfig>();

  async getPageConfig(entityType: string): Promise<PageConfig> {
    if (this.cache.has(entityType)) {
      return this.cache.get(entityType);
    }

    const config = await this.loadFromDB(entityType);
    this.cache.set(entityType, config);
    return config;
  }
}
```

---

## 🚀 Quick Start Guide

### Крок 1: Наповнити tabs метадатою в існуючому config

```typescript
// В Config Admin або через SQL
// Оновити config_page_1757849573807.tabs:
{
  "config_tab_overview": {
    "id": "overview",
    "label": "Overview",
    "icon": "file-text",
    "fragment": "overview",
    "component": "OverviewTab",
    "order": 0,
    "fields": {
      "breed_field_name": {},
      "breed_field_description": {}
    }
  }
}
```

### Крок 2: Створити usePageConfig hook

```typescript
// hooks/usePageConfig.ts
export function usePageConfig(spaceSlug: string) {
  const { workspaces } = useAppWorkspaces();

  // Find space by slug
  const space = workspaces
    .flatMap(w => Object.values(w.spaces || {}))
    .find(s => s.id === spaceSlug);

  // Get first page config
  const pageConfig = space?.pages
    ? Object.values(space.pages)[0]
    : null;

  return { space, pageConfig };
}
```

### Крок 3: Створити UniversalPageTemplate

```typescript
// components/UniversalPageTemplate.tsx
export function UniversalPageTemplate({ spaceSlug, entityId, mode }) {
  const { pageConfig, space } = usePageConfig(spaceSlug);
  const entity = spaceStore.getEntityById(space.entitySchemaName, entityId);

  return (
    <div>
      <TabsNav tabs={pageConfig.tabs} />
      <TabContentRenderer tab={activeTab} entity={entity} />
    </div>
  );
}
```

### Крок 4: Використати в Drawer

```typescript
// В /breeds route
<Route path=":id" element={
  <Drawer>
    <UniversalPageTemplate
      spaceSlug="breeds"
      entityId={params.id}
      mode="drawer"
    />
  </Drawer>
} />
```

### Крок 5: Створити ChildTableManager для child tables

```typescript
// packages/rxdb-store/src/services/child-table-manager.ts
const manager = new ChildTableManager(db);
await manager.ensureCollection('breed_division');

// Test завантаження
const divisions = await spaceStore.loadChildRecords(
  'breed',
  breedId,
  'breed_division',
  { limit: 10 }
);
```

---

## ❓ FAQ

**Q: Чи треба створювати нову структуру config?**
A: ❌ НІ! Pages вже існують в структурі. Треба тільки НАПОВНИТИ tabs метадатою (label, icon, component, etc.)

**Q: Де зберігається page config?**
A: В існуючій структурі: `workspaces → spaces → pages → tabs`. Всі config вже в app_config таблиці.

**Q: Як читати page config в React?**
A: Через `usePageConfig(spaceSlug)` hook, який читає з appStore.workspaces.

**Q: Як працює scroll/pagination?**
A:
- **Drawer/Page modes**: Scroll в межах recordsLimit (10-50 records)
- **Tab fullscreen mode**: Scroll + pagination для всіх даних (1000+ records)
- Детальна логіка буде взята з Angular проекту

**Q: Чи треба змінювати існуючий SpaceStore?**
A: Мінімально. Додамо тільки helper method `loadChildRecords()`, який просто викликає `applyFilters()`.

**Q: Як працюватиме з offline?**
A: Так само як для main entities. RxDB cache працює автоматично.

**Q: Чи треба писати окремі компоненти для кожного tab?**
A: Ні! Використовуємо generic components (OverviewTab, ChildTableTab, StatsTab). Окремі компоненти тільки якщо треба custom UI.

**Q: Як обробляти помилки якщо component не знайдений?**
A: ❌ В ПРОДІ ТАКОГО НЕ БУВАЄ! Це має ловитися тестами на етапі розробки:
- Unit tests перевіряють наявність всіх components в registry
- Config validation tests перевіряють що всі `component` values існують
- Integration tests тестують повний flow
- Якщо тест не пройшов = деплой НЕ йде в прод

**Q: Скільки часу займе повна міграція?**
A: 6 тижнів для всіх 20+ entities з урахуванням testing. Але можна розбити на менші інкременти з паузами між фазами.

**Q: Що з існуючим хардкодом в BreedDrawerView?**
A: Замінюємо на UniversalPageTemplate з config-driven rendering. Той самий UI, але з конфігу.

**Q: Чи можна зупинитися посередині?**
A: ✅ ТАК! Кожна фаза - це working increment. Можна зупинитися після Phase 1, 2, 3 і т.д.

**Q: Чи можна працювати паралельно?**
A: ✅ ТАК! Тести пишемо паралельно з розробкою. Configs можна наповнювати потроху.

---

## 📚 Related Documents

- [SESSION_RESTART.md](./SESSION_RESTART.md) - Current project state
- [PROPERTY_BASED_CONFIG_ARCHITECTURE.md](./PROPERTY_BASED_CONFIG_ARCHITECTURE.md) - Config system
- [SPACE_STORE_ARCHITECTURE.md](./SPACE_STORE_ARCHITECTURE.md) - Store architecture
- [ID_FIRST_PAGINATION.md](./ID_FIRST_PAGINATION.md) - Pagination strategy
- [DICTIONARY_LOADING_STRATEGY.md](./DICTIONARY_LOADING_STRATEGY.md) - Dictionary patterns

---

## 🎯 Підсумок Обговорення

### ✅ Що визначили:

1. **Config Structure:** Використовуємо існуючу структуру `workspaces → spaces → pages → tabs`, просто наповнюємо tabs метадатою

2. **RxDB Storage:** Варіант A (окремі collections) з lazy loading + cleanup для IndexedDB limits

3. **Three View Modes:**
   - Page Drawer (preview з recordsLimit)
   - Page Fullscreen (preview з recordsLimit)
   - Tab Fullscreen (ВСІ дані + tab navigation + pagination)

4. **Dynamic recordsLimit:** Кожен tab має свій limit (5-100) залежно від типу даних

5. **Angular Reference:** 99% UI вже є - переносимо крок за кроком

6. **Testing Strategy:** Тести пишемо паралельно, config validation в CI/CD, ZERO prod errors

7. **Timeline:** 6 тижнів реалістично, але гнучко - можна розбити на інкременти з паузами

### 📋 Готові до старту:

- [ ] Phase 1: RxDB child tables infrastructure (5 днів)
- [ ] Phase 2: Universal Page Template (5 днів)
- [ ] Phase 3: Config structure (3 дні)
- [ ] Phase 4: Routing & modes (3 дні)
- [ ] Phase 5: Migration breed page (5 днів)
- [ ] Phase 6: Testing & validation (5 днів)
- [ ] Phase 7: Expand to all entities (5 днів)

**💪 Можна паралелити:**
- Тести пишемо разом з кодом
- Configs наповнюємо поступово
- Можна зупинитися після будь-якої фази

---

**Status:** ✅ Plan Approved & Ready
**Next Step:** Start Phase 1 або review/commit документ

