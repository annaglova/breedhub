# План імплементації: Readable Filter URLs (Labels замість UUID)

## Мета
Замість UUID в URL (`?type=590c4f91-6bae-4db7-ad70-f11f60b00996`) показувати читабельні значення (`?type=dogs`)

## Стратегія (Актуальна версія)

### Пріоритет вибору значення для URL:
1. **Label з нормалізацією** → беремо referencedFieldName, нормалізуємо
2. **Fallback** → залишаємо ID

### ⚠️ Відкладено на майбутнє:
- **valueSlug з таблиці** - поки слагів немає в базі, не використовуємо

### Приклади результату:
- `?type=dogs` (замість UUID)
- `?color=black-white` (замість UUID)
- `?location=kyiv-ukraine` (замість UUID)

---

## Архітектура рішення

### 1. Джерела даних для filter values

#### 1.1 Dictionary (словники)
```json
{
  "referencedTable": "pet_type",
  "referencedFieldID": "id",
  "referencedFieldName": "name"
}
```
- Дані в RxDB collections з суфіксом `_dictionary`
- Приклад: `pet_type_dictionary`
- Запит: `rxdb.collections.pet_type_dictionary.findOne({id: value})`
- Отримуємо: `doc.name` (referencedFieldName)

#### 1.2 Regular Collections (звичайні колекції)
```json
{
  "referencedTable": "breed",
  "referencedFieldID": "id",
  "referencedFieldName": "name"
}
```
- Дані в RxDB collections без суфікса
- Приклад: `breed`
- Запит: `rxdb.collections.breed.findOne({id: value})`
- Отримуємо: `doc.name` (referencedFieldName)

### 2. Визначення типу джерела

**Логіка перевірки:**
```typescript
function getCollectionName(referencedTable: string): {
  collectionName: string;
  isDictionary: boolean;
} {
  const dictionaryName = `${referencedTable}_dictionary`;

  // Спробувати знайти dictionary
  if (rxdb.collections[dictionaryName]) {
    return { collectionName: dictionaryName, isDictionary: true };
  }

  // Якщо немає dictionary - використати звичайну колекцію
  if (rxdb.collections[referencedTable]) {
    return { collectionName: referencedTable, isDictionary: false };
  }

  // Не знайдено
  return null;
}
```

---

## Компоненти рішення

### 1. Helper функції (новий файл: `filter-url-helpers.ts`)

#### 1.1 normalizeForUrl
**Призначення:** Нормалізувати текст для URL (lowercase, без пробілів, без спецсимволів)

```typescript
/**
 * Normalize text for URL
 * "Long Hair Cat" → "long-hair-cat"
 * "Black & White" → "black-white"
 */
function normalizeForUrl(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Видалити спецсимволи (крім дефісів і літер)
    .trim()
    .replace(/\s+/g, '-')      // Пробіли → дефіси
    .replace(/-+/g, '-');       // Множинні дефіси → один
}
```

**Тест кейси:**
- "Dogs" → "dogs"
- "Long Hair" → "long-hair"
- "Black & White" → "black-white"
- "French Bulldog (Mini)" → "french-bulldog-mini"

#### 1.2 getLabelForValue (ID → Label)
**Призначення:** Отримати label для value (ID)

```typescript
/**
 * Get display label for filter value
 *
 * Priority:
 * 1. Static options from config
 * 2. RxDB dictionary/collection lookup
 * 3. Fallback to ID
 */
async function getLabelForValue(
  fieldConfig: FilterFieldConfig,
  value: string,
  rxdb: RxDatabase
): Promise<string> {
  // Dynamic lookup (RxDB) - dictionaries or regular collections
  if (fieldConfig.referencedTable && fieldConfig.referencedFieldID && fieldConfig.referencedFieldName) {
    const collectionInfo = getCollectionName(fieldConfig.referencedTable);

    if (!collectionInfo) {
      console.warn(`Collection not found: ${fieldConfig.referencedTable}`);
      return value; // Fallback
    }

    const collection = rxdb.collections[collectionInfo.collectionName];
    const doc = await collection.findOne({
      selector: { [fieldConfig.referencedFieldID]: value }
    }).exec();

    if (doc) {
      return doc[fieldConfig.referencedFieldName] || value;
    }
  }

  // Fallback
  return value;
}
```

**Приклади:**
- Dictionary: `getLabelForValue({referencedTable: "pet_type"}, "uuid-123")` → "Dogs"
- Collection: `getLabelForValue({referencedTable: "breed"}, "uuid-456")` → "French Bulldog"
- Fallback: `getLabelForValue({}, "unknown")` → "unknown"

#### 1.3 getValueForLabel (Label → ID)
**Призначення:** Reverse lookup - знайти ID по label

```typescript
/**
 * Find value (ID) by label
 * Supports normalized labels (e.g., "long-hair" matches "Long Hair")
 */
async function getValueForLabel(
  fieldConfig: FilterFieldConfig,
  label: string,
  rxdb: RxDatabase
): Promise<string | null> {
  const normalizedSearchLabel = normalizeForUrl(label);

  // Dynamic lookup (RxDB) - dictionaries or regular collections
  if (fieldConfig.referencedTable && fieldConfig.referencedFieldName) {
    const collectionInfo = getCollectionName(fieldConfig.referencedTable);

    if (!collectionInfo) {
      console.warn(`Collection not found: ${fieldConfig.referencedTable}`);
      return null;
    }

    const collection = rxdb.collections[collectionInfo.collectionName];

    // Get all documents and find by normalized label
    const docs = await collection.find().exec();
    const match = docs.find(doc =>
      normalizeForUrl(doc[fieldConfig.referencedFieldName]) === normalizedSearchLabel
    );

    if (match) {
      return match[fieldConfig.referencedFieldID];
    }
  }

  // Not found
  return null;
}
```

**Приклади:**
- `getValueForLabel({referencedTable: "pet_type"}, "dogs")` → "uuid-123"
- `getValueForLabel({referencedTable: "breed"}, "long-hair")` → "uuid-456" (matches "Long Hair")
- `getValueForLabel({referencedTable: "breed"}, "french-bulldog")` → "uuid-789"

#### 1.4 getCollectionName (helper)
**Призначення:** Визначити правильну назву колекції (dictionary vs regular)

```typescript
function getCollectionName(
  referencedTable: string,
  rxdb: RxDatabase
): { collectionName: string; isDictionary: boolean } | null {
  const dictionaryName = `${referencedTable}_dictionary`;

  // Check dictionary first
  if (rxdb.collections[dictionaryName]) {
    return { collectionName: dictionaryName, isDictionary: true };
  }

  // Check regular collection
  if (rxdb.collections[referencedTable]) {
    return { collectionName: referencedTable, isDictionary: false };
  }

  // Not found
  return null;
}
```

---

### 2. Модифікація SpaceComponent.tsx

#### 2.1 Import helpers
```typescript
import {
  normalizeForUrl,
  getLabelForValue,
  getValueForLabel
} from './utils/filter-url-helpers';
```

#### 2.2 Отримати RxDB instance
```typescript
const rxdb = useRxDB(); // або інший спосіб отримання RxDB
```

#### 2.3 Модифікувати handleFiltersApply

**Було:**
```typescript
const handleFiltersApply = useCallback((filterValues: Record<string, any>) => {
  const newParams = new URLSearchParams(searchParams);

  Object.entries(filterValues).forEach(([fieldId, value]) => {
    if (value) {
      const fieldConfig = filterFields.find(f => f.id === fieldId);
      const urlKey = fieldConfig?.slug || fieldId;
      newParams.set(urlKey, String(value)); // UUID тут
    }
  });

  setSearchParams(newParams);
}, [...]);
```

**Стане:**
```typescript
const handleFiltersApply = useCallback(async (filterValues: Record<string, any>) => {
  const newParams = new URLSearchParams(searchParams);

  for (const [fieldId, value] of Object.entries(filterValues)) {
    if (value !== undefined && value !== null && value !== '') {
      const fieldConfig = filterFields.find(f => f.id === fieldId);
      const urlKey = fieldConfig?.slug || fieldId;

      // Get label for value
      const label = await getLabelForValue(fieldConfig, value, rxdb);
      const normalizedLabel = normalizeForUrl(label);

      newParams.set(urlKey, normalizedLabel);
    } else {
      // Remove filter
      const fieldConfig = filterFields.find(f => f.id === fieldId);
      if (fieldConfig?.slug) {
        newParams.delete(fieldConfig.slug);
      }
      newParams.delete(fieldId);
    }
  }

  setSearchParams(newParams);
}, [searchParams, setSearchParams, filterFields, rxdb]);
```

**Зміни:**
- Функція стала `async`
- Викликаємо `getLabelForValue` для отримання label
- Нормалізуємо label через `normalizeForUrl`
- Записуємо normalized label в URL

#### 2.4 Модифікувати filters useMemo

**Було:**
```typescript
const filters = useMemo(() => {
  const filterObj: Record<string, any> = {};

  searchParams.forEach((value, key) => {
    if (!reservedParams.includes(key) && value) {
      let fieldConfig = filterFields.find(f => f.slug === key);
      if (!fieldConfig) {
        fieldConfig = filterFields.find(f => f.id === key);
      }

      if (fieldConfig) {
        const fieldKey = fieldConfig.id.replace(/^breed_field_/, '');
        filterObj[fieldKey] = value; // value = UUID
      }
    }
  });

  return filterObj;
}, [searchParams, filterFields]);
```

**Стане:**
```typescript
const filters = useMemo(() => {
  const filterObj: Record<string, any> = {};
  const reservedParams = ['sort', 'view', 'sortBy', 'sortDir', 'sortParam'];

  searchParams.forEach(async (urlValue, urlKey) => {
    if (!reservedParams.includes(urlKey) && urlValue) {
      // Find field config by slug or field ID
      let fieldConfig = filterFields.find(f => f.slug === urlKey);
      if (!fieldConfig) {
        fieldConfig = filterFields.find(f => f.id === urlKey);
      }

      if (fieldConfig) {
        // Convert label to ID
        const valueId = await getValueForLabel(fieldConfig, urlValue, rxdb);

        if (valueId) {
          // Remove entity_field_ prefix
          const fieldKey = fieldConfig.id.replace(
            new RegExp(`^${config.entitySchemaName}_field_`),
            ''
          );
          filterObj[fieldKey] = valueId; // ID для фільтрації
        } else {
          // Fallback: якщо не знайшли по label, можливо це вже ID
          console.warn(`Could not find ID for label: ${urlValue}`);
          const fieldKey = fieldConfig.id.replace(
            new RegExp(`^${config.entitySchemaName}_field_`),
            ''
          );
          filterObj[fieldKey] = urlValue;
        }
      }
    }
  });

  return Object.keys(filterObj).length > 0 ? filterObj : undefined;
}, [searchParams, config.entitySchemaName, filterFields, rxdb]);
```

**Проблема:** `useMemo` не може бути async!

**Рішення:** Використати `useEffect` + `useState` для async операцій:

```typescript
const [filters, setFilters] = useState<Record<string, any> | undefined>(undefined);

useEffect(() => {
  const buildFilters = async () => {
    const filterObj: Record<string, any> = {};
    const reservedParams = ['sort', 'view', 'sortBy', 'sortDir', 'sortParam'];

    const promises = [];
    searchParams.forEach((urlValue, urlKey) => {
      if (!reservedParams.includes(urlKey) && urlValue) {
        promises.push(
          (async () => {
            let fieldConfig = filterFields.find(f => f.slug === urlKey);
            if (!fieldConfig) {
              fieldConfig = filterFields.find(f => f.id === urlKey);
            }

            if (fieldConfig) {
              const valueId = await getValueForLabel(fieldConfig, urlValue, rxdb);

              if (valueId) {
                const fieldKey = fieldConfig.id.replace(
                  new RegExp(`^${config.entitySchemaName}_field_`),
                  ''
                );
                filterObj[fieldKey] = valueId;
              } else {
                // Fallback
                const fieldKey = fieldConfig.id.replace(
                  new RegExp(`^${config.entitySchemaName}_field_`),
                  ''
                );
                filterObj[fieldKey] = urlValue;
              }
            }
          })()
        );
      }
    });

    await Promise.all(promises);
    setFilters(Object.keys(filterObj).length > 0 ? filterObj : undefined);
  };

  buildFilters();
}, [searchParams, config.entitySchemaName, filterFields, rxdb]);
```

#### 2.5 Модифікувати activeFilters (для chips)

**Опціонально:** Показувати красиві label в chips замість normalized URL values

```typescript
const activeFilters = useMemo(() => {
  const filters: Array<{ id: string; label: string; isRequired: boolean }> = [];
  const reservedParams = ['sort', 'view', 'sortBy', 'sortDir', 'sortParam'];

  searchParams.forEach((urlValue, urlKey) => {
    if (!reservedParams.includes(urlKey) && urlValue) {
      let fieldConfig = filterFields.find(f => f.slug === urlKey);
      if (!fieldConfig) {
        fieldConfig = filterFields.find(f => f.id === urlKey);
      }

      // De-normalize for display: "long-hair" → "Long Hair"
      const displayValue = urlValue
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      filters.push({
        id: urlKey,
        label: fieldConfig
          ? `${fieldConfig.displayName}: ${displayValue}`
          : `${urlKey}: ${displayValue}`,
        isRequired: false
      });
    }
  });

  return filters;
}, [searchParams, filterFields]);
```

---

### 3. Структура файлів

```
apps/app/src/
├── components/
│   └── space/
│       ├── SpaceComponent.tsx (модифікується)
│       ├── filters/
│       │   ├── FiltersDialog.tsx
│       │   └── FiltersSection.tsx
│       └── utils/
│           └── filter-url-helpers.ts (НОВИЙ)
└── ...
```

---

## Edge Cases і обробка помилок

### 1. Колекція не знайдена
```typescript
if (!collectionInfo) {
  console.warn(`Collection not found: ${referencedTable}`);
  return value; // Fallback to ID
}
```

### 2. Документ не знайдений (видалений з БД)
```typescript
if (!doc) {
  console.warn(`Document not found in ${collectionName}: ${value}`);
  return value; // Fallback to ID
}
```

### 3. Дублікати labels (кілька документів з однаковою назвою)
```typescript
// При getValueForLabel - повернути перший знайдений
const match = docs.find(doc =>
  normalizeForUrl(doc[referencedFieldName]) === normalizedSearchLabel
);
```

**Рекомендація:** В майбутньому додати slug для таких випадків

### 4. Дуже довгі назви
```typescript
// Обмежити довжину в normalizeForUrl
function normalizeForUrl(text: string, maxLength = 50): string {
  const normalized = text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

  return normalized.length > maxLength
    ? normalized.substring(0, maxLength)
    : normalized;
}
```

### 5. Спецсимволи та емодзі
```typescript
// normalizeForUrl вже видаляє спецсимволи
.replace(/[^\w\s-]/g, '') // Залишає тільки букви, цифри, пробіли, дефіси
```

### 6. Async operations в handleFiltersApply
```typescript
// Якщо юзер швидко клацає Apply кілька разів
// Використати debounce або показувати loading state
const [isApplyingFilters, setIsApplyingFilters] = useState(false);

const handleFiltersApply = useCallback(async (filterValues) => {
  if (isApplyingFilters) return; // Запобігти подвійному виклику

  setIsApplyingFilters(true);
  try {
    // ... logic
  } finally {
    setIsApplyingFilters(false);
  }
}, [...]);
```

---

## План тестування

### 1. Static options
- [x] Apply filter with static options → URL has normalized label
- [x] Navigate to URL with label → data filters correctly
- [x] Remove filter chip → URL updates

### 2. Dictionary lookup
- [x] Apply filter (pet_type_dictionary) → URL has normalized label
- [x] Navigate to URL with label → finds ID, filters correctly
- [x] Test with labels containing spaces ("Long Hair")
- [x] Test with labels containing special chars ("Black & White")

### 3. Regular collection lookup
- [x] Apply filter (breed collection) → URL has normalized label
- [x] Navigate to URL with label → finds ID, filters correctly

### 4. Edge cases
- [x] Unknown label in URL → fallback to treating as ID
- [x] Collection not found → fallback to ID
- [x] Multiple filters at once
- [x] Clear all filters
- [x] Very long labels (> 50 chars)

### 5. Performance
- [x] RxDB queries не блокують UI
- [x] Multiple rapid filter changes

---

## Майбутні покращення (коли додамо valueSlug в таблиці)

### ⚠️ Відкладено: використання valueSlug з таблиці
Коли в майбутньому додамо поле `slug` в таблиці (pet_type_dictionary, breed тощо):

#### 1. Додати valueSlug до таблиці
```sql
ALTER TABLE pet_type ADD COLUMN slug VARCHAR(100);
-- Наприклад: 'dogs', 'cats', 'birds'
```

#### 2. Модифікувати priority в getLabelForValue
```typescript
// Priority:
// 1. valueSlug з таблиці (NEW!)
// 2. Normalized label
// 3. ID
```

#### 3. Модифікувати getValueForLabel
```typescript
// Try finding by slug first
const matchBySlug = docs.find(doc => doc.slug === searchValue);
if (matchBySlug) return matchBySlug.id;

// Then by normalized label
```

---

## Резюме

### Що робимо зараз (актуальна версія):
1. ✅ Створюємо `filter-url-helpers.ts` з helper функціями (без static options)
2. ✅ Модифікуємо `handleFiltersApply` - async, конвертація ID → label
3. ✅ Модифікуємо filters logic - useEffect + async, конвертація label → ID
4. ✅ Підтримуємо dictionaries та regular collections
5. ✅ Тестуємо на pet_type, breeds

### Що НЕ робимо зараз:
- ❌ Static options в конфігу (їх не буде)
- ⏸️ valueSlug з таблиці (поки слагів немає в базі)

### Що додамо пізніше:
- 🔮 valueSlug з таблиці для точного контролю URL (коли додадуть в БД)
- 🔮 Кешування lookups для performance
- 🔮 Більш складна транслітерація (якщо потрібно)

### Переваги:
- ✅ Читабельні URL: `?type=dogs` замість UUID
- ✅ Працює з dictionaries і collections
- ✅ Fallback на ID якщо щось не так
- ✅ Готово до майбутнього додавання slug
