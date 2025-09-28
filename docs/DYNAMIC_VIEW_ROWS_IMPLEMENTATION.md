# Dynamic View Rows Implementation

## Огляд проблеми

У проекті BreedHub виникла необхідність динамічного завантаження різної кількості записів (rows) в залежності від обраного типу відображення (view). Кожен view має свою оптимальну кількість записів для завантаження.

## Вирішені попередні проблеми

### 1. Динамічна конфігурація UI компонентів
- **Проблема**: ViewChanger показував 2 кнопки (list і grid) замість однієї (list) відповідно до конфігурації в БД
- **Рішення**:
  - Виправлено `rebuild-hierarchy.cjs` для включення properties в space self_data
  - Виправлено `rebuildParentSelfData` в ConfigStore для правильної обробки properties типу 'property'

### 2. Структура конфігурації
- **Проблема**: Невірна структура конфігів - views не були на правильному рівні ієрархії
- **Рішення**: Регенерація конфігів з правильною структурою через скрипти

## ПОЕТАПНА РЕАЛІЗАЦІЯ

### Фаза 0: Базове завантаження даних з Supabase (ПЕРШОЧЕРГОВО!)

**Проблема**: RxDB колекція створюється, але дані з Supabase не завантажуються.

#### Крок 1: Реалізація простого завантаження всіх записів

**Файли для зміни:**
- `/packages/rxdb-store/src/stores/space-store.signal-store.ts`

**Що робити:**
1. При створенні EntityStore одразу завантажити дані з Supabase
2. Використати патерн з books-replication.service.ts як приклад
3. Створити метод `loadInitialData(entityType)` в SpaceStore

```typescript
async loadInitialData(entityType: string, limit = 100) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(entityType)
    .select('*')
    .limit(limit);

  if (data) {
    // Записати в RxDB колекцію
    await this.db[entityType].bulkInsert(data);
  }
}
```

#### Крок 2: Підключення до useBreeds hook

**Що змінити:**
- Замість mock даних використовувати RxDB колекцію
- Підписатися на зміни через RxDB $.subscribe()

### Фаза 1: Lazy Loading з пагінацією

**Після того як базове завантаження працює!**

#### Крок 1: Реалізація пагінації в SpaceStore

```typescript
async loadPage(entityType: string, page: number, rowsPerPage: number) {
  const from = page * rowsPerPage;
  const to = from + rowsPerPage - 1;

  const { data, error } = await supabase
    .from(entityType)
    .select('*', { count: 'exact' })
    .range(from, to);

  return { data, total: count };
}
```

#### Крок 2: Інтеграція з VirtualSpaceView

- Використати існуючий infinite scroll
- При досягненні кінця списку завантажувати наступну сторінку

### Фаза 2: Dynamic Rows (ТІЛЬКИ ПІСЛЯ ФАЗИ 0 і 1!)

## Поточна задача: Dynamic Rows Loading

### Вхідні дані

1. **View конфігурації** мають параметр `rows`:
   ```json
   {
     "rows": 60,
     "viewType": "list"
   }
   ```

2. **SpaceComponent** наразі використовує захардкоджене значення:
   ```typescript
   const { data, isLoading, error, isFetching } = useEntitiesHook({
     rows: 50,  // <-- захардкоджено
     from: page * 50,
   });
   ```

3. **Архітектура**:
   - SpaceStore керує конфігураціями space
   - ViewChanger перемикає між типами view
   - VirtualSpaceView відмальовує дані з віртуалізацією

### План реалізації

#### Фаза 1: SpaceStore - розширення функціоналу

**Нові методи:**
```typescript
// Отримати конфіг активного view
getActiveViewConfig(entitySchemaName: string, viewType: string): ViewConfig | null

// Отримати кількість rows для view
getRowsForView(entitySchemaName: string, viewType: string): number

// Signal для активного view конфігу
getActiveViewSignal(entitySchemaName: string, viewType: string): Signal<ViewConfig>
```

**Структура ViewConfig:**
```typescript
interface ViewConfig {
  id: string;
  viewType: string;
  rows: number;
  itemHeight?: number;
  columns?: number; // для grid view
}
```

#### Фаза 2: SpaceComponent - динамічне завантаження

**Зміни:**
1. Отримувати `rows` з активного view конфігу
2. При зміні view через `ViewChanger`:
   - Скидати `page` на 0
   - Перезавантажувати дані з новим `rows`
3. Оновити `useEntitiesHook` виклик:
   ```typescript
   const activeViewConfig = spaceStore.getActiveViewConfig(
     config.entitySchemaName,
     viewMode
   );
   const rowsPerPage = activeViewConfig?.rows || 50; // fallback

   const { data, isLoading, error, isFetching } = useEntitiesHook({
     rows: rowsPerPage,
     from: page * rowsPerPage,
   });
   ```

#### Фаза 3: RxDB інтеграція

**Завдання:**
- Перевірити підтримку динамічної зміни `limit` в RxDB queries
- Реалізувати новий query при зміні view (якщо потрібно)
- Забезпечити правильне кешування для різних views

#### Фаза 4: VirtualSpaceView оптимізація

**Покращення:**
- Динамічні `itemHeight` для різних views
- Різні `overscan` значення для кожного типу view
- Розширення `componentMap` для нових типів view (table, map, graph)

#### Фаза 5: Тестування

**Сценарії:**
1. Перемикання між views з різними `rows` значеннями
2. Pagination/infinite scroll для кожного view
3. Збереження scroll позиції при поверненні до view
4. Коректна робота з пустими даними
5. Performance при великих обсягах даних

### Технічні деталі

#### SpaceStore зміни
- Файл: `/packages/rxdb-store/src/stores/space-store.signal-store.ts`
- Додати методи для роботи з view конфігами
- Створити reactive signals для активних views

#### SpaceComponent зміни
- Файл: `/apps/app/src/components/space/SpaceComponent.tsx`
- Інтегрувати динамічні rows
- Додати effect для реагування на зміну view

#### Hook зміни
- Перевірити чи `useEntitiesHook` підтримує динамічну зміну параметрів
- Можливо потрібно буде оновити hook для правильного re-fetch

### Очікуваний результат

1. При перемиканні на "list" view - завантажується 60 записів
2. При перемиканні на "grid" view - може завантажуватись інша кількість
3. Pagination працює коректно для кожного view
4. Performance оптимальна для кожного типу відображення

### Потенційні проблеми

1. **Кешування**: RxDB може кешувати результати, треба правильно інвалідувати
2. **Performance**: Великі значення rows можуть сповільнити initial load
3. **Memory**: Треба стежити за memory usage при великих rows
4. **UX**: При перемиканні views може бути помітна затримка

### Метрики успіху

- [ ] Views завантажують правильну кількість записів з конфігу
- [ ] Перемикання між views працює плавно
- [ ] Pagination адаптується до rows кожного view
- [ ] Performance залишається оптимальною
- [ ] Немає memory leaks при частому перемиканні views