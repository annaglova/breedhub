# Public Page Architecture

**Reference Document** - архітектурні рішення для config-driven public pages

---

## Overview

Config-driven система для Public Pages з підтримкою:
1. **Universal Page Template** - замість хардкоду окремих компонентів
2. **Tabs System** - динамічне рендерування табів з конфігу
3. **Three view modes** - Drawer, Page Fullscreen, Tab Fullscreen

**Angular Reference:** `/Users/annaglova/projects/org` - 99% UI вже зроблено

---

## Config Structure

### Existing Structure (вже є в системі!)

```
workspaces → spaces → pages → tabs → fields
```

```typescript
{
  "workspaces": {
    "config_workspace_XXX": {
      "id": "home",
      "spaces": {
        "config_space_XXX": {
          "id": "breeds",
          "entitySchemaName": "breed",
          "pages": {
            "config_page_XXX": {
              "tabs": { ... },    // Tab configurations
              "fields": { ... }   // Field definitions
            }
          },
          "views": { ... }  // List views (не чіпаємо)
        }
      }
    }
  }
}
```

### Tab Config Structure

```typescript
interface TabConfig {
  id: string;              // 'overview', 'divisions'
  label: string;           // 'Overview', 'Divisions'
  icon: string;            // 'file-text', 'layers'
  fragment: string;        // URL hash
  component: string;       // Component name
  order: number;           // Tab order
  layout?: 'grid' | 'list' | 'custom';

  // Tab-specific fields
  fields?: Record<string, any>;

  // Child table reference
  childTable?: string;       // 'breed_division'

  // Dynamic records limit
  recordsLimit?: number;     // 5-100
}
```

### Example: Breed Page Config

```json
{
  "tabs": {
    "config_tab_overview": {
      "id": "overview",
      "label": "Overview",
      "icon": "file-text",
      "fragment": "overview",
      "component": "OverviewTab",
      "order": 0,
      "fields": {
        "breed_field_name": {},
        "breed_field_description": {}
      }
    },
    "config_tab_divisions": {
      "id": "divisions",
      "label": "Divisions",
      "icon": "layers",
      "fragment": "divisions",
      "component": "ChildTableTab",
      "order": 1,
      "childTable": "breed_division",
      "recordsLimit": 20,
      "layout": "list"
    }
  }
}
```

---

## View Modes

### Mode 1: Page Drawer

- Location: `/breeds/:id#overview`
- Limited data (recordsLimit)
- "View All →" button для переходу в Tab Fullscreen
- Scroll в межах drawer

### Mode 2: Page Fullscreen

- Location: `/:id#overview`
- Limited data (recordsLimit)
- "View All →" button
- Full page scroll

### Mode 3: Tab Fullscreen

- Location: `/:id#divisions?mode=tab-fullscreen`
- ALL data (без recordsLimit)
- Tab navigation доступна
- Scroll + pagination для 1000+ records
- Filtering (optional)

---

## Component Architecture

### Universal Page Template

```typescript
interface UniversalPageTemplateProps {
  spaceSlug: string;  // 'breeds'
  entityId: string;   // UUID
  mode: 'drawer' | 'fullscreen' | 'tab-fullscreen';
}

export function UniversalPageTemplate({ spaceSlug, entityId, mode }) {
  // 1. Load page config
  const { pageConfig, space } = usePageConfig(spaceSlug);

  // 2. Load entity data
  const entityType = space?.entitySchemaName;
  const entity = spaceStore.getEntityById(entityType, entityId);

  // 3. Active tab state
  const [activeTab, setActiveTab] = useActiveTab(pageConfig?.tabs);

  return (
    <div>
      <TabsNav tabs={pageConfig.tabs} activeTab={activeTab} />
      <TabContentRenderer tabConfig={pageConfig.tabs[activeTab]} entity={entity} />
    </div>
  );
}
```

### Component Registry

```typescript
class ComponentRegistry {
  private static components = new Map<string, ComponentType>();

  static register(name: string, component: ComponentType) {
    this.components.set(name, component);
  }

  static get(name: string): ComponentType | undefined {
    return this.components.get(name);
  }

  static has(name: string): boolean {
    return this.components.has(name);
  }
}

// Register components
ComponentRegistry.register('OverviewTab', OverviewTab);
ComponentRegistry.register('ChildTableTab', ChildTableTab);
ComponentRegistry.register('StatsTab', StatsTab);
```

### Tab Content Renderer

```typescript
function TabContentRenderer({ tabConfig, entity, mode }) {
  const Component = ComponentRegistry.get(tabConfig.component);

  if (!Component) {
    // Dev mode - show error
    // Production - return null + log error
    return null;
  }

  return (
    <ErrorBoundary>
      <Component config={tabConfig} entity={entity} mode={mode} />
    </ErrorBoundary>
  );
}
```

---

## Generic Tab Components

### 1. OverviewTab

For displaying main entity fields:

```typescript
function OverviewTab({ config, entity }) {
  const fields = Object.values(config.fields || {});

  return (
    <div>
      {fields
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(field => (
          <FieldRenderer
            key={field.id}
            field={field}
            value={entity[field.name]}
          />
        ))}
    </div>
  );
}
```

### 2. ChildTableTab

For displaying child table records:

```typescript
function ChildTableTab({ config, entity, mode }) {
  const { records, isLoading } = useChildRecords(
    entity.id,
    config.childTable,
    { limit: config.recordsLimit || 10 }
  );

  return (
    <div>
      {config.layout === 'list' ? (
        <ChildRecordsList records={records} />
      ) : (
        <ChildRecordsGrid records={records} />
      )}

      {mode === 'drawer' && records.length >= config.recordsLimit && (
        <Button onClick={handleViewAll}>View All →</Button>
      )}
    </div>
  );
}
```

### 3. StatsTab

For statistics display:

```typescript
function StatsTab({ config, entity }) {
  const fields = Object.values(config.fields || {});

  return (
    <div>
      {fields.map(field => (
        <StatCard
          key={field.id}
          label={field.displayName}
          value={entity[field.name]}
        />
      ))}
    </div>
  );
}
```

---

## Routing Strategy

### URL Structure

```
/breeds/:id#overview          // Drawer mode
/:id#overview                 // Page fullscreen
/:id#divisions?mode=tab-fullscreen  // Tab fullscreen
```

### Router Configuration

```typescript
<Routes>
  {/* List view with drawer */}
  <Route path="/breeds" element={<BreedsListView />}>
    <Route path=":id" element={<DrawerOutlet />} />
  </Route>

  {/* Fullscreen public page */}
  <Route path="/:id" element={<PublicPageView />} />
</Routes>
```

---

## Config Reading

### usePageConfig Hook

```typescript
export function usePageConfig(spaceSlug: string) {
  const { workspaces } = useAppWorkspaces();

  const space = useMemo(() => {
    for (const workspace of workspaces) {
      const found = Object.values(workspace.spaces || {})
        .find(s => s.id === spaceSlug);
      if (found) return found;
    }
    return null;
  }, [workspaces, spaceSlug]);

  const pageConfig = useMemo(() => {
    if (!space?.pages) return null;
    return Object.values(space.pages)[0];
  }, [space]);

  return { space, pageConfig, loading: !pageConfig };
}
```

---

## Config Validation

### Development Time Validation

```typescript
function validatePageConfigs(appConfig: AppConfig): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const workspace of Object.values(appConfig.workspaces)) {
    for (const space of Object.values(workspace.spaces || {})) {
      for (const [pageId, page] of Object.entries(space.pages || {})) {
        for (const [tabId, tab] of Object.entries(page.tabs || {})) {

          // Component must exist in registry
          if (!ComponentRegistry.has(tab.component)) {
            errors.push({
              configId: pageId,
              tabId,
              error: `Component "${tab.component}" not found`
            });
          }

          // childTable must exist if specified
          if (tab.childTable && !childTableExists(tab.childTable)) {
            errors.push({
              configId: pageId,
              tabId,
              error: `Child table "${tab.childTable}" not found`
            });
          }
        }
      }
    }
  }

  return errors;
}
```

---

## Performance Metrics

| Metric | Target |
|--------|--------|
| Initial page load | < 500ms |
| Tab switch | < 200ms |
| Child table load | < 300ms |
| Memory usage | < 100MB |

---

## Related Documents

- [CHILD_TABLES_ARCHITECTURE.md](./CHILD_TABLES_ARCHITECTURE.md) - Child tables storage strategy
- [CHILD_TABLES_TODO.md](./CHILD_TABLES_TODO.md) - Child tables implementation checklist
- [SPACE_STORE_ARCHITECTURE.md](./SPACE_STORE_ARCHITECTURE.md) - Store architecture
- [done/DYNAMIC_PUBLIC_PAGE_TODO.md](./done/DYNAMIC_PUBLIC_PAGE_TODO.md) - Completed dynamic page implementation
