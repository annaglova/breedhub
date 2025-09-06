# Property-Based Configuration Architecture

## Core Principles

### Business Logic in Stores, Not Components
**IMPORTANT**: All business logic and functionality must be implemented in stores, not in React components. Components should only handle presentation and user interaction, delegating all business operations to the store layer.

- ✅ **Store responsibilities**: Data manipulation, calculations, API calls, state management, business rules
- ✅ **Component responsibilities**: UI rendering, event handling, calling store methods
- ❌ **Never in components**: Direct data transformations, business rules, complex logic

This separation ensures:
- Testability: Business logic can be tested independently
- Reusability: Logic can be shared across components
- Maintainability: Clear separation of concerns
- Performance: Stores can optimize operations

## Overview
The BreedHub configuration system uses a hierarchical, property-based architecture that enables semantic inheritance and configuration composition through a dependency system.

## Core Concepts

### 1. Configuration Types
All configurations are stored in a single `app_config` table with the following types:
- **property** - Atomic configuration units (e.g., `property_required`, `property_maxlength_250`)
- **field** - Field definitions that can inherit from properties
- **entity** - Entity configurations
- **mixin** - Reusable configuration mixins
- **template** - Configuration templates
- **ui_config** - UI-specific configurations

### 2. Data Structure
Each configuration record contains:
```typescript
{
  id: string,              // Unique identifier
  type: string,            // Configuration type
  self_data: any,          // Own configuration data
  override_data: any,      // Override values (highest priority)
  data: any,               // Computed final configuration
  deps: string[],          // Array of dependency IDs
  created_at: string,
  updated_at: string,
  _deleted: boolean
}
```

### 3. Merge Logic

#### Data Computation Formula
```
data = merge(self_data, override_data)
```

#### Property Addition to Field
When adding a property to a field's deps:
1. Merge property.data into field.self_data
2. Recalculate field.data = merge(field.self_data, field.override_data)
3. For dependent configs:
   - Merge all deps' data into dependent.self_data
   - Recalculate dependent.data = merge(dependent.self_data, dependent.override_data)
4. Cascade updates up the dependency tree

#### Property Removal from Field
When removing a property from a field's deps:
1. Remove property.data keys from field.self_data
2. Re-apply data from remaining properties in deps
3. Recalculate field.data = merge(field.self_data, field.override_data)
4. For dependent configs:
   - Recompute self_data from remaining deps
   - Recalculate data = merge(self_data, override_data)
5. Cascade updates up the dependency tree

#### Property Modification
When a property's self_data is modified:
1. Update property's data = self_data (properties don't have override_data)
2. Find all configs with this property in deps
3. For each dependent field:
   - Rebuild self_data from all property dependencies
   - Recalculate data = merge(self_data, override_data)
4. Recursively update all configs that depend on modified fields
5. Bulk update all affected configs in database

#### Why This Approach?
- **override_data preservation**: When property.data matches override_data, removing the property doesn't incorrectly remove override values
- **Predictable inheritance**: self_data always reflects inherited values, override_data always takes precedence
- **Clean separation**: Inherited values (self_data) vs local customizations (override_data)

### 4. System Properties
Protected properties that cannot be edited or deleted:
- `property_is_system` - Marks a field as system-level
- `property_not_system` - Marks a field as non-system

## Admin Interface

### Properties Page (`/properties`)
- Grid view of all properties
- Create new properties with JSON editor
- Edit property self_data (except system properties)
- Delete properties (except system properties)
- Search and pagination
- Property ID can be edited when modifying

### Fields Page (`/fields`)
- Hierarchical view:
  - Base Fields (system fields)
  - Main Entities with their child entities
  - Dictionaries
- Features:
  - Drag & drop properties onto fields
  - Visual dependency badges with removal capability
  - Edit override_data for any field via modal
  - Real-time search
  - Add properties via dropdown menu

## Implementation Details

### Storage
- **RxDB** for offline-first storage with Dexie adapter
- **Supabase** for real-time synchronization
- Signal stores (`@preact/signals-react`) for reactive state
- Field mapping: Supabase `deleted` ↔ RxDB `_deleted`

### Key Files

#### `/apps/config-admin/src/utils/config-merge.ts`
Core merge logic implementation:
```typescript
// Deep object merging
deepMerge(target, source)

// Calculate final data (self_data + override_data)
computeMergedData(config)

// Add property with cascading updates
addPropertyToField(fieldId, propertyId)

// Remove property with cleanup
removePropertyFromField(fieldId, propertyId)

// Find all dependent configurations
getDependentConfigs(configId, allConfigs)

// Update dependents when property changes
updateDependentsOnPropertyChange(propertyId, allConfigs)
```

#### `/apps/config-admin/src/pages/Properties.tsx`
Properties management page with:
- Grid layout with cards
- Create/Edit/Delete operations
- JSON editor for self_data
- Protection for system properties

#### `/apps/config-admin/src/pages/FieldsV2.tsx`
Fields management page with:
- Hierarchical structure display
- Drag & drop functionality
- Badge-based dependency display
- Override data editor

### Entity Categorization
Entities are categorized in `/apps/config-admin/scripts/entity-categories.json`:
```json
{
  "main": ["breed", "pet", "account", ...],
  "child": {
    "breed": ["breed_standard", ...],
    "pet": ["pet_photo", ...]
  },
  "dictionaries": ["country", "city", ...]
}
```

## Store Methods

### appConfigStore (RxDB Signal Store)
```typescript
// Read operations
configsList.value       // All configs array
fields.value           // Filtered fields
entities.value         // Filtered entities

// Write operations
createConfig(config)   // Create new config
updateConfig(id, data) // Update existing config
deleteConfig(id)       // Soft delete config
```

## Usage Examples

### Adding a Property to a Field
1. User drags `property_required` onto `breed_field_name`
2. System merges `property_required.data` into `breed_field_name.self_data`
3. System recalculates `breed_field_name.data = merge(self_data, override_data)`
4. All configs depending on `breed_field_name` update their self_data and data

### Editing Override Data
1. User clicks Edit button on a field
2. Modal opens with JSON editor for override_data
3. User modifies JSON and saves
4. System calculates: `data = merge(self_data, override_data)`
5. Override values take precedence over inherited values

### Creating a New Property
1. User clicks "Add Property" button
2. Enters property ID (e.g., `property_validation_email`)
3. Enters JSON for self_data
4. System creates property with computed data
5. Property becomes available for fields

## Benefits
1. **Semantic Inheritance** - Properties carry meaning and behavior
2. **Composability** - Mix and match properties to build complex configurations
3. **Maintainability** - Change a property once, updates cascade everywhere
4. **Flexibility** - Override data allows local customization without breaking inheritance
5. **Traceability** - Clear dependency chain shows where configurations come from
6. **Performance** - Bulk updates minimize database operations

## Session Recovery Notes
When recovering a session, key context includes:
- Single `app_config` table architecture
- Property-based inheritance via deps arrays
- self_data + override_data = data formula
- Cascading updates up dependency tree
- System properties protection
- Drag & drop UI for property management

## Recent Updates (August 31, 2025)
- Implemented proper merge logic with override_data preservation
- Added edit functionality for field override_data
- Fixed cascading updates for dependent configurations
- Protected system properties from modification
- Added property modification with automatic dependent updates
- Implemented bulk updates for performance optimization
- Fixed upsert method to use updateConfig
- Added comprehensive documentation

## Recent Updates (September 3, 2025)
- **UI Standardization**: Unified spacing and heights across all admin pages (40px for all section headers)
- **Template Cloning**: Fixed hierarchy preservation - clones now maintain same level as original template
- **Modal Forms**: Replaced inline property creation with universal ConfigEditModal for consistency
- **Store Methods Enhanced**:
  - `cloneTemplate()` now maintains parent-child relationships
  - `updatePropertyWithIdChange()` allows property ID modification
  - `addDependencyWithUI()`/`removeDependencyWithUI()` for UI-oriented operations
- **Visual Improvements**:
  - Consistent 8px vertical spacing between all list items
  - Centered chevron icons in full container height

## Recent Updates (September 5, 2025)
- **Drag & Drop Implementation**:
  - Fields can be dragged from Entity Fields registry to Config tree
  - Properties can be dragged from Properties registry to fields (adds as dependency)
  - Drop zones limited to leaf config nodes (fields, sort, filter)
  - Visual feedback with green borders for valid drop targets
  - Automatic self_data updates when fields are dropped on configs
- **Field Management Enhanced**:
  - Full field functionality restored (view, edit, add properties, delete)
  - Base fields can only be removed from configs, not deleted
  - Custom fields can be deleted entirely
  - Property dependencies shown as pills with remove buttons
- **UI Components Unified**:
  - WorkspaceHeader component extended with extraButtons and note support
  - All admin pages now use unified WorkspaceHeader component
  - Removed custom headers in favor of standardized component
  - ConfigEditModal and ConfigViewModal used consistently for all entities
- **Performance Improvements**:
  - Fixed overflow issues in Entity Fields registry
  - Added proper scrolling containers for all registries
  - Removed debug elements and test code
  - Flexible field heights with action buttons at name level
  - Standardized gray backgrounds for all section headers

### Template Hierarchy Management
Templates use the `deps` array to maintain parent-child relationships:
- Parent templates list child template IDs in their `deps` array
- When cloning, the system finds the parent and adds the clone to its `deps`
- This ensures clones appear at the same hierarchical level as originals

## Recent Updates (September 4, 2025)

### Hierarchical Configuration Architecture
Implemented new architecture for high-level structures:

1. **Dynamic self_data Formation**:
   - All configs start with empty self_data
   - Parent's self_data builds from children in deps
   - Properties merge directly to root (except in field collections)
   - Each child type has specific container in parent

2. **Structured Containers**:
   - Objects for most containers (quick access by ID)
   - Arrays for sort_fields and filter_fields (order matters)
   - Properties go to root level of any non-field container

3. **Cascading Updates**:
   - Child changes propagate up the tree
   - Only modified child updates in parent
   - Complete consistency maintained throughout hierarchy

4. **override_data Priority**:
   - Most customization via override_data
   - Properties provide base behavior
   - override_data always takes precedence

### Critical Fix: Template Data Display
**Issue**: Templates displayed incorrectly in UI despite correct data in RxDB
**Root Cause**: The `recalculateTemplateData` method was using old merge logic that corrupted hierarchical structures
**Solution**: Modified `recalculateTemplateData` to preserve the correct self_data from RxDB and only recalculate the final `data` field

**Important**: For high-level structures (app, workspace, space, view, page), the self_data is maintained through:
- `rebuildParentSelfData` - rebuilds parent's self_data from all children
- `updateParentSelfData` - updates parent when a single child changes
- `cascadeUpdateUp` - propagates changes up the dependency tree

The `recalculateTemplateData` method must NOT modify self_data for these structures as it's already correct in the database.

## Recent Updates (September 6, 2025)

### Grouping Configurations (fields, sort, filter)
Implemented special handling for grouping configurations that act as containers:

1. **Grouping Config Types**:
   - `fields` - Container for field configurations
   - `sort` - Container for sort configurations  
   - `filter` - Container for filter configurations
   - These configs cannot have override_data (UI enforced)
   - Act as organizational containers without business logic

2. **Field Management in Configs**:
   - Fields are displayed as child nodes under grouping configs
   - Drag & drop fields only to grouping configs (fields, sort, filter)
   - Field data is merged into parent's self_data.fields object
   - Field removal only unlinks, doesn't delete the field from system
   - Cascade deletion preserves fields (only removes links)

3. **Data Computation for Grouping Configs**:
   - Grouping configs use same logic as high-level types
   - `data = self_data + override_data` (no deps merging)
   - Field data from deps is processed into parent's fields container
   - Ensures self_data and data consistency

4. **UI Improvements**:
   - Consistent indentation in hierarchy (24px for all levels)
   - Edit buttons hidden for grouping configs
   - Field references shown as child nodes with remove option
   - Visual feedback for drag & drop targets

5. **Singleton Pattern**:
   - tabs → tab (singular naming)
   - Only one instance per parent allowed
   - Enforced via `canAddConfigType` validation

### Future Enhancement: Field Override System (Planned)
Discussed architecture for field customization at config level:
- Override field properties without creating duplicates
- Store overrides in parent config's self_data
- Virtual field enhancement for different contexts
- Maintains single source of truth for base fields

## Platform Vision & Architecture Philosophy

### Goal: Configuration-Driven Platform
Building a meta-framework where the entire application is driven by configurations, not code.

#### Core Concepts:

1. **Universal Stores**
   - Single generic store implementation that adapts based on configuration
   - Eliminates need for entity-specific store code
   - Configuration defines all CRUD operations, validations, and business logic
   - Example: `const store = new UniversalStore(entityConfig)`

2. **Component Registry**
   - Library of reusable UI components (tables, forms, filters, etc.)
   - Components are configured, not coded
   - Consistent behavior across entire application
   - Dynamic rendering based on configuration

3. **Configuration as Code**
   ```javascript
   // Instead of writing components:
   const BreedTable = () => { /* hundreds of lines */ }
   
   // We configure them:
   {
     type: "table",
     dataSource: "breeds",
     fields: [...],
     actions: [...]
   }
   ```

4. **Dynamic UI Generation**
   - Pages are assembled from configured components
   - Layout and behavior defined in configuration
   - Changes without deployment - just update config
   - A/B testing through config variants

#### Benefits:

- **Rapid Development**: New features in hours, not weeks
- **Consistency**: All components follow same patterns
- **Customization**: Per-client configurations without code forks
- **Maintainability**: Fix once in component, works everywhere
- **Scalability**: Add new entities without new code

#### Implementation Strategy:

1. **Phase 1**: Property-based configuration system ✅
2. **Phase 2**: Grouping configs and field management ✅
3. **Phase 3**: Field override system (in progress)
4. **Phase 4**: Universal store implementation
5. **Phase 5**: Component registry development
6. **Phase 6**: Visual configuration builder
7. **Phase 7**: Configuration marketplace

#### Performance Optimizations (Planned):

- **Batch Operations**: Mass updates in single transaction
- **Lazy Loading**: Load configurations on demand
- **Caching Strategy**: Multi-level cache for computed data
- **Incremental Updates**: Only recalculate affected portions

#### Comparison to Existing Platforms:

| Feature | BreedHub | Salesforce | Airtable | Retool |
|---------|----------|------------|----------|--------|
| Local-First | ✅ | ❌ | ❌ | ❌ |
| CRDT Support | ✅ | ❌ | ❌ | ❌ |
| Property Inheritance | ✅ | Partial | ❌ | ❌ |
| Offline Mode | ✅ | Limited | ❌ | ❌ |
| Domain-Specific | ✅ | Generic | Generic | Generic |

#### Architecture Principles:

1. **Composition over Configuration**: Build complex from simple
2. **Single Source of Truth**: One config table rules all
3. **Cascade by Default**: Changes propagate automatically
4. **Override Locally**: Customize without duplication
5. **Version Everything**: Full history of all changes

---
*Last Updated: September 6, 2025*
*Version: 4.2.0 - Added Platform Vision & Architecture Philosophy*