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

---

## 5. 📝 Configuration-Driven Development

**Правило:** Все визначається конфігурацією, мінімум хардкоду.

### Винятки:
Специфічні компоненти (як `BreedAchievementsTab`) можуть мати хардкод, якщо:
- Унікальна логіка тільки для цього entity
- Ніколи не будуть переиспользовуватись
- Проста підтримка важливіша за гнучкість

### Principle: YAGNI
Не ускладнювати передчасно. Конфіги додаємо коли реально потрібна гнучкість.

---

## 6. 🚀 Progressive Enhancement

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

**Last Updated:** 2024-11-24
