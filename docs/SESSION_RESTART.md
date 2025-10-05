# 🔄 SESSION RESTART - BREEDHUB PROJECT

## 📅 Останнє оновлення: 2025-10-05

## 🎯 ПОТОЧНИЙ СТАН

**Статус:** Dynamic Filters UI - В РОБОТІ 🚧

**Що працює:**
- Dynamic rows з view config (30 для breed/list, 60 для breed/grid, etc.)
- Manual pagination - scroll підгружає дані on-demand
- Checkpoint persistence - продовження після reload
- Batch UI updates - стрибки 30→60→90 без flickering
- Instant totalCount - миттєве відображення з localStorage cache
- Dynamic sorting - SortSelector з конфігу ✅

**Поточна задача:** Динамічні фільтри в FiltersDialog

**Поточна гілка:** `debug/ui-cascade-issue`

---

## 🎨 ПЛАН: Dynamic Filters Implementation

### Мета
Реалізувати динамічний рендеринг фільтрів в FiltersDialog на основі `filter_fields` з view конфігу.

### Структура filter_fields (з конфігу)
```json
{
  "filter_fields": {
    "breed_field_name": {
      "order": 1,
      "component": "TextInput",  // ⚠️ Явна назва компоненту (НЕ "text")
      "displayName": "Name",
      "placeholder": "Enter name",
      "fieldType": "string",
      "required": true,
      "operator": "eq",
      "value": null,
      "validation": { "maxLength": 250 }
    }
  }
}
```

### Етапи реалізації

#### 1. ✅ Аналіз поточного стану
- [x] Вивчено структуру `filter_fields` в конфігу
- [x] Перевірено наявні UI компоненти в `/packages/ui/components/form-inputs/`
- [x] Проаналізовано як працює `getSortOptions()` в SpaceStore

#### 2. 🚧 SpaceStore: метод getFilterFields()
**Файл:** `packages/rxdb-store/src/stores/space-store.signal-store.ts`

Додати метод аналогічно до `getSortOptions()`:
```typescript
getFilterFields(entityType: string, viewType: string): Array<{
  id: string;
  displayName: string;
  component: string;  // "TextInput", "DropdownInput", etc.
  placeholder?: string;
  fieldType: string;
  required?: boolean;
  operator?: string;
  value?: any;
  validation?: any;
  order: number;
}> {
  // 1. Знайти viewConfig по viewType
  // 2. Читати з viewConfig.data?.filter_fields || viewConfig.filter_fields
  // 3. Парсити поля, сортувати по order
  // 4. Повернути масив
}
```

**Важливо:**
- Читаємо з `viewConfig.data?.filter_fields || viewConfig.filter_fields`
- НЕ кидаємо запит до БД - тільки статика з appStore
- Сортуємо по `field.order`

#### 3. 🚧 FiltersDialog: динамічний рендеринг
**Файл:** `apps/app/src/components/space/filters/FiltersDialog.tsx`

**Props:**
```typescript
interface FiltersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filterFields?: FilterFieldConfig[];  // З getFilterFields()
  onApply?: (values: Record<string, any>) => void;
}
```

**Рендеринг:**
```tsx
import { TextInput, DropdownInput, TextareaInput } from '@ui/components/form-inputs';

const componentMap = {
  TextInput,
  DropdownInput,
  TextareaInput,
  DateInput,
  NumberInput,
  CheckboxInput,
  // ... інші
};

{filterFields?.map((field) => {
  const Component = componentMap[field.component];
  if (!Component) return null;

  return (
    <div key={field.id} className="mt-5 space-y-2">
      <Component
        label={field.displayName}
        placeholder={field.placeholder}
        required={field.required}
        // ... інші props
      />
    </div>
  );
})}
```

**Layout:**
- 2 колонки: `grid gap-3 sm:grid-cols-2`
- Сортування по `field.order`

#### 4. 🚧 Інтеграція з SpaceComponent
**Файли:**
- `apps/app/src/components/space/filters/SortFilterSelector.tsx`
- `apps/app/src/components/space/filters/FiltersSection.tsx`

**Ланцюжок передачі:**
```
SpaceComponent
  → FiltersSection (витягує filterFields через spaceStore.getFilterFields())
    → SortFilterSelector
      → FiltersDialog (отримує filterFields як prop)
```

#### 5. 🚧 Тестування
- [ ] Перевірити відображення 1 поля
- [ ] Перевірити відображення декількох полів у 2 колонки
- [ ] Перевірити сортування по `order`
- [ ] Перевірити різні типи компонентів (text, dropdown, date)

### Важливі нотатки

**Конфіг:**
- `component` в БД = точна назва компоненту (`TextInput`, НЕ `text`)
- Немає магічного мапінгу
- Всі компоненти з `/packages/ui/components/form-inputs/`

**SpaceStore:**
- НЕ запити до БД в runtime
- Тільки статичний конфіг з appStore
- Аналогічно до `getSortOptions()`

**UI:**
- 2 колонки автоматично через `sm:grid-cols-2`
- Label = `displayName` з конфігу
- Placeholder = `placeholder` з конфігу

---

## 🏗️ АРХІТЕКТУРА: Принцип роботи

### 🔥 Ключова ідея
**RxDB = Smart Cache (НЕ повна копія БД!)**

У нас таблиці з 9+ млн записів. Завантажуємо тільки те, що користувач бачить.

```
View Config (rows: 30)
  ↓
Initial Load: 30 записів
  ↓
RxDB Cache: ~200-500 записів max
  ↓
UI показує: 30, 60, 90... (scroll підгружає)
Total count: 452 (з Supabase metadata)
```

### Як працює Manual Pagination

1. **Initial Load (автоматично при відкритті сторінки)**
   - Завантажує `rows` записів з конфігу (напр. 30)
   - Зберігає в RxDB як smart cache
   - Показує totalCount з Supabase metadata

2. **Scroll Load (manual, on-demand)**
   - Користувач скролить до кінця списку
   - `handleLoadMore()` → `spaceStore.loadMore()` → `manualPull()`
   - Завантажує наступні `rows` записів (30)
   - Checkpoint зберігається в localStorage

3. **Checkpoint Persistence**
   - Checkpoint = `updated_at` останнього документа в RxDB
   - Зберігається в localStorage при кожному pull
   - При reload - продовжує з того місця, де зупинився

4. **Batch UI Updates**
   - INSERT events накопичуються в buffer
   - Flush коли досягнуто `expectedBatchSize` (30)
   - UI оновлюється одним батчем: 30→60→90

---

## 📂 ОСНОВНІ ФАЙЛИ

### Core Services
```
packages/rxdb-store/src/
├── services/entity-replication.service.ts  # Manual pull, checkpoint logic
├── stores/space-store.signal-store.ts      # getViewRows(), loadMore(), batch buffering
└── stores/base/entity-store.ts             # EntityStore з totalFromServer signal
```

### UI Components
```
apps/app/src/
├── components/space/
│   ├── SpaceComponent.tsx     # handleLoadMore, scroll integration
│   ├── SpaceView.tsx          # Scroll handler, infinite scroll
│   └── EntitiesCounter.tsx    # "Showing X of Y"
└── hooks/useEntities.ts       # Subscriptions на RxDB changes
```

---

## 🚀 ШВИДКИЙ СТАРТ

```bash
# Запустити dev server
npm run dev

# Перевірити конфіги в БД
node apps/config-admin/scripts/test/check-db.cjs

# DevTools: Application → IndexedDB → rxdb-dexie-breed → rxdocuments
# Refresh database view щоб побачити актуальні дані!
```

---

## 📚 ДЕТАЛЬНА ДОКУМЕНТАЦІЯ

### Реалізація
- `/docs/DYNAMIC_VIEW_ROWS_IMPLEMENTATION.md` - Повний план і статус реалізації
- `/docs/LOCAL_FIRST_ROADMAP.md` - Загальний roadmap проекту

### Архітектура
- `/docs/PROPERTY_BASED_CONFIG_ARCHITECTURE.md` - Конфігураційна система
- `/docs/SPACE_STORE_ARCHITECTURE.md` - SpaceStore архітектура
- `/docs/RXDB_INTEGRATION.md` - Інтеграція з RxDB

---

## 🔍 КРИТИЧНІ ПРИНЦИПИ

1. **View config = single source of truth**
   - Визначає UI rows
   - Визначає replication batchSize
   - Різні views = різні batch sizes

2. **RxDB = smart кеш, НЕ повна БД**
   - Зберігає ~200-500 записів
   - Завантажуємо on-demand
   - 9 млн на клієнті = катастрофа ❌

3. **Manual pagination > Continuous replication**
   - Initial load: rows записів
   - Scroll: +rows записів
   - Checkpoint для продовження

4. **Total count з Supabase metadata**
   - Кешується в localStorage
   - Миттєве відображення в UI
   - Оновлюється при кожному pull

5. **Batch UI updates**
   - INSERT events буферизуються
   - Flush по досягненню batch size
   - Без flickering в UI

---

## 💡 ВАЖЛИВІ НОТАТКИ

- DevTools IndexedDB viewer НЕ оновлюється автоматично - треба Refresh!
- Checkpoint використовує `updated_at` з RxDB, не localStorage (для точності)
- BulkUpsert швидше за individual upserts
- Batch buffer запобігає UI flickering при масових вставках
- TotalCount з localStorage = instant UI feedback (50-200ms)

---

## 🐛 TROUBLESHOOTING

**Проблема:** Scroll не підгружає дані
- Перевірити `hasMore` prop в SpaceView
- Перевірити `isLoadingMore` state
- Консоль: чи викликається `handleLoadMore`

**Проблема:** IndexedDB показує старі дані
- Клік правою → Refresh database в DevTools
- Або використай `await collection.count().exec()` в консолі

**Проблема:** Дублікати після reload
- Checkpoint queries RxDB для latest document
- Перевірити localStorage: `checkpoint_breed`

---

**READY FOR DEVELOPMENT! 🚀**
