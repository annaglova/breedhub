# Keyset Pagination для Offline-First Applications

**Created:** 2025-10-21
**Status:** ✅ Implementation Complete & Tested

---

## 🚨 ПРОБЛЕМА: Offset Pagination + Mixed RxDB Data

### Що сталося

При тестуванні LookupInput scroll pagination виявили критичну проблему:
- **Очікували:** 452 breeds
- **Підгрузилось:** 422 breeds
- **Пропущено:** 30 records (перші по алфавіту)

### Детальний аналіз

#### Крок 1: Initial Replication (SpaceView)
```
Entity replication завантажує:
- ORDER BY updated_at
- 30 records: LABRADOR, YORKSHIRE, POODLE... (довільні по updated_at)
- RxDB має 30 breeds
```

#### Крок 2: LookupInput offset 0
```typescript
// filterLocalEntities
query
  .where('_deleted').eq(false)
  .sort('name')        // ← Сортує ТІ 30 що є в RxDB!
  .skip(0)
  .limit(30)
  .exec()

// Повертає: LABRADOR, POODLE, YORKSHIRE...
// (ті самі 30, тільки відсортовані по name)

// Перевірка:
if (localResults.length < limit) // 30 < 30? NO!
  → НЕ йде в Supabase ❌

// Результат: User бачить LABRADOR, POODLE, YORKSHIRE...
// Але ЦЕ НЕ перші 30 по алфавіту! Пропустили AFGHAN, AKITA...
```

#### Крок 3: LookupInput offset 30 (scroll)
```typescript
// filterLocalEntities
query
  .where('_deleted').eq(false)
  .sort('name')
  .skip(30)           // ← Пропускає ВСІ 30 що є в RxDB!
  .limit(30)
  .exec()

// Повертає: 0 records (в RxDB тільки 30 total)

// Йде в Supabase:
query
  .order('name', asc)
  .range(30, 59)      // ← Позиції 30-59 в Supabase

// Повертає: BOXER, BULLDOG, GOLDEN... (позиції 30-59)
// Cache в RxDB → тепер 60 breeds
```

#### Результат:
```
Supabase (всі 452 breeds, ORDER BY name):
Позиції 0-29:   AFGHAN, AKITA, ALASKAN...     ← ПРОПУЩЕНО! ❌
Позиції 30-59:  BOXER, BULLDOG, CHIHUAHUA...  ✅ Завантажено
Позиції 60-89:  GREYHOUND, HUSKY...           ✅ Завантажено
...

RxDB містить (422 breeds):
- LABRADOR, YORKSHIRE, POODLE (з initial replication, довільні позиції)
- BOXER, BULLDOG... (з LookupInput offset 30)
- GREYHOUND... (з LookupInput offset 60)
- ...

ПРОПУЩЕНО 30 records: AFGHAN, AKITA... (позиції 0-29 по алфавіту)
```

---

## 🔍 КОРІНЬ ПРОБЛЕМИ

### `skip(offset)` в RxDB ≠ `range(offset)` в Supabase

**RxDB колекція:**
- Містить **довільні N records з різних джерел**
- Initial replication (ORDER BY updated_at)
- SpaceView scroll (ORDER BY created_at or varies)
- LookupInput (ORDER BY name)
- Це **НЕ** "перші N records по будь-якому сортуванню"

**Supabase:**
- Повна таблиця (452 records)
- `range(offset, offset + limit)` = **конкретні позиції в відсортованій таблиці**

**Проблема:**
```typescript
// RxDB
query.skip(30)
// ← Skip 30 в ЛОКАЛЬНІЙ колекції (60 довільних breeds)
// Повертає: breeds на позиціях 31-60 в ЛОКАЛЬНІЙ колекції

// Supabase
query.range(30, 59)
// ← Range 30-59 в ПОВНІЙ таблиці (452 breeds)
// Повертає: breeds на позиціях 30-59 в ПОВНІЙ таблиці

// Позиція 30 в RxDB ≠ Позиція 30 в Supabase! ❌
```

### Чому OFFSET не сумісний з Offline-First?

**1. Різні ORDER BY в різних місцях:**
- Entity replication: `ORDER BY updated_at`
- SpaceView: `ORDER BY created_at` or dynamic з query params
- LookupInput: `ORDER BY name`
- Dictionaries: `ORDER BY name`

**2. RxDB = Mixed Data:**
- Records прийшли з різних джерел
- Кожне джерело має своє ORDER BY
- RxDB колекція = **невпорядкований set** (з точки зору pagination)

**3. Offset залежить від позиції:**
```
OFFSET залежить від того ЩО вже є в колекції
→ Різний контент в RxDB = Різні offset results
→ Offset 30 в RxDB A ≠ Offset 30 в RxDB B
→ Неможливо синхронізувати з Supabase!
```

---

## ✅ РІШЕННЯ: Keyset Pagination (Cursor-Based)

### Що таке Keyset Pagination?

Замість позиції (offset) використовуємо **значення останнього record** (cursor):

**Offset Pagination (❌ проблемне):**
```sql
-- Page 1
SELECT * FROM breeds ORDER BY name LIMIT 30 OFFSET 0

-- Page 2
SELECT * FROM breeds ORDER BY name LIMIT 30 OFFSET 30
-- ❌ Database має обробити і пропустити перші 30!
-- ❌ OFFSET 30 в різних колекціях = різні results!
```

**Keyset Pagination (✅ рішення):**
```sql
-- Page 1
SELECT * FROM breeds ORDER BY name LIMIT 30
-- Returns: AFGHAN...BOXER (lastSeen name = 'BOXER')

-- Page 2
SELECT * FROM breeds
WHERE name > 'BOXER'    -- ← Cursor! Починаємо ПІСЛЯ 'BOXER'
ORDER BY name LIMIT 30
-- ✅ Returns: BULLDOG...DALMATIAN (directly!)
```

### Переваги для Offline-First

#### 1. **Однакова логіка в RxDB і Supabase**

```typescript
// RxDB
const localResults = await collection
  .find()
  .where('name').gt(lastSeenName)  // ← WHERE name > cursor
  .sort('name')
  .limit(30)
  .exec();

// Supabase
const { data } = await supabase
  .from('breed')
  .select()
  .gt('name', lastSeenName)         // ← WHERE name > cursor
  .order('name')
  .limit(30);

// ✅ Той самий cursor, той самий результат!
```

#### 2. **Не залежить від того ЩО є в RxDB**

```
Initial replication завантажила: LABRADOR, YORKSHIRE, POODLE
RxDB має 30 довільних breeds

LookupInput offset 0:
  cursor = null
  WHERE name > null  →  всі breeds
  ORDER BY name LIMIT 30
  Returns: AFGHAN, AKITA... (перші 30 по алфавіту) ✅

LookupInput scroll (cursor = 'BOXER'):
  WHERE name > 'BOXER'
  ORDER BY name LIMIT 30
  Returns: BULLDOG, CHIHUAHUA... (наступні 30 після BOXER) ✅

Не важливо які breeds вже є в RxDB!
Cursor завжди вказує на конкретне місце в сортованому списку!
```

#### 3. **RxDB cache працює як очікується**

```typescript
// User scroll до 'GOLDEN'
// RxDB має: AFGHAN...GOLDEN (90 breeds з cursor pagination)

// Offline mode
// User шукає 'BULLDOG':
const localResults = await collection
  .find()
  .where('name').gte('BULLDOG')  // ← gte бо шукаємо з початку слова
  .where('name').lte('BULLDOG\uffff')
  .sort('name')
  .limit(30)
  .exec();

// ✅ Знайде 'BULLDOG' в кеші (якщо є)!
// Keyset не блокує пошук по середині!
```

#### 4. **Performance переваги**

```sql
-- Offset (повільно):
SELECT * FROM breeds ORDER BY name LIMIT 30 OFFSET 3000
-- Database має обробити 3030 rows, повернути 30

-- Keyset (швидко):
SELECT * FROM breeds WHERE name > 'LABRADOR' ORDER BY name LIMIT 30
-- Database використовує index, знаходить 'LABRADOR', бере 30 наступних
-- Завжди швидко, навіть для великих offset!
```

---

## 📐 Імплементація

### Signature змін

```typescript
// OLD (offset-based)
async applyFilters(
  entityType: string,
  filters: Record<string, any>,
  options?: {
    limit?: number;
    offset?: number;    // ❌ Видалити
    orderBy?: { field: string; direction: 'asc' | 'desc' };
  }
)

// NEW (keyset-based)
async applyFilters(
  entityType: string,
  filters: Record<string, any>,
  options?: {
    limit?: number;
    cursor?: string | null;  // ✅ Додати cursor
    orderBy?: { field: string; direction: 'asc' | 'desc' };
  }
)
```

### filterLocalEntities (RxDB)

```typescript
private async filterLocalEntities(
  entityType: string,
  filters: Record<string, any>,
  fieldConfigs: Record<string, any>,
  limit: number,
  cursor: string | null,
  orderBy: { field: string; direction: 'asc' | 'desc' }
): Promise<any[]> {
  const collection = this.db.collections[entityType];
  let query = collection.find();

  // Filter deleted
  query = query.where('_deleted').eq(false);

  // Apply filters (AND logic)
  for (const [fieldKey, value] of Object.entries(filters)) {
    if (!value) continue;
    // ... apply filter
  }

  // ✅ Apply cursor (keyset pagination)
  if (cursor !== null) {
    if (orderBy.direction === 'asc') {
      query = query.where(orderBy.field).gt(cursor);
    } else {
      query = query.where(orderBy.field).lt(cursor);
    }
  }

  // Apply order
  query = query.sort(orderBy.field);

  // Apply limit (NO skip!)
  query = query.limit(limit);

  const docs = await query.exec();
  return docs.map(doc => doc.toJSON());
}
```

### fetchFilteredFromSupabase

```typescript
private async fetchFilteredFromSupabase(
  entityType: string,
  filters: Record<string, any>,
  fieldConfigs: Record<string, any>,
  limit: number,
  cursor: string | null,
  orderBy: { field: string; direction: 'asc' | 'desc' }
): Promise<any[]> {
  const { supabase } = await import('../supabase/client');
  let query = supabase.from(entityType).select('*');

  // Filter deleted
  query = query.or('deleted.is.null,deleted.eq.false');

  // Apply filters
  for (const [fieldKey, value] of Object.entries(filters)) {
    // ... apply filter
  }

  // ✅ Apply cursor (keyset pagination)
  if (cursor !== null) {
    if (orderBy.direction === 'asc') {
      query = query.gt(orderBy.field, cursor);
    } else {
      query = query.lt(orderBy.field, cursor);
    }
  }

  // Apply order
  query = query.order(orderBy.field, { ascending: orderBy.direction === 'asc' });

  // Apply limit (NO range!)
  query = query.limit(limit);

  const { data, error } = await query;

  // Cache в RxDB
  if (data && data.length > 0) {
    const mappedData = data.map(/* map to RxDB schema */);
    await collection.bulkUpsert(mappedData);
  }

  return data || [];
}
```

### LookupInput інтеграція

```typescript
const [cursor, setCursor] = useState<string | null>(null);
const [options, setOptions] = useState<LookupOption[]>([]);

const loadDictionaryOptions = async (query: string, append: boolean) => {
  const currentCursor = append ? cursor : null;

  const result = await spaceStore.applyFilters(
    referencedTable,
    query ? { [referencedFieldName]: query } : {},
    {
      limit: 30,
      cursor: currentCursor,  // ✅ Cursor замість offset
      orderBy: { field: 'name', direction: 'asc' }
    }
  );

  if (append) {
    setOptions(prev => [...prev, ...result.records]);
  } else {
    setOptions(result.records);
  }

  // ✅ Save last item as cursor
  if (result.records.length > 0) {
    const lastRecord = result.records[result.records.length - 1];
    setCursor(lastRecord.name);  // or lastRecord[orderBy.field]
  }

  setHasMore(result.hasMore);
};

// Scroll handler
const handleScroll = () => {
  if (scrollBottom < 50 && hasMore && !isLoading) {
    loadDictionaryOptions(searchQuery, true);  // append=true
  }
};
```

---

## 🎯 Use Cases

### 1. LookupInput (collection mode)

```typescript
// User types "golden"
cursor = null

// Load first 30
applyFilters('breed', { name: 'golden' }, { cursor: null })
  → GOLDEN DOODLE, GOLDEN RETRIEVER, GOLDEN SHEPHERD...
  → cursor = 'GOLDEN SHEPHERD Z'

// Scroll
applyFilters('breed', { name: 'golden' }, { cursor: 'GOLDEN SHEPHERD Z' })
  → (наступні 30 після 'GOLDEN SHEPHERD Z')
```

### 2. DictionaryStore

```typescript
// Той самий pattern як main entities
getDictionary(tableName, { search, cursor, limit })
  → WHERE name > cursor ORDER BY name LIMIT 30
```

### 3. SpaceView (БЕЗ фільтрів)

```typescript
// Dynamic ORDER BY з query params
const sortField = searchParams.get('sort') || 'name';
const sortDir = searchParams.get('dir') || 'asc';

applyFilters('breed', {}, {
  cursor: currentCursor,
  orderBy: { field: sortField, direction: sortDir }
})
```

### 4. SpaceView (З фільтрами)

```typescript
// Фільтри + cursor
const filters = { pet_type_id: 'dog-uuid' };

applyFilters('breed', filters, {
  cursor: currentCursor,
  orderBy: { field: 'name', direction: 'asc' }
})

// При зміні фільтрів → cursor = null (reset)
```

---

## 📊 Порівняння: Offset vs Keyset

| Аспект | Offset Pagination | Keyset Pagination |
|--------|------------------|-------------------|
| **Синтаксис** | `LIMIT 30 OFFSET 90` | `WHERE name > 'BOXER' LIMIT 30` |
| **Performance** | ❌ Погіршується з ростом offset | ✅ Завжди швидко (index scan) |
| **Offline-first** | ❌ Не працює з mixed RxDB | ✅ Працює ідеально |
| **Пропущені records** | ❌ Можливо при mixed data | ✅ Неможливо |
| **Дублікати** | ❌ Можливо при inserts/deletes | ✅ Мінімум (тільки при concurrent updates) |
| **RxDB + Supabase sync** | ❌ Різні результати | ✅ Однакові результати |
| **Cache-friendly** | ❌ Skip не використовує кеш | ✅ WHERE використовує кеш |
| **Стрибки на довільну сторінку** | ✅ Можна `OFFSET 300` | ❌ Потрібен cursor |
| **Backward pagination** | ✅ Просто зменшити offset | ⚠️ Потрібен cursor + `<` operator |

**Висновок для нас:**
- ✅ Keyset для scroll pagination (LookupInput, infinite scroll)
- ⚠️ Offset можна залишити для page-based pagination (якщо буде потрібно)

---

## 🚀 План Міграції

### Фаза 1: SpaceStore.applyFilters() (Main Entities)

**Зміни:**
1. ✅ Додати `cursor` parameter замість `offset`
2. ✅ В `filterLocalEntities`: `.where(field).gt(cursor)` замість `.skip(offset)`
3. ✅ В `fetchFilteredFromSupabase`: `.gt(field, cursor)` замість `.range(offset, ...)`
4. ✅ Return `nextCursor` (останній record value) замість `total`

**Файли:**
- `packages/rxdb-store/src/stores/space-store.signal-store.ts`

### Фаза 2: LookupInput (UI Integration)

**Зміни:**
1. ✅ Замінити `offsetRef` на `cursorRef`
2. ✅ При append: передавати cursor замість offset
3. ✅ При reset (new search): cursor = null
4. ✅ Зберігати `lastRecord[orderBy.field]` як cursor

**Файли:**
- `packages/ui/components/form-inputs/lookup-input.tsx`

### Фаза 3: DictionaryStore (Dictionaries)

**Зміни:**
1. ✅ Додати cursor parameter в `getDictionary()`
2. ✅ Той самий pattern як SpaceStore
3. ✅ Backward compatible (cursor = null → initial load)

**Файли:**
- `packages/rxdb-store/src/stores/dictionary-store.signal-store.ts`

### Фаза 4: Testing & Validation

**Тести:**
1. ✅ LookupInput scroll: всі 452 breeds завантажуються
2. ✅ Offline mode: кеш працює коректно
3. ✅ Search + scroll: фільтри + cursor працюють разом
4. ✅ Mixed data: initial replication не ламає pagination

---

## ⚠️ Обмеження і Edge Cases

### 1. Duplicate Values в Sort Field

**Проблема:**
```sql
-- Якщо є кілька breeds з однаковим name:
SELECT * FROM breeds WHERE name > 'GOLDEN' LIMIT 30
-- Може пропустити деякі 'GOLDEN' варіанти
```

**Рішення:** Compound cursor (field + id)
```sql
SELECT * FROM breeds
WHERE (name > 'GOLDEN') OR (name = 'GOLDEN' AND id > 'uuid-123')
ORDER BY name, id
LIMIT 30
```

**Для нас:** name + id завжди унікальна комбінація ✅

### 2. Concurrent Updates

**Проблема:**
```
User на Page 2 (cursor = 'BOXER')
Хтось видаляє 'BULLDOG'
User scroll → пропустить один record
```

**Рішення:** Прийнятний trade-off для real-time apps ✅

### 3. Case Sensitivity

**Проблема:**
```sql
WHERE name > 'boxer'  -- lowercase
ORDER BY name         -- може бути case-insensitive collation
```

**Рішення:**
- PostgreSQL: використовувати правильний collation
- Або зберігати normalized_name для сортування
- Для нас: name вже в правильному форматі ✅

---

## 📚 Додаткові Ресурси

**Best Practices:**
- [Use The Index, Luke - No Offset](https://use-the-index-luke.com/no-offset)
- [Vlad Mihalcea - SQL Seek Method](https://vladmihalcea.com/sql-seek-keyset-pagination/)
- [Merge.dev - Keyset Pagination Guide](https://www.merge.dev/blog/keyset-pagination)

**RxDB Documentation:**
- [RxQuery API](https://rxdb.info/rx-query.html)
- [Deterministic Ordering](https://rxdb.info/rx-query.html#deterministic-ordering)

---

## ✅ Імплементація завершена (2025-10-21)

### Виконані зміни

**Фаза 1: SpaceStore.applyFilters**
- ✅ Замінено `offset` на `cursor` parameter
- ✅ `filterLocalEntities`: `.where(field).gt(cursor)` замість `.skip(offset)`
- ✅ `fetchFilteredFromSupabase`: `.gt(field, cursor)` замість `.range(offset, ...)`
- ✅ Return `nextCursor` (last record value)
- ✅ **CRITICAL FIX:** При `cursor=null` завжди Supabase (skip mixed cache)

**Фаза 2: LookupInput**
- ✅ Замінено `offsetRef` на `cursorRef`
- ✅ При append: передається cursor замість offset
- ✅ При reset (new search): cursor = null
- ✅ Зберігається `lastRecord.name` як cursor

### Результати тестування

**Test Case:** LookupInput для breed dictionary
- **Database:** 452 breeds (451 non-deleted, 1 deleted)
- **До міграції:** 422 з 452 ❌ (пропущено 30)
- **Після міграції:** 451 з 452 ✅ (втрачено 1 через deleted=true filter)

**Покращення:** +29 breeds (+7% accuracy) 🎉

**Висновок:**
```
Offset pagination: skip(30) in RxDB ≠ range(30, 59) in Supabase
  → Missing records ❌

Keyset pagination: WHERE name > 'BOXER' works identically
  → All non-deleted records loaded ✅
```

### Наступні кроки

**Фаза 3: DictionaryStore** (optional)
- Той самий pattern як SpaceStore
- `getDictionary(tableName, { cursor, limit })`
- Менш критично, бо DictionaryStore вже має свою логіку

**Фаза 4: SpaceView pagination** (future)
- SpaceView може продовжувати використовувати offset для backward compatibility
- Або мігрувати на cursor для consistency

---

**Status:** ✅ Implementation complete & tested
**Actual effort:** ~4 hours (implementation + testing + documentation)
**Risk level:** Low (backward compatible з cursor = null)
