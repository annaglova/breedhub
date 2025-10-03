# Space Filters Components

Компоненти фільтрації та сортування для SpaceComponent, перенесені з Angular проекту.

## Структура компонентів

```
filters/
├── FiltersSection.tsx        # Головний компонент з chips і buttons
├── SortFilterSelector.tsx    # Button group (Sort + Filter buttons)
├── SortSelector.tsx          # Dropdown для вибору сортування
├── FiltersDialog.tsx         # Modal діалог з формою фільтрів
└── index.ts                  # Exports
```

## Використання

### Базове використання в SpaceComponent

```tsx
import { FiltersSection } from './filters';

function MySpace() {
  return (
    <SpaceComponent
      config={breedConfig}
      useEntitiesHook={useBreeds}
      filters={
        <FiltersSection
          filters={[
            { id: 'status', label: 'Active', isRequired: false },
            { id: 'country', label: 'USA', isRequired: false },
          ]}
          onFilterRemove={(filter) => {
            console.log('Remove filter:', filter.id);
          }}
        />
      }
    />
  );
}
```

### Прямий імпорт компонентів

```tsx
import {
  FiltersSection,
  SortFilterSelector,
  type FilterField,
  type SortOption
} from './filters';

// Тільки Sort/Filter кнопки без chips
<SortFilterSelector
  sortOptions={[
    { id: 'name', name: 'Name', icon: 'pi pi-sort-alpha-down' },
    { id: 'date', name: 'Date', icon: 'pi pi-calendar' },
  ]}
  selectedSort={{ id: 'name', name: 'Name' }}
  onSortChange={(option) => console.log(option)}
/>

// Повна секція з chips
<FiltersSection
  filters={activeFilters}
  onFilterRemove={handleRemove}
/>
```

## Відповідність Angular компонентам

| React Component | Angular Component | Файл |
|---|---|---|
| `FiltersSection` | `ExpandedFiltersV2Component` | `filters.component.ts` |
| `SortFilterSelector` | `SortFilterSelectorComponent` | `sort-column-selector.component.ts` |
| `SortSelector` | `SelectorComponent` | `selector.component.ts` |
| `FiltersDialog` | `FiltersSelectorComponent` | `filters-selector.component.ts` |

## Розташування в SpaceComponent

В Angular:
```html
<!-- After search and actions -->
<bp-filters [filterForm]="form" />
```

В React:
```tsx
{/* After search and Add button */}
{filters && <SpaceFilters>{filters}</SpaceFilters>}
```

## UI Компоненти

Використані shadcn/ui та custom компоненти:

- **Chip** - `packages/ui/components/chip.tsx` (custom, створений для цього проекту)
- **Button** - `packages/ui/components/button.tsx` (shadcn)
- **Dialog** - `packages/ui/components/dialog.tsx` (shadcn)
- **DropdownMenu** - `packages/ui/components/dropdown-menu.tsx` (shadcn)
- **Select** - `packages/ui/components/select.tsx` (shadcn)
- **Label** - `packages/ui/components/label.tsx` (shadcn)

## Стан реалізації

✅ **Візуальна структура** - повністю відповідає Angular проекту
⏳ **Функціонал** - буде додано окремо:
  - Filter form state management
  - Sort state management
  - Integration з filtering/sorting stores
  - Form validation
  - Dynamic filter fields

## Наступні кроки

1. Інтеграція з state management (Preact Signals)
2. Додавання filter/sort stores
3. Динамічні поля фільтрів
4. Form validation
5. Збереження фільтрів в URL params
