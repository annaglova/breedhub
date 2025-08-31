# Property-Based Configuration Architecture

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
- Added comprehensive documentation

---
*Last Updated: August 31, 2025*
*Version: 3.0.0 - Admin Interface Implementation*