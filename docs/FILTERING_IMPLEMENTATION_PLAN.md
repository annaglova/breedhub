# 🔍 Filtering Implementation Plan

## 📅 Дата створення: 2025-10-06
## 🔄 Останнє оновлення: 2025-10-21

---

## 🎯 ПОТОЧНИЙ СТАТУС

**Фаза:** Implementation - Scroll Pagination 🔨
**Прогрес:** Core filtering працює, додаємо offset-based scroll

### ✅ Що працює:
- `applyFilters()` - universal method для LookupInput + SpaceView
- RxDB local filtering з regex (FIXED)
- Supabase remote fetch з filters
- Field config resolution з prefix lookup (FIXED)
- Operator auto-detection (string → ilike, uuid → eq)
- Caching filtered results в RxDB

### 🔨 В процесі:
- **Scroll pagination** - offset-based як DictionaryStore
- **hasMore detection** - server count для accurate pagination
- **Config operator fix** - видалити "eq" для name field

### 📋 Наступні кроки:
1. Додати `skip(offset)` в filterLocalEntities
2. Додати `.range(offset, offset + limit - 1)` в fetchFilteredFromSupabase
3. Додати `getFilteredCount()` для hasMore
4. Тестувати scroll в LookupInput (collection mode)
5. Інтегрувати з SpaceView фільтрами

---

## 🏗️ ОНОВЛЕНА АРХІТЕКТУРА (2025-10-21)

### Ключові принципи

**1. Кешування - обов'язкове (як DictionaryStore)**
```
Filtered results → ЗАВЖДИ cache в RxDB → Offline-first
```

**Чому:**
- Тисячі records (breed: 450+, animal: тисячі+)
- Сталі фільтри - користувач шукає "golden" знову і знову
- Обмежений вибір - юзер цікавиться 10-20 породами, не всіма
- **Постійно кидати запити в БД - НІ!** ❌

**2. Offset-based scroll (як DictionaryStore)**
```
Initial: offset=0
Scroll: offset=30, 60, 90...
hasMore: offset + limit < serverTotal
```

**3. Універсальний механізм для ВСІХ випадків:**

**LookupInput (collection mode):**
```typescript
// Search з offset
applyFilters(breed, {name: 'golden'}, {limit: 30, offset: 0})
  → cache в RxDB
  → scroll: offset += 30
```

**SpaceView БЕЗ фільтрів:**
```typescript
// Той самий offset-based механізм!
applyFilters(breed, {}, {limit: 30, offset: 0})
  → cache в RxDB
  → scroll: offset += 30
```

**SpaceView З фільтрами:**
```typescript
// Той самий offset-based механізм!
applyFilters(breed, {name: 'golden'}, {offset: 30})
  → cache в RxDB
  → filter change → offset resets to 0 ✅
```

### ❌ Чому НЕ replication для UI scroll?

**Replication НЕ сумісна з фільтрами:**
```typescript
// Checkpoint corruption при зміні фільтрів
Initial: {name: 'golden'}, checkpoint = 2025-01-01
Change filter: {name: 'lab'}
Pull: .gt('updated_at', '2025-01-01').ilike('name', '%lab%')
Result: ПРОПУСТИТЬ всі Labs створені до 2025-01-01! ❌
```

**Replication залишається для:**
- ✅ Background sync (не UI scroll)
- ✅ Real-time updates (websockets)
- ✅ Offline sync (майбутнє)

**Детальніше:** `/docs/OFFSET_BASED_PAGINATION.md` 📖

**4. ORDER BY - різний для різних use cases:**

**❌ ПРОБЛЕМА:** Зараз хардкод `ORDER BY updated_at` - НЕ працює для пошуку!

**✅ ПРАВИЛЬНО:**

**LookupInput (пошук/вибір):**
```typescript
// ЗАВЖДИ алфавітний порядок!
applyFilters(breed, {name: 'golden'}, {
  orderBy: { field: 'name', direction: 'asc' }  // A-Z
})
```

**SpaceView (таблиця):**
```typescript
// ORDER BY з query params (динамічне сортування з UI)
const sortField = searchParams.get('sort') || 'name';
const sortDir = searchParams.get('dir') || 'asc';

applyFilters(breed, filters, {
  orderBy: { field: sortField, direction: sortDir }
})
```

**Dictionaries (DictionaryStore):**
```typescript
// ЗАВЖДИ алфавітний порядок (як LookupInput)
ORDER BY name ASC
```

**Чому це важливо:**
- 🔤 Користувач очікує A-Z при пошуку/виборі
- 📊 SpaceView потребує гнучкого сортування (колонки)
- ⚠️ Без ORDER BY - результати непередбачувані (random з БД)
- ⚠️ Різний ORDER BY в RxDB і Supabase = дублікати при scroll!

---

## 📐 applyFilters() - Detailed Logic

### Signature
```typescript
async applyFilters(
  entityType: string,
  filters: Record<string, any>,  // { name: 'golden', pet_type_id: 'uuid' }
  options?: {
    limit?: number;   // default: 30
    offset?: number;  // default: 0
    orderBy?: {       // CRITICAL: різний для різних use cases!
      field: string;      // 'name', 'created_at', etc
      direction: 'asc' | 'desc';
    };
    fieldConfigs?: Record<string, FilterFieldConfig>;
  }
): Promise<{
  records: any[];
  total: number;
  hasMore: boolean
}>
```

**Default orderBy:**
- LookupInput: `{ field: 'name', direction: 'asc' }` (завжди A-Z)
- SpaceView: з query params або `{ field: 'name', direction: 'asc' }` fallback
- Має бути **однаковий** в RxDB і Supabase queries!

### Flow
```typescript
1. Parse options (limit, offset, orderBy, fieldConfigs)
   - orderBy default: { field: 'name', direction: 'asc' }
   ↓
2. Try RxDB local cache FIRST
   - filterLocalEntities(entityType, filters, limit, offset, orderBy)
   - Uses .sort(orderBy.field).skip(offset).limit(limit)
   - ORDER BY має збігатися з Supabase!
   ↓
3. Check if need remote fetch
   - localResults.length < limit → not enough in cache
   - offset > 0 → scroll pagination
   ↓
4. Fetch from Supabase (if needed)
   - fetchFilteredFromSupabase(entityType, filters, limit, offset, orderBy)
   - Uses .order(orderBy.field, { ascending: orderBy.direction === 'asc' })
   - Uses .range(offset, offset + limit - 1)
   - CACHE results → collection.bulkUpsert(data)
   ↓
5. Get server total count
   - getFilteredCount(entityType, filters)
   - Supabase count query з filters
   ↓
6. Calculate hasMore
   - hasMore = offset + limit < serverTotal
   ↓
7. Return { records, total, hasMore }
```

### Operator Detection (Auto-smart)
```typescript
detectOperator(fieldType: string, configOperator?: string): string {
  // Use config if set
  if (configOperator) return configOperator;

  // Auto-detect by type
  switch (fieldType) {
    case 'string': return 'ilike';  // Case-insensitive search
    case 'uuid': return 'eq';       // Exact match
    case 'number': return 'eq';
    case 'date': return 'gte';
    default: return 'eq';
  }
}
```

### RxDB Query Building
```typescript
// ilike → regex
const regex = new RegExp(escapedValue, 'i');
query.where(fieldName).regex(regex);

// eq
query.where(fieldName).eq(value);

// Pagination
query.skip(offset).limit(limit);
```

### Supabase Query Building
```typescript
// ilike
query.ilike(fieldName, `%${value}%`);

// eq
query.eq(fieldName, value);

// Pagination
query.range(offset, offset + limit - 1);
```

---

## 🎯 Аналіз старого проекту (Angular)

### Ключові компоненти

**1. Filter Config (breed-space.ts)**
```typescript
filterConfig: [
  NAME_FILTER,              // Основний пошук
  {
    ...PET_TYPE_FILTER,     // Додатковий фільтр
    isRequired: true,
  },
]
```

**2. NAME_FILTER - Основний пошук**
```typescript
export const NAME_FILTER: FilterFieldConfig = {
  id: 'Name',
  placeholder: 'Search',
  component: FormFieldCode.SearchName,
  getFilter: (options) => simpleNameFilter(options.form, 'Name'),
  active: (form) => form?.get('Name')?.value,
  displayValue: (options) => options.form?.get('Name')?.value,
}
```

**3. URL Query Params Flow**

```
User Input → Form
    ↓
Apply Filters Button
    ↓
applyFilter() → Convert form to query params
    ↓
changePublicStoreFilters(queryParams)
    ↓
router.navigateByUrl(tree) → URL update
    ↓
Router Navigation Event
    ↓
setFilterParams rxMethod → Detect query change
    ↓
getFormValuesMap() → Parse query params back to form
    ↓
prepareForm() → filterReady.set(true)
    ↓
getFilters() → Build Supabase filter
    ↓
loadFirstPage(filter) → Fetch from DB
```

**4. changePublicStoreFilters - URL Update**
```typescript
changePublicStoreFilters(filters: Record<string, any>) {
  const url = store.url();
  const tree: UrlTree = router.parseUrl(url);
  tree.queryParams = { ...filters };  // ⚠️ Замінює ВСІ query params
  router.navigateByUrl(tree);
}
```

**5. applyFilter - Form to Query Params**
```typescript
applyFilter(): Record<string, any> {
  const entity = store.newEntityFromForm();
  const queryParams: Record<string, any> = {};

  filterWithValues().forEach((e: FilterFieldConfig) => {
    switch (e.component) {
      case FormFieldCode.AUTOCOMPLETE:
        queryParams[e.id] = lookupValue.Url || lookupValue.Id;
        break;
      case FormFieldCode.SearchName:
        queryParams[e.id] = entity[e.id];
        break;
      case FormFieldCode.DATE_RANGE:
        queryParams[e.id] = JSON.stringify(dateRangeValue);
        break;
      // ...
    }
  });

  return queryParams;
}
```

**6. getFormValuesMap - Query Params to Form**
```typescript
getFormValuesMap(queryParamMap: Params, queryFields: Record<string, FilterFieldConfig>): void {
  Object.values(queryFields).forEach((field: FilterFieldConfig) => {
    const value = queryParamMap[field.id];
    switch (field.component) {
      case FormFieldCode.AUTOCOMPLETE:
        if (isValidUUID(value)) {
          api.getById(field, value).subscribe(lookup => {
            store.setFormValue(field.id, lookup);
          });
        }
        break;
      case FormFieldCode.SearchName:
        store.setFormValue(field.id, value);
        break;
      // ...
    }
  });
}
```

---

## 🆕 План впровадження для нового проекту (React + RxDB)

### Архітектурні рішення

#### 1. **URL Query Params як Single Source of Truth**

```
URL Query Params
    ↓
Parse & Validate
    ↓
RxDB Query (local first)
    ↓
Missing data? → Supabase fetch
    ↓
Update RxDB cache
    ↓
UI displays results
```

**Приклад URL:**
```
/breeds/list?Name=golden&PetType=dog-uuid&sort=name_asc
/breeds/grid?Name=golden&PetType=dog-uuid&sort=name_asc
```

**Структура URL:**
```
/{space}/{view}?{filters}&sort={sortId}

Приклади:
/breeds/list?Name=golden&sort=name_asc
/animals/grid?Name=buddy&Status=active&sort=created_desc
/litters/list?StartDate=2024-01-01&sort=date_asc
```

#### 2. **View в URL - Shareable Links** ✨

**Проблема:** Юзер відкриває grid view, фільтрує, копіює посилання - має відкритися саме grid з тими самими фільтрами.

**Рішення:** View = частина URL path, не query param

```typescript
// ✅ Good - view в path
/breeds/list?Name=golden
/breeds/grid?Name=golden

// ❌ Bad - view в query params
/breeds?view=list&Name=golden
```

**Чому в path, а не в query:**
1. **Семантика:** View - це інший спосіб відображення тих самих даних
2. **SEO friendly:** `/breeds/grid` vs `/breeds?view=grid`
3. **Cleaner URLs:** Легше читати і розуміти
4. **Router matching:** React Router може матчити різні компоненти

**При зміні view - фільтри зберігаються:**
```typescript
function handleViewChange(newView: string) {
  const currentParams = new URLSearchParams(searchParams);
  // Keep all query params, only change path
  navigate(`/breeds/${newView}?${currentParams.toString()}`);
}
```

**Приклад flow:**
```
User на /breeds/list?Name=golden&sort=name_asc
  ↓
Switches to grid view
  ↓
Navigate to /breeds/grid?Name=golden&sort=name_asc
  ↓
Filters & sort persist ✅
```

#### 3. **Filters Logic - AND Only** 🔗

**Важливо:** Всі фільтри працюють через **AND (&)**, немає OR логіки.

```typescript
// Multiple filters = AND logic
/breeds?Name=golden&PetType=dog&Status=active

// Equivalent SQL:
WHERE Name LIKE '%golden%'
  AND PetType = 'dog'
  AND Status = 'active'

// RxDB Query:
collection
  .find()
  .where('Name').regex(/golden/i)
  .where('PetType').eq('dog')
  .where('Status').eq('active')

// Supabase Query:
supabase
  .from('breed')
  .select('*')
  .ilike('Name', '%golden%')
  .eq('PetType', 'dog')
  .eq('Status', 'active')
```

**Чому тільки AND:**
1. **Простота:** 95% випадків користувачі фільтрують саме так
2. **Performance:** AND швидше обробляється в БД
3. **UX:** Інтуїтивно зрозуміло для користувача
4. **Indexed queries:** Легше оптимізувати в Supabase

**Якщо потрібен OR:** Створюємо окремий фільтр типу "multi-select"
```typescript
// Multi-select = OR within field
/breeds?PetType=dog,cat,bird  // PetType IN ('dog', 'cat', 'bird')

// But different fields = still AND
/breeds?PetType=dog,cat&Status=active
// (PetType IN ('dog', 'cat')) AND Status = 'active'
```

#### 4. **RxDB + Supabase Filtering Strategy**

**Проблема:** У нас є 30 записів в RxDB, але фільтр може не знайти жодного.

**Рішення:**
1. **First attempt**: Фільтруємо RxDB локально
2. **If results < expected rows**: Fetch from Supabase з фільтром
3. **Cache results**: Зберігаємо в RxDB
4. **Mark as filtered**: Додаємо metadata що це filtered dataset

```typescript
async applyFilters(filters: FilterParams): Promise<void> {
  // 1. Try RxDB first
  const localResults = await this.filterLocal(filters);

  // 2. If not enough results, fetch from Supabase
  if (localResults.length < this.viewRows) {
    const remoteResults = await this.fetchFromSupabase(filters);
    await this.upsertToRxDB(remoteResults);
  }

  // 3. Mark current view as "filtered"
  this.isFilteredView.set(true);
  this.activeFilters.set(filters);
}
```

#### 5. **Main Filter (Search) - Динамічний пошук**

**Рішення:** Debounced search БЕЗ кнопки

```typescript
// Search input with debounce
const [searchTerm, setSearchTerm] = useState('');

useEffect(() => {
  const timer = setTimeout(() => {
    if (searchTerm) {
      updateURLParams({ Name: searchTerm });
    } else {
      removeURLParams(['Name']);
    }
  }, 500); // 500ms debounce

  return () => clearTimeout(timer);
}, [searchTerm]);
```

**Чому без кнопки:**
- Сучасний UX standard
- Миттєвий feedback
- RxDB дозволяє швидкий локальний пошук
- Debounce захищає від зайвих запитів

#### 6. **Additional Filters - Apply Button**

**Чому з кнопкою:**
- Множинні фільтри одночасно
- Запобігаємо зайвим запитам при заповненні форми
- Дозволяє скасувати без зміни URL

```typescript
function FiltersDialog() {
  const [formState, setFormState] = useState({});
  const queryParams = useSearchParams();

  // Initialize from URL
  useEffect(() => {
    const params = Object.fromEntries(queryParams);
    setFormState(params);
  }, []);

  const handleApply = () => {
    // Update URL with all filters at once
    updateURLParams(formState);
    onClose();
  };

  const handleCancel = () => {
    // Reset to URL state
    setFormState(Object.fromEntries(queryParams));
    onClose();
  };
}
```

#### 7. **Sorting через Query Params**

```typescript
// URL: /breeds/list?sort=name_asc

function handleSortChange(sortOption: SortOption) {
  updateURLParams({ sort: sortOption.id });
}

// In SpaceStore
useEffect(() => {
  const sortParam = queryParams.get('sort');
  if (sortParam) {
    const sortOption = sortOptions.find(o => o.id === sortParam);
    if (sortOption) {
      applySorting(sortOption);
    }
  }
}, [queryParams]);
```

---

## 🏗️ Implementation Architecture

### Phase 1: URL Management

**Файли:**
- `apps/app/src/hooks/useFilterParams.ts` - Hook для роботи з filter query params
- `apps/app/src/hooks/useSortParams.ts` - Hook для sort params
- `apps/app/src/utils/filterParamsCodec.ts` - Encode/decode filter values

**useFilterParams Hook:**
```typescript
export function useFilterParams() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo(() => {
    return parseFiltersFromURL(searchParams);
  }, [searchParams]);

  const updateFilters = useCallback((newFilters: FilterParams) => {
    const encoded = encodeFiltersToURL(newFilters);
    setSearchParams(encoded, { replace: true });
  }, [setSearchParams]);

  const clearFilters = useCallback(() => {
    const params = new URLSearchParams(searchParams);
    // Remove all filter params, keep others (sort, view, etc)
    filterKeys.forEach(key => params.delete(key));
    setSearchParams(params, { replace: true });
  }, [searchParams, setSearchParams]);

  return { filters, updateFilters, clearFilters };
}
```

**filterParamsCodec.ts:**
```typescript
export function encodeFilterValue(component: string, value: any): string {
  switch (component) {
    case 'TextInput':
    case 'TextareaInput':
      return encodeURIComponent(value);

    case 'DropdownInput':
    case 'LookupInput':
      // Store ID or Url
      return value.id || value.url || value;

    case 'DateInput':
      return value.toISOString();

    case 'CheckboxInput':
      return value ? '1' : '0';

    default:
      return String(value);
  }
}

export function decodeFilterValue(component: string, encoded: string): any {
  switch (component) {
    case 'TextInput':
    case 'TextareaInput':
      return decodeURIComponent(encoded);

    case 'DateInput':
      return new Date(encoded);

    case 'CheckboxInput':
      return encoded === '1';

    default:
      return encoded;
  }
}
```

### Phase 2: SpaceStore Filtering

**Файл:** `packages/rxdb-store/src/stores/space-store.signal-store.ts`

**Додати:**
```typescript
class SpaceStore {
  // Filter state
  private activeFilters = signal<FilterParams>({});
  private isFilteredView = signal<boolean>(false);

  /**
   * Apply filters - Local first, then remote
   */
  async applyFilters(
    entityType: string,
    filters: FilterParams
  ): Promise<void> {
    const config = this.getSpaceConfig(entityType);
    const store = this.getEntityStore(entityType);
    const expectedRows = config.views?.list?.rows || 30;

    // 1. Set active filters
    this.activeFilters.set(filters);
    this.isFilteredView.set(Object.keys(filters).length > 0);

    // 2. Try local filtering first
    const localResults = await this.filterLocalEntities(
      entityType,
      filters
    );

    console.log(`[SpaceStore] Local filter results: ${localResults.length}`);

    // 3. If not enough results, fetch from Supabase
    if (localResults.length < expectedRows) {
      console.log('[SpaceStore] Fetching additional results from Supabase');
      await this.fetchFilteredFromSupabase(
        entityType,
        filters,
        expectedRows
      );
    }
  }

  /**
   * Filter entities locally in RxDB
   */
  private async filterLocalEntities(
    entityType: string,
    filters: FilterParams
  ): Promise<any[]> {
    const collection = await this.getCollection(entityType);

    // Build RxDB query
    let query = collection.find();

    // Apply each filter
    for (const [fieldId, value] of Object.entries(filters)) {
      const fieldConfig = this.getFilterFieldConfig(entityType, fieldId);

      if (fieldConfig) {
        query = this.applyFilterToQuery(query, fieldConfig, value);
      }
    }

    const results = await query.exec();
    return results.map(doc => doc.toJSON());
  }

  /**
   * Apply single filter to RxDB query
   */
  private applyFilterToQuery(
    query: any,
    fieldConfig: FilterFieldConfig,
    value: any
  ): any {
    const { id, operator, fieldType } = fieldConfig;

    switch (operator) {
      case 'contains':
        return query.where(id).regex(new RegExp(value, 'i'));

      case 'eq':
        return query.where(id).eq(value);

      case 'gt':
        return query.where(id).gt(value);

      case 'lt':
        return query.where(id).lt(value);

      case 'in':
        return query.where(id).in(value);

      default:
        console.warn(`Unknown operator: ${operator}`);
        return query;
    }
  }

  /**
   * Fetch filtered results from Supabase
   */
  private async fetchFilteredFromSupabase(
    entityType: string,
    filters: FilterParams,
    limit: number
  ): Promise<void> {
    const collection = await this.getCollection(entityType);
    const replicationService = this.replicationService;

    // Build Supabase query
    let query = replicationService.getSupabaseQuery(entityType);

    // Apply filters
    for (const [fieldId, value] of Object.entries(filters)) {
      const fieldConfig = this.getFilterFieldConfig(entityType, fieldId);

      if (fieldConfig) {
        query = this.applySupabaseFilter(query, fieldConfig, value);
      }
    }

    // Fetch and upsert
    const { data, error } = await query.limit(limit);

    if (error) {
      console.error('[SpaceStore] Supabase filter query error:', error);
      return;
    }

    if (data && data.length > 0) {
      await collection.bulkUpsert(data);
      console.log(`[SpaceStore] Upserted ${data.length} filtered results`);
    }
  }

  /**
   * Clear filters and return to unfiltered view
   */
  async clearFilters(entityType: string): Promise<void> {
    this.activeFilters.set({});
    this.isFilteredView.set(false);

    // Reload initial data without filters
    await this.loadInitialData(entityType);
  }

  /**
   * Get filter field config
   */
  private getFilterFieldConfig(
    entityType: string,
    fieldId: string
  ): FilterFieldConfig | null {
    const filterFields = this.getFilterFields(entityType);
    return filterFields.find(f => f.id === fieldId) || null;
  }
}
```

### Phase 3: Search Component

**Файл:** `apps/app/src/components/space/filters/SearchBar.tsx`

```typescript
interface SearchBarProps {
  placeholder?: string;
  defaultValue?: string;
  onSearch?: (value: string) => void;
}

export function SearchBar({
  placeholder = "Search...",
  defaultValue = "",
  onSearch
}: SearchBarProps) {
  const [value, setValue] = useState(defaultValue);
  const [searchParams, setSearchParams] = useSearchParams();

  // Debounced URL update
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams);

      if (value) {
        params.set('Name', value);
      } else {
        params.delete('Name');
      }

      setSearchParams(params, { replace: true });
      onSearch?.(value);
    }, 500);

    return () => clearTimeout(timer);
  }, [value]);

  // Initialize from URL
  useEffect(() => {
    const nameParam = searchParams.get('Name');
    if (nameParam && nameParam !== value) {
      setValue(nameParam);
    }
  }, []);

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-4 py-2 border rounded-lg"
      />
      {value && (
        <button
          onClick={() => setValue('')}
          className="absolute right-3 top-1/2 -translate-y-1/2"
        >
          <X className="h-4 w-4 text-gray-400" />
        </button>
      )}
    </div>
  );
}
```

### Phase 4: FiltersDialog Integration

**Файл:** `apps/app/src/components/space/filters/FiltersDialog.tsx`

**Оновити:**
```typescript
export function FiltersDialog({
  open,
  onOpenChange,
  filterFields = [],
}: FiltersDialogProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [formState, setFormState] = useState<Record<string, any>>({});

  // Initialize from URL on mount
  useEffect(() => {
    if (open) {
      const params = Object.fromEntries(searchParams);
      const initialState: Record<string, any> = {};

      filterFields.forEach(field => {
        const urlValue = params[field.id];
        if (urlValue) {
          initialState[field.id] = decodeFilterValue(field.component, urlValue);
        }
      });

      setFormState(initialState);
    }
  }, [open, filterFields]);

  const handleApply = () => {
    // Encode form state to URL params
    const params = new URLSearchParams(searchParams);

    filterFields.forEach(field => {
      const value = formState[field.id];
      if (value !== undefined && value !== null && value !== '') {
        const encoded = encodeFilterValue(field.component, value);
        params.set(field.id, encoded);
      } else {
        params.delete(field.id);
      }
    });

    setSearchParams(params, { replace: true });
    onOpenChange(false);
  };

  const handleCancel = () => {
    // Reset form to URL state
    const params = Object.fromEntries(searchParams);
    setFormState(params);
    onOpenChange(false);
  };

  const handleClearAll = () => {
    setFormState({});
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Filters</DialogTitle>
        </DialogHeader>

        <form onSubmit={(e) => { e.preventDefault(); handleApply(); }}>
          <div className="grid gap-3 sm:grid-cols-2">
            {filterFields.map((field) => {
              const Component = componentMap[field.component];

              return (
                <Component
                  key={field.id}
                  label={field.displayName}
                  value={formState[field.id]}
                  onChange={(value: any) => {
                    setFormState(prev => ({ ...prev, [field.id]: value }));
                  }}
                  placeholder={field.placeholder}
                  required={field.required}
                />
              );
            })}
          </div>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={handleClearAll}>
              Clear All
            </Button>
            <Button variant="secondary" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="submit">
              Apply Filters
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

### Phase 5: SpaceComponent Integration

**Файл:** `apps/app/src/components/space/SpaceComponent.tsx`

```typescript
export function SpaceComponent({ config }: SpaceComponentProps) {
  const spaceStore = useSpaceStore();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // Get current view from URL path
  const currentView = useMemo(() => {
    // Extract view from path: /breeds/list → 'list'
    const parts = pathname.split('/');
    return parts[parts.length - 1];
  }, [pathname]);

  // Parse filters from URL
  const activeFilters = useMemo(() => {
    const params = Object.fromEntries(searchParams);
    const filters: Record<string, any> = {};

    filterFields.forEach(field => {
      const value = params[field.id];
      if (value) {
        filters[field.id] = decodeFilterValue(field.component, value);
      }
    });

    return filters;
  }, [searchParams, filterFields]);

  // Apply filters when URL changes
  useEffect(() => {
    if (Object.keys(activeFilters).length > 0) {
      spaceStore.applyFilters(config.entitySchemaName, activeFilters);
    } else {
      spaceStore.clearFilters(config.entitySchemaName);
    }
  }, [activeFilters, config.entitySchemaName]);

  // Handle view change - preserve filters
  const handleViewChange = useCallback((newView: string) => {
    const currentParams = searchParams.toString();
    const basePath = pathname.split('/').slice(0, -1).join('/');
    const newPath = `${basePath}/${newView}${currentParams ? `?${currentParams}` : ''}`;
    navigate(newPath);
  }, [navigate, pathname, searchParams]);

  // Get main filter for search bar
  const mainFilter = useMemo(() => {
    return spaceStore.getMainFilterField(config.entitySchemaName);
  }, [config.entitySchemaName]);

  return (
    <div className="h-full flex flex-col">
      {/* View tabs - persist filters when switching */}
      <ViewTabs
        views={config.views}
        currentView={currentView}
        onViewChange={handleViewChange}
      />

      {/* Search bar with main filter */}
      {mainFilter && (
        <SearchBar
          placeholder={mainFilter.placeholder}
          defaultValue={activeFilters[mainFilter.id]}
        />
      )}

      {/* Filter section */}
      <FiltersSection
        sortOptions={sortOptions}
        filterFields={filterFields}
        activeFilters={activeFilters}
      />

      {/* Entities list */}
      <SpaceView
        entities={entities}
        viewMode={currentView}
        onLoadMore={handleLoadMore}
        hasMore={hasMore}
      />
    </div>
  );
}
```

**ViewTabs Component:**
```typescript
interface ViewTabsProps {
  views: ViewConfig[];
  currentView: string;
  onViewChange: (view: string) => void;
}

export function ViewTabs({ views, currentView, onViewChange }: ViewTabsProps) {
  return (
    <div className="flex gap-2 mb-4">
      {views.map(view => (
        <button
          key={view.id}
          onClick={() => onViewChange(view.id)}
          className={cn(
            "px-4 py-2 rounded-lg",
            currentView === view.id
              ? "bg-primary text-white"
              : "bg-gray-100 hover:bg-gray-200"
          )}
        >
          {view.icon && <Icon name={view.icon} />}
          {view.label}
        </button>
      ))}
    </div>
  );
}
```

---

## 📋 Implementation Checklist

### Phase 0: View in URL ✅
- [ ] Update routes to include view in path: `/breeds/list`, `/breeds/grid`
- [ ] Create `ViewTabs` component
- [ ] Implement `handleViewChange` with filter persistence
- [ ] Test: Switch view → filters stay in URL
- [ ] Test: Copy URL → opens correct view + filters

### Phase 1: Foundation ✅
- [ ] Create `useFilterParams` hook
- [ ] Create `useSortParams` hook
- [ ] Create `filterParamsCodec.ts` utility
- [ ] Add filter state to SpaceStore
- [ ] Test URL sync (set params → read params)

### Phase 2: Search 🔄
- [ ] Create `SearchBar` component
- [ ] Implement debounced search
- [ ] URL integration (Name param)
- [ ] Test with breed search
- [ ] RxDB local search
- [ ] Test: Switch view → search persists

### Phase 3: Filters UI 🔄
- [ ] Update FiltersDialog with form state
- [ ] URL initialization on dialog open
- [ ] Apply button → URL update
- [ ] Cancel button → reset to URL state
- [ ] Clear all filters functionality
- [ ] Test: Switch view → filters persist

### Phase 4: SpaceStore Filtering 🔄
- [ ] `applyFilters()` method with AND logic
- [ ] `filterLocalEntities()` - RxDB query
- [ ] `fetchFilteredFromSupabase()` - remote fetch
- [ ] `clearFilters()` method
- [ ] Filter operators (contains, eq, gt, lt, in)
- [ ] Multi-select support (comma-separated OR within field)

### Phase 5: Integration Testing 🔄
- [ ] Search + Sort combination
- [ ] Search + Filters combination
- [ ] All filters + sort combination
- [ ] Clear filters → reload initial data
- [ ] Browser back/forward with filters
- [ ] Direct URL with filters
- [ ] Pagination with filters
- [ ] **View switching with filters** - critical test!
- [ ] Shareable URLs (copy/paste in new tab)

---

## 🎯 Critical Decisions

### 1. **View в URL Path (не Query Param)** ✅
**Чому:**
```typescript
// ✅ Good
/breeds/list?Name=golden
/breeds/grid?Name=golden

// ❌ Bad
/breeds?view=list&Name=golden
```
- **Семантика:** View - частина resource, не параметр
- **SEO:** Cleaner URLs для індексації
- **Shareable:** Копіювання посилання зберігає view + filters
- **Router:** Легше матчити різні компоненти
- **Фільтри персистять:** При зміні view всі query params зберігаються

### 2. **Filters = AND Logic Only** ✅
**Чому:**
```typescript
// All filters combined with AND
/breeds?Name=golden&PetType=dog&Status=active
// WHERE Name LIKE '%golden%' AND PetType='dog' AND Status='active'
```
- **Простота:** 95% випадків юзери фільтрують саме так
- **Performance:** AND швидше в БД, легше індексувати
- **UX:** Інтуїтивно зрозуміло
- **Multi-select як OR:** Якщо треба OR - робимо comma-separated значення в одному фільтрі

### 3. **Search: Debounced WITHOUT button** ✅
**Чому:**
- Сучасний UX
- RxDB дозволяє швидкий локальний пошук
- Debounce 500ms захищає від спаму

### 4. **Filters: WITH Apply button** ✅
**Чому:**
- Множинні фільтри одночасно
- Запобігає зайвим запитам
- Дозволяє Cancel без side effects

### 5. **RxDB First, Supabase Second** ✅
**Чому:**
- Instant feedback для локальних даних
- Мінімізує API calls
- Smart cache = швидкий UX

### 6. **URL Query Params = Source of Truth** ✅
**Чому:**
- Shareable links
- Browser history works
- Bookmarkable filtered views
- SSR friendly (майбутнє)

### 7. **Replace history, not push** ✅
```typescript
setSearchParams(params, { replace: true });
```
**Чому:**
- Кожна літера в search НЕ створює history entry
- Проте Apply Filters - можна push
- Баланс між UX та history

---

## 💡 Tips & Best Practices

### URL Encoding
```typescript
// ✅ Good
const encoded = encodeURIComponent('golden retriever');
// Result: golden%20retriever

// ❌ Bad
const raw = 'golden retriever';
// Breaks URL parsing
```

### Debounce Pattern
```typescript
// ✅ Good - cleanup timer
useEffect(() => {
  const timer = setTimeout(() => { /* ... */ }, 500);
  return () => clearTimeout(timer);
}, [value]);

// ❌ Bad - memory leak
useEffect(() => {
  setTimeout(() => { /* ... */ }, 500);
}, [value]);
```

### Filter Active State
```typescript
// ✅ Good - computed from URL
const hasActiveFilters = useMemo(() => {
  return Object.keys(activeFilters).length > 0;
}, [activeFilters]);

// ❌ Bad - separate state can desync
const [hasFilters, setHasFilters] = useState(false);
```

---

## 🐛 Potential Issues

### Issue 1: Empty Results After Filter
**Problem:** Фільтр не знайшов записів ні в RxDB, ні в Supabase

**Solution:**
```typescript
if (localResults.length === 0 && remoteResults.length === 0) {
  // Show "No results" message
  // Offer to clear filters
}
```

### Issue 2: Slow Supabase Query
**Problem:** Складний фільтр + велика таблиця = повільний запит

**Solution:**
- Використати Supabase indexes
- Limit результатів
- Show loading state
- Можливо cached results в localStorage

### Issue 3: Browser Back with Filters
**Problem:** Юзер натискає Back, фільтри мають відновитися

**Solution:** URL params автоматично обробляє це! useEffect з searchParams dependency.

---

## 🚀 Next Steps

1. **Спочатку Search** - найпростіша функція, швидкий win
2. **Потім Sort** - вже готова UI, тільки URL params
3. **Filters** - найскладніше, але фундамент готовий
4. **Testing** - всі комбінації
5. **Optimization** - якщо буде потрібно

**Ready to implement! 🎉**
