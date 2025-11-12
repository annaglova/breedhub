# Dynamic Public Page Implementation TODO

**Мета:** Зробити PublicPageTemplate динамічним - рендерити blocks з конфігу

**Дата створення:** 2025-01-11

---

## Page Config Structure

```javascript
{
  "component": "PublicPageTemplate",
  "pageType": "view",  // "view" | "edit" | "create"
  "isDefault": true,   // Default page для space
  "menus": {
    "config_menu_config_1762429072769": {
      "items": {
        "config_menu_item_1762429475220": {}
      }
    }
  },
  "blocks": {
    "config_block_1762788988594": {
      "component": "BreedCoverV1",
      "type": "cover",
      "order": 1
    }
  }
}
```

---

## Implementation Steps

### ✅ Phase 1: Type Definitions
**Файл:** `apps/app/src/types/page-config.types.ts`

- [ ] Створити `PageConfig` interface
- [ ] Створити `BlockConfig` interface
- [ ] Створити `PageType` type: 'view' | 'edit' | 'create'
- [ ] Експортувати типи

**TypeScript Types:**
```typescript
export type PageType = 'view' | 'edit' | 'create';

export interface BlockConfig {
  component: string;
  type?: string;
  order?: number;
  [key: string]: any;
}

export interface PageConfig {
  component: 'PublicPageTemplate';
  pageType?: PageType;
  isDefault?: boolean;
  menus?: Record<string, any>;
  blocks: Record<string, BlockConfig>;
}
```

---

### ✅ Phase 2: Component Registry
**Файл:** `apps/app/src/components/blocks/ComponentRegistry.ts`

- [ ] Створити мапу компонентів `BLOCK_COMPONENTS`
- [ ] Додати `BreedCoverV1` в мапу
- [ ] Створити `getBlockComponent(name: string)` функцію
- [ ] Додати TypeScript типи
- [ ] Додати dev mode warning для unknown components

**Implementation:**
```typescript
import { BreedCoverV1 } from '../breed/covers/BreedCoverV1';

const BLOCK_COMPONENTS: Record<string, React.ComponentType<any>> = {
  'BreedCoverV1': BreedCoverV1,
  // Add more block components here
};

export function getBlockComponent(name: string) {
  const component = BLOCK_COMPONENTS[name];

  if (!component && process.env.NODE_ENV === 'development') {
    console.error(`[ComponentRegistry] Unknown component: ${name}`);
  }

  return component;
}
```

---

### ✅ Phase 3: Block Renderer
**Файл:** `apps/app/src/components/blocks/BlockRenderer.tsx`

- [ ] Створити `BlockRenderer` компонент
- [ ] Приймати `blockConfig` та `entity` як props
- [ ] Використовувати `getBlockComponent()` для отримання компонента
- [ ] Рендерити компонент з entity
- [ ] Додати fallback UI для unknown components
- [ ] Додати error boundary

**Props:**
```typescript
interface BlockRendererProps {
  blockConfig: BlockConfig;
  entity: any;
  className?: string;
}
```

**Logic:**
```typescript
const BlockComponent = getBlockComponent(blockConfig.component);

if (!BlockComponent) {
  return <div>Block component not found: {blockConfig.component}</div>;
}

return <BlockComponent entity={entity} {...blockConfig} />;
```

---

### ✅ Phase 4: Page Selection Utility
**Файл:** `apps/app/src/utils/getPageConfig.ts`

- [ ] Створити `getPageConfig()` функцію
- [ ] Логіка: спочатку pageType, потім isDefault, потім перший
- [ ] Додати TypeScript типи
- [ ] Додати validation
- [ ] Додати dev mode warnings

**Function Signature:**
```typescript
export function getPageConfig(
  spaceConfig: any,
  options: { pageType?: PageType }
): PageConfig | null
```

**Logic:**
```typescript
const pages = spaceConfig?.pages || {};
const pageEntries = Object.entries(pages);

// 1. Якщо є pageType - шукаємо page з таким типом
if (options.pageType) {
  const page = pageEntries.find(([, p]) => p.pageType === options.pageType);
  if (page) return page[1];
}

// 2. Fallback - шукаємо default page
const defaultPage = pageEntries.find(([, p]) => p.isDefault === true);
if (defaultPage) return defaultPage[1];

// 3. Крайній fallback - перший page
return pageEntries[0]?.[1] || null;
```

---

### ✅ Phase 5: Update Page Config in DB
**Task:** Оновити конфіг page в Supabase

- [ ] Додати `pageType: "view"` в page config
- [ ] Додати `isDefault: true` в page config
- [ ] Додати `order: 1` в block config
- [ ] Запустити rebuild hierarchy

**SQL або через UI:**
```sql
UPDATE app_config
SET data = jsonb_set(
  jsonb_set(data, '{pageType}', '"view"'),
  '{isDefault}', 'true'
)
WHERE id = 'config_page_1757849573807';
```

---

### ✅ Phase 6: Refactor PublicPageTemplate
**Файл:** `apps/app/src/components/template/PublicPageTemplate.tsx`

**Changes:**

#### 6.1. Update Props
```typescript
interface PublicPageTemplateProps {
  className?: string;
  isDrawerMode?: boolean;
  pageType?: PageType;  // NEW: для вибору page
}
```

#### 6.2. Get PageConfig
```typescript
const spaceConfig = spaceStore.spaceConfig.value;
const pageConfig = getPageConfig(spaceConfig, { pageType });

if (!pageConfig) {
  return <div>Page configuration not found</div>;
}
```

#### 6.3. Get Selected Entity
```typescript
const selectedEntity = spaceStore.selectedEntity.value;

if (!selectedEntity) {
  return <div>No entity selected</div>;
}
```

#### 6.4. Render Blocks Dynamically
**Замінити lines 418-462 (hardcoded cover):**

```typescript
// Sort blocks by order
const sortedBlocks = Object.entries(pageConfig.blocks)
  .sort(([, a], [, b]) => (a.order || 0) - (b.order || 0));

// Render blocks
{sortedBlocks.map(([blockId, blockConfig]) => (
  <BlockRenderer
    key={blockId}
    blockConfig={blockConfig}
    entity={selectedEntity}
  />
))}
```

**Конкретні зміни:**
- [ ] Додати import для `getPageConfig`, `BlockRenderer`, `PageType`
- [ ] Додати `pageType` prop
- [ ] Отримувати `pageConfig` через `getPageConfig()`
- [ ] Отримувати `selectedEntity` з `spaceStore`
- [ ] Замінити hardcoded `<CoverComponent>` на динамічний рендеринг blocks
- [ ] Видалити mock data (mockCover, mockBreed) після тестування
- [ ] Додати error handling для missing config/entity

---

### ✅ Phase 7: Connect to SpaceView/Drawer
**Файл:** Де рендериться PublicPageTemplate (потрібно знайти)

- [ ] Знайти де викликається `<PublicPageTemplate>`
- [ ] Додати `pageType="view"` prop
- [ ] Перевірити що spaceStore ініціалізований
- [ ] Перевірити що selectedEntity встановлений

**Code:**
```typescript
<PublicPageTemplate
  isDrawerMode={true}
  pageType="view"  // NEW
/>
```

---

### ✅ Phase 8: Validation & Error Handling

#### 8.1. Runtime Validation
**Файл:** `apps/app/src/utils/validatePageConfig.ts`

```typescript
export function validatePageConfig(pageConfig: any): pageConfig is PageConfig {
  if (!pageConfig) {
    console.error('[PageConfig] Missing page config');
    return false;
  }

  if (!pageConfig.blocks || typeof pageConfig.blocks !== 'object') {
    console.error('[PageConfig] Invalid blocks');
    return false;
  }

  return true;
}
```

#### 8.2. Development Warnings
- [ ] Warning якщо немає selectedEntity
- [ ] Error якщо component не знайдено в Registry
- [ ] Warning якщо pageConfig невалідний
- [ ] Warning якщо blocks пустий

#### 8.3. Error Boundaries
- [ ] Додати Error Boundary навколо BlockRenderer
- [ ] Показувати fallback UI при помилках

---

### ✅ Phase 9: Testing

#### 9.1. Manual Testing
- [ ] Відкрити SpaceView
- [ ] Обрати breed в списку
- [ ] Перевірити що drawer відкривається
- [ ] Перевірити що BreedCoverV1 рендериться
- [ ] Перевірити що entity дані відображаються правильно
- [ ] Перевірити що cover image показується
- [ ] Перевірити responsive (drawer vs fullscreen)

#### 9.2. Edge Cases Testing
- [ ] Немає selectedEntity
- [ ] Немає pageConfig
- [ ] Невідомий component в blocks
- [ ] Пустий blocks object
- [ ] Некоректний pageType
- [ ] Відсутній isDefault

#### 9.3. Multiple Blocks Testing (майбутнє)
- [ ] Додати другий block в конфіг
- [ ] Перевірити order сортування
- [ ] Перевірити що обидва blocks рендеряться

---

## Current Status

**Started:** 2025-01-11
**Status:** 🚧 Planning Complete - Ready to Implement

---

## Notes

- Поки що залишаємо hardcoded: cover image, tabs, menus, achievements
- Blocks рендеримо динамічно з конфігу
- Entity дані беремо з spaceStore.selectedEntity
- PageType визначає який page показувати (view/edit/create)

---

## Next Steps After This

1. Динамічні tabs з конфігу
2. Динамічні menus з конфігу
3. Cover image з бакетів
4. Більше типів blocks (не тільки covers)
5. Extensions в blocks
