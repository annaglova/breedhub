# 🎯 Core Principles - BreedHub

Фундаментальні принципи розробки платформи BreedHub.

---

## 1. 🏠 Local-First Architecture

**Правило:** Всі дані йдуть через RxDB → UI, ніколи напряму з Supabase в UI.

### Data Flow:
```
Supabase ↔ RxDB (local cache) ↔ Store (EntityStore/DictionaryStore) → UI
```

### Обов'язково:
- ✅ Dictionary завантажується через `DictionaryStore.getDictionary()`
- ✅ Collections завантажуються через `SpaceStore.applyFilters()` / `loadMore()`
- ✅ Child tables завантажуються через `SpaceStore.loadChildRecords()`
- ❌ **НІКОЛИ** не робити `supabase.from('table').select()` напряму в UI компонентах

### Чому це важливо:
- Offline-first підтримка
- Кешування і швидкість
- Єдина точка управління даними
- Можливість працювати без інтернету

### Приклад (правильно ✅):
```typescript
// ✅ CORRECT: Через DictionaryStore
const { records } = await dictionaryStore.getDictionary('achievement', {
  idField: 'id',
  nameField: 'name',
  additionalFields: ['int_value', 'position', 'description']
});
```

### Приклад (неправильно ❌):
```typescript
// ❌ WRONG: Напряму до Supabase в UI
const { data } = await supabase
  .from('achievement')
  .select('*');
```

---

## 2. 🆔 ID-First Loading Pattern

**Правило:** Завантажуємо спочатку IDs, потім перевіряємо кеш, завантажуємо тільки missing.

### Переваги:
- 70% зменшення трафіку
- Максимальне переиспользование кешу
- Швидкість завантаження

### Flow:
1. **Phase 1:** Supabase → отримуємо IDs list (легкий запит)
2. **Phase 2:** RxDB → перевіряємо кеш по IDs
3. **Phase 3:** Supabase → завантажуємо тільки missing IDs
4. **Phase 4:** Merge cached + fresh records

### Документація:
- `/docs/LOCAL_FIRST_ROADMAP.md` - Phase 3.1

---

## 3. 📦 Dictionary Store with Additional Fields

**Правило:** Universal dictionary collection з optional `additional` JSON полем.

### Структура:
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
  cachedAt: number;      // Unix timestamp для TTL cleanup
}
```

### Коли використовувати:
- ✅ **Малі довідники** (< 1000 records): achievements, colors, sizes
- ✅ **DropdownInput** - завжди використовує DictionaryStore
- ✅ **LookupInput** - якщо немає `dataSource: "collection"` в config
- ❌ **Не використовувати** для main entities (breeds, pets) - вони через SpaceStore

### Використання:
```typescript
// Basic usage
await dictionaryStore.getDictionary('achievement', {
  idField: 'id',
  nameField: 'name',
  additionalFields: ['int_value', 'position', 'description', 'entity']
});

// With search and pagination
await dictionaryStore.getDictionary('coat_color', {
  search: 'red',
  limit: 30,
  offset: 0
});
```

### TTL і Cleanup:
- **TTL:** 14 днів (автоматичне видалення старих записів)
- **Cleanup:** Викликається автоматично при старті app
- **Cache warming:** Природнє накопичення популярних records

### Чому JSON поле:
- ✅ Схема залишається стабільною
- ✅ Гнучкість для різних довідників
- ✅ Не потрібна індексація (ID-First робить фільтрацію в Supabase)
- ✅ Малі довідники - швидко навіть без індексів

### Config Integration:
```json
// Entity config field
{
  "name": "pet_type_id",
  "component": "DropdownInput",
  "referencedTable": "pet_type"
  // No dataSource → uses DictionaryStore by default
}

// Main entity - uses SpaceStore instead
{
  "name": "breed_id",
  "component": "LookupInput",
  "referencedTable": "breed",
  "dataSource": "collection"  // → uses SpaceStore, not DictionaryStore
}
```

---

## 4. 🔄 Child Collections Pattern

**Правило:** Дочірні таблиці зберігаються в universal child collections з union schema.

### Структура:
```typescript
interface ChildDocument {
  id: string;
  tableType: string;  // 'achievement_in_breed', 'breed_division', etc.
  parentId: string;   // Посилання на parent entity
  // ... специфічні поля для кожного типу
}
```

### Завантаження:
```typescript
const records = await spaceStore.loadChildRecords(
  breedId,
  'achievement_in_breed',
  { limit: 50, orderBy: 'date' }
);
```

### Hook для React:
```typescript
const { data, isLoading, error } = useChildRecords({
  parentId: breedId,
  tableType: 'achievement_in_breed'
});
```

### TTL і Cleanup:
- **TTL:** 14 днів (автоматичне видалення старих записів)
- **Cleanup:** Викликається автоматично при старті SpaceStore та кожні 24 години
- **Cache warming:** Природнє накопичення популярних records
- **Важливо:** Запобігає розростанню клієнта - старі дані видаляються автоматично

```typescript
// SpaceStore.cleanupExpiredChildren()
// Runs on initialize and every 24 hours
// Removes child records older than 14 days
```

---

## 5. 📝 Configuration-Driven Development

**Правило:** Все визначається конфігурацією, мінімум хардкоду. UI генерується динамічно на основі конфігів.

### Джерело конфігурації:
```
Supabase `app_config` table → SpaceStore.entityConfigs → Dynamic UI
```

Всі entity definitions, fields, tabs, views зберігаються в базі і завантажуються при старті.

### Що конфігурується:

#### 1. **Entity Structure** (entity config)
```json
{
  "name": "breed",
  "table_name": "breed",
  "display_name": "Breed",
  "icon": "dog",
  "fields": [...],
  "tabs": [...],
  "views": [...]
}
```

#### 2. **Field Definitions** (field config)
```json
{
  "name": "coat_color_id",
  "label": "Coat Color",
  "component": "DropdownInput",
  "referencedTable": "coat_color",
  "validation": {
    "required": true
  }
  // No dataSource → uses DictionaryStore
}

{
  "name": "breed_id",
  "label": "Breed",
  "component": "LookupInput",
  "referencedTable": "breed",
  "dataSource": "collection",  // → uses SpaceStore
  "validation": {
    "required": true
  }
}
```

#### 3. **Component Mapping** (dynamic rendering)
```typescript
// UI dynamically selects component based on config
const componentMap = {
  'TextInput': TextInput,
  'DropdownInput': DropdownInput,
  'LookupInput': LookupInput,
  'DateInput': DateInput,
  'ImageUpload': ImageUpload
};

// Render field based on config.component
const Component = componentMap[fieldConfig.component];
return <Component {...fieldConfig} />;
```

#### 4. **Tabs & Views** (UI structure)
```json
{
  "tabs": [
    {
      "name": "overview",
      "label": "Overview",
      "component": "OverviewTab",
      "fields": ["name", "description", "status"]
    },
    {
      "name": "achievements",
      "label": "Achievements",
      "component": "BreedAchievementsTab",
      "childTable": "achievement_in_breed"
    }
  ]
}
```

### Як це працює:

```typescript
// 1. SpaceStore loads configs from Supabase
const entityConfig = spaceStore.getEntityConfig('breed');

// 2. UI uses config to render dynamic form
function DynamicForm({ entityType }) {
  const config = spaceStore.getEntityConfig(entityType);

  return (
    <>
      {config.fields.map(fieldConfig => (
        <DynamicField key={fieldConfig.name} config={fieldConfig} />
      ))}
    </>
  );
}

// 3. DynamicField chooses component based on config
function DynamicField({ config }) {
  const Component = componentMap[config.component];
  return <Component {...config} />;
}
```

### Переваги:

✅ **Швидкі зміни без деплою** - змінив config в БД, перезавантажив UI
✅ **Консистентність** - всі entities працюють однаково
✅ **Масштабованість** - додати нову entity = додати config
✅ **Тестування** - можна легко тестувати різні конфігурації
✅ **A/B тестування** - різні конфіги для різних користувачів

### Винятки (коли можна хардкод):

Специфічні компоненти (як `BreedAchievementsTab`) можуть мати хардкод, якщо:
- ✅ Унікальна логіка тільки для цього entity
- ✅ Ніколи не будуть переиспользовуватись
- ✅ Проста підтримка важливіша за гнучкість

### Principle: YAGNI

Не ускладнювати передчасно. Конфіги додаємо коли реально потрібна гнучкість.

**Приклад:** `BreedAchievementsTab` має хардкод логіку для achievement mutations.
Це OK, бо інші entities не мають таких складних achievement flows.

### Документація:
- `/docs/CONFIG_ARCHITECTURE.md` - Детальна архітектура конфігів
- `/docs/STORE_CREATION_GUIDE.md` - Як працювати зі stores через конфіги

---

## 6. 🔗 Route Store & Pretty URLs

**Правило:** Pretty URLs резолвляться через RouteStore з local-first підходом.

### URL Patterns:

```
/breeds                      → Space listing (known route)
/breeds/affenpinscher        → Entity in drawer (slug in URL)
/affenpinscher               → Pretty URL → needs resolution
/affenpinscher#achievements  → Pretty URL with tab
```

### Route Resolution Flow:

```
При відкритті entity (expand/click):
  → Зберігаємо в routes колекцію { slug, entity, entity_id, model }

При зовнішньому URL /affenpinscher:
  → RxDB routes → знайшли? → redirect до /breeds/:id з fullscreen state
  → Не знайшли → Supabase routes → кеш + redirect
  → Не знайшли → 404
```

### Slug Storage:

**slug залишається в entity таблиці** (source of truth):
```sql
breeds:
  id, name, slug, ...  ← slug тут

routes (lookup index):
  slug (PK), entity, entity_id, model  ← для резолву /affenpinscher
```

### Чому так:
- ✅ При завантаженні списку вже отримуємо slug разом з entity
- ✅ Offline-first - коли юзер клікає entity, slug вже є
- ✅ Routes колекція наповнюється lazy (тільки відкриті entities)
- ✅ Не забиваємо кеш непотрібним

### Data Flow:

```typescript
// 1. User clicks entity in list
handleEntityClick(entity) {
  // Save route for offline access
  routeStore.saveRoute({
    slug: entity.slug,
    entity: 'breed',
    entity_id: entity.id,
    model: 'breed'
  });

  // Navigate with slug
  navigate(`${entity.slug}#overview`);
}

// 2. External link /affenpinscher
SlugResolver {
  // Try local cache first
  route = await routeStore.resolveRoute('affenpinscher');

  // Redirect with fullscreen state
  navigate(`/breeds/${route.entity_id}`, {
    state: { fullscreen: true }
  });
}
```

### Fullscreen Mode:

Коли відкрито через pretty URL:
- `location.state.fullscreen === true`
- SpaceComponent форсує drawer mode `"over"` (fullscreen)
- Незалежно від розміру екрану

### Документація:
- `/docs/ROUTE_STORE_AND_REFACTORING.md` - Детальний план

---

## 7. 🚀 Progressive Enhancement

**Правило:** Починаємо з простого, ускладнюємо по потребі.

### Підхід:
1. **MVP:** Хардкод, працює для одного кейсу
2. **Refactor:** Додаємо конфіги коли бачимо pattern
3. **Generalize:** Робимо universal коли 3+ схожі кейси

### Не робимо:
- ❌ Universal компоненти "на майбутнє"
- ❌ Конфіги які ніхто не використовує
- ❌ Абстракції без реальної потреби

---

## 📚 Related Documentation

- `/docs/LOCAL_FIRST_ROADMAP.md` - Загальна архітектура
- `/docs/DYNAMIC_VIEW_ROWS_IMPLEMENTATION.md` - ID-First деталі
- `/docs/CHILD_TABLES_IMPLEMENTATION_PLAN.md` - Child collections план

---

**Last Updated:** 2025-11-30
