# Шпаргалка: Сортування та Пагінація

## Як працює сортування

### Primary Sort + Tie-Breaker

Ми використовуємо **2 порядки сортування**:

1. **Primary field** - основне поле для сортування (наприклад, `name`, `achievement_progress`)
2. **Tie-breaker field** - додаткове поле для розриву "нічиїх" (зазвичай `id`)

**Чому потрібен tie-breaker?**

Якщо багато записів мають однакове значення primary field, без tie-breaker:
- ❌ Порядок записів випадковий
- ❌ При pagination можуть бути дублікати
- ❌ Записи "стрибають" між сторінками

**Приклад без tie-breaker:**
```sql
ORDER BY achievement_progress  -- багато записів з progress = 0
```
Результат: записи з `progress = 0` в рандомному порядку, при кожному запиті по-новому!

**Приклад з tie-breaker:**
```sql
ORDER BY achievement_progress, id  -- стабільний порядок
```
Результат: записи з однаковим `progress` відсортовані по `id` (A→Z), завжди однаковий порядок!

### Конфігурація в коді

```typescript
// В конфігу сортування
{
  field: 'achievement_progress',
  direction: 'asc',
  tieBreaker: {
    field: 'id',
    direction: 'asc'
  }
}
```

## Cursor Pagination (Keyset Pagination)

### Чому не Offset?

**Offset pagination (ПОГАНО):**
```sql
SELECT * FROM breeds ORDER BY name LIMIT 30 OFFSET 60
```
❌ Повільно (БД сканує всі пропущені рядки)
❌ Дублікати якщо дані змінюються
❌ Неефективно на великих таблицях

**Cursor pagination (ДОБРЕ):**
```sql
-- Сторінка 1
SELECT * FROM breeds ORDER BY name, id LIMIT 30
-- Останній: {name: "Zebra", id: "zzz"}

-- Сторінка 2: продовжити ВІД курсору
SELECT * FROM breeds
WHERE name > 'Zebra'
   OR (name = 'Zebra' AND id > 'zzz')
ORDER BY name, id LIMIT 30
```
✅ Швидко (індекс працює)
✅ Немає дублікатів
✅ Стабільно

### Composite Cursor

Курсор зберігає **обидва** значення сортування:

```javascript
cursor = {
  value: "Zebra",      // значення primary field
  id: "zzz-uuid"       // значення tie-breaker
}
```

### WHERE для Composite Cursor

Щоб продовжити з курсору, потрібен WHERE з OR:

```sql
WHERE primary_field > cursor_value
   OR (primary_field = cursor_value AND id > cursor_id)
```

**Чому складна умова?**

```
Записи в БД:
- {name: "Labrador", id: "aaa"}
- {name: "Labrador", id: "bbb"}
- {name: "Labrador", id: "ccc"} ← cursor (останній на сторінці 1)
- {name: "Labrador", id: "ddd"} ← має бути першим на сторінці 2
- {name: "Poodle", id: "xxx"}
```

Якщо `WHERE name > 'Labrador'`:
- ❌ Пропустить всі з name="Labrador" (включно з "ddd")
- ✅ Візьме тільки "Poodle"

Правильно: `WHERE name > 'Labrador' OR (name = 'Labrador' AND id > 'ccc')`:
- ✅ Візьме "Labrador/ddd" (same name, higher id)
- ✅ Візьме "Poodle" (higher name)

## Проблема: Сортування по JSONB полю

### Що не працює

**JSONB поля (наприклад measurements):**
```typescript
{
  field: 'measurements',
  parameter: 'achievement_progress',  // ← вкладене значення в JSONB
  direction: 'asc',
  tieBreaker: {
    field: 'id',
    direction: 'asc'
  }
}
```

**SQL запит:**
```sql
ORDER BY measurements->>'achievement_progress', id
```

**WHERE для cursor (потрібен):**
```sql
WHERE measurements->>'achievement_progress' > '0'
   OR (measurements->>'achievement_progress' = '0' AND id > 'cursor-id')
```

**PostgREST/Supabase:**
```typescript
// Це НЕ ПРАЦЮЄ правильно для JSONB ❌
query.or('measurements->>achievement_progress.gt.0,and(measurements->>achievement_progress.eq.0,id.gt.uuid)')
```

### Чому це проблема?

1. **PostgREST обмеження** - складні `.or()` умови з JSONB `->>` оператором не працюють коректно
2. **Тип даних** - `->>` повертає TEXT, а не число, порівняння можуть працювати неправильно
3. **Індекси** - для JSONB полів важко створити ефективні індекси

**Результат:**
- Дублікати при скролі
- Пропущені записи
- Неправильний порядок

## Рішення: Denormalization (Окремі колонки)

### Створення окремих полів

**Міграція:**
```sql
-- Додаємо денормалізовані поля для сортування
ALTER TABLE breed
ADD COLUMN achievement_progress INTEGER,
ADD COLUMN rarity_score DECIMAL,
ADD COLUMN population_size INTEGER;

-- Створюємо індекси (ВАЖЛИВО!)
CREATE INDEX idx_breed_achievement_progress ON breed(achievement_progress, id);
CREATE INDEX idx_breed_rarity_score ON breed(rarity_score, id);
CREATE INDEX idx_breed_population_size ON breed(population_size, id);

-- Заповнюємо існуючі записи
UPDATE breed
SET achievement_progress = (measurements->>'achievement_progress')::INTEGER,
    rarity_score = (measurements->>'rarity_score')::DECIMAL,
    population_size = (measurements->>'population_size')::INTEGER;
```

### Синхронізація даних

**Варіант 1: Application Code (найпростіше)**

В Windmill workflow при апдейті measurements:
```typescript
await supabase
  .from('breed')
  .update({
    measurements: newMeasurements,  // оригінальний JSONB
    // Денормалізовані поля для швидкого сортування:
    achievement_progress: newMeasurements.achievement_progress,
    rarity_score: newMeasurements.rarity_score,
    population_size: newMeasurements.population_size
  })
  .eq('id', breedId);
```

**Варіант 2: GENERATED колонки (автоматично)**
```sql
ALTER TABLE breed
ADD COLUMN achievement_progress INTEGER
GENERATED ALWAYS AS ((measurements->>'achievement_progress')::INTEGER) STORED;
```
⚠️ Не можна оновлювати вручну, тільки через зміну `measurements`

**Варіант 3: Database Trigger (складніше)**
```sql
CREATE OR REPLACE FUNCTION sync_measurements_fields()
RETURNS TRIGGER AS $$
BEGIN
  NEW.achievement_progress := (NEW.measurements->>'achievement_progress')::INTEGER;
  NEW.rarity_score := (NEW.measurements->>'rarity_score')::DECIMAL;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_measurements
BEFORE INSERT OR UPDATE ON breed
FOR EACH ROW EXECUTE FUNCTION sync_measurements_fields();
```

### Використання в коді

**Після denormalization:**

```typescript
// Замість
{
  field: 'measurements',
  parameter: 'achievement_progress',  // ❌
  direction: 'asc',
  tieBreaker: { field: 'id', direction: 'asc' }
}

// Використовуємо
{
  field: 'achievement_progress',  // ✅ просте поле!
  direction: 'asc',
  tieBreaker: { field: 'id', direction: 'asc' }
}
```

**SQL стає простим:**
```sql
-- Замість
ORDER BY measurements->>'achievement_progress', id
WHERE measurements->>'achievement_progress' > '0'
   OR (measurements->>'achievement_progress' = '0' AND id > 'uuid')

-- Використовуємо
ORDER BY achievement_progress, id
WHERE achievement_progress > 0
   OR (achievement_progress = 0 AND id > 'uuid')
```

**PostgREST працює:**
```typescript
// ✅ Простий WHERE для звичайних полів працює ідеально
query.or('achievement_progress.gt.0,and(achievement_progress.eq.0,id.gt.uuid)')
```

## Переваги Denormalization

✅ **Простота** - звичайні SQL запити замість JSONB
✅ **Швидкість** - індекси працюють ефективно
✅ **Надійність** - cursor pagination працює правильно
✅ **Підтримка** - легше читати і дебажити SQL
✅ **Сумісність** - всі ORM/query builders підтримують

## Мінуси Denormalization

❌ **Дублювання даних** - те саме значення в `measurements` і в окремій колонці
❌ **Синхронізація** - потрібно підтримувати узгодженість
❌ **Міграція** - потрібна зміна схеми БД

**Але:** Це стандартна практика! PostgreSQL створений для такого використання.

## Best Practices

### 1. Визначте поля для сортування

Які поля з JSONB використовуються для сортування? Для них створіть окремі колонки.

### 2. Завжди використовуйте tie-breaker

```typescript
// ❌ БЕЗ tie-breaker - нестабільне сортування
{
  field: 'name',
  direction: 'asc'
}

// ✅ З tie-breaker - стабільне сортування
{
  field: 'name',
  direction: 'asc',
  tieBreaker: {
    field: 'id',
    direction: 'asc'
  }
}
```

### 3. Створюйте composite індекси

```sql
-- ❌ Окремі індекси - повільно
CREATE INDEX idx_progress ON breed(achievement_progress);
CREATE INDEX idx_id ON breed(id);

-- ✅ Composite індекс - швидко
CREATE INDEX idx_progress_id ON breed(achievement_progress, id);
```

### 4. Використовуйте NOT NULL де можливо

```sql
ALTER TABLE breed
ADD COLUMN achievement_progress INTEGER NOT NULL DEFAULT 0;
```

Це дозволяє БД краще оптимізувати запити.

### 5. Моніторте розмір даних

```sql
-- Перевірте розмір таблиці після denormalization
SELECT pg_size_pretty(pg_total_relation_size('breed'));
```

Денормалізація збільшує розмір, але це ОК для швидкості!

## Checklist для нових полів сортування

- [ ] Визначити які JSONB поля потрібні для сортування
- [ ] Створити міграцію з новими колонками
- [ ] Створити composite індекси (field + id)
- [ ] Заповнити існуючі записи
- [ ] Додати синхронізацію в код апдейту (Windmill workflow)
- [ ] Оновити конфіги сортування (прибрати `parameter`)
- [ ] Тестувати pagination з cursor
- [ ] Перевірити що немає дублікатів при скролі

## Коли НЕ потрібна denormalization

**Якщо:**
- ✅ Сортування тільки по простих полях (не JSONB)
- ✅ JSONB поле використовується тільки для фільтрації (не сортування)
- ✅ Рідкісні запити (не критична швидкість)

**Тоді:**
- Можна використовувати JSONB безпосередньо
- Cursor pagination може не працювати ідеально, але це прийнятно

## Приклад: До і Після

### До (з JSONB)

```typescript
// Конфіг
{
  field: 'measurements',
  parameter: 'achievement_progress',
  direction: 'asc',
  tieBreaker: { field: 'id', direction: 'asc' }
}

// SQL (повільний, не працює cursor pagination)
ORDER BY measurements->>'achievement_progress', id
WHERE measurements->>'achievement_progress' > '0'
   OR (measurements->>'achievement_progress' = '0' AND id > 'uuid')  // ❌ не працює
```

### Після (denormalized)

```sql
-- Міграція
ALTER TABLE breed ADD COLUMN achievement_progress INTEGER;
CREATE INDEX idx_breed_progress ON breed(achievement_progress, id);
UPDATE breed SET achievement_progress = (measurements->>'achievement_progress')::INTEGER;
```

```typescript
// Конфіг
{
  field: 'achievement_progress',  // просто!
  direction: 'asc',
  tieBreaker: { field: 'id', direction: 'asc' }
}

// SQL (швидкий, cursor pagination працює)
ORDER BY achievement_progress, id
WHERE achievement_progress > 0
   OR (achievement_progress = 0 AND id > 'uuid')  // ✅ працює!
```

```typescript
// Windmill workflow
await supabase.from('breed').update({
  measurements: newData,
  achievement_progress: newData.achievement_progress  // sync
});
```

## Висновок

**Для стабільного сортування з pagination:**
1. Завжди використовуйте tie-breaker (field + id)
2. Для JSONB полів створюйте окремі денормалізовані колонки
3. Створюйте composite індекси
4. Синхронізуйте дані при оновленні

**Це стандартний підхід у production додатках!** 🎯
