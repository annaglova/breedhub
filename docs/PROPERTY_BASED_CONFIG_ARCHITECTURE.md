# 🏗️ Property-Based Configuration Architecture for BreedHub

## 📖 Table of Contents
- [Overview](#overview)
- [Core Concepts](#core-concepts)
- [Architecture](#architecture)
- [Implementation Status](#implementation-status)
- [Initial Data Generation](#initial-data-generation)
- [Data Structure](#data-structure)
- [Technical Details](#technical-details)
- [Benefits](#benefits)

## Overview

This document outlines the architecture and implementation of a unified property-based configuration system that powers all aspects of the BreedHub application configuration through semantic inheritance.

## Core Concepts

### 🎯 Main Principle
Create a universal configuration system based on **semantic inheritance** where configurations inherit properties through dependency chains (`deps[]`).

### 🔑 Key Terms
- **Field Property** - Atomic unit of configuration (e.g., `required: true`, `maxLength: 250`)
- **Base Field** - Common field definition used across entities (e.g., `field_name`, `field_created_at`)
- **Entity Field** - Entity-specific field inheriting from base fields (e.g., `breed_field_name`)
- **deps[]** - Array defining inheritance chain
- **self_data** - Field's own configuration data
- **override_data** - Local overrides (used for runtime modifications)
- **data** - Computed result after merging all dependencies

### 🎨 Use Cases
- Supabase table schemas generation
- UI configurations (menus, workspaces, field visibility)
- RxDB schemas for local storage
- Form and table generation
- Sorting, filtering, and search configurations
- Validation rules and permissions

## 📊 Proposed Architecture

```
┌─────────────────────────────────────────────────┐
│              Property Registry                   │
│  (Centralized property/field definitions)        │
└────────────────┬────────────────────────────────┘
                 │
     ┌───────────┴───────────┬───────────┬────────────┐
     ▼                       ▼           ▼            ▼
┌──────────┐        ┌──────────┐  ┌──────────┐ ┌──────────┐
│  Schema  │        │    UI    │  │Workspace │ │   RxDB   │
│ Builder  │        │ Config   │  │ Settings │ │  Schema  │
└──────────┘        └──────────┘  └──────────┘ └──────────┘
     │                    │             │            │
     └────────────────────┴─────────────┴────────────┘
                          │
                    ┌─────▼─────┐
                    │   Mixin    │
                    │  Composer  │
                    └─────┬─────┘
                          │
            ┌─────────────▼─────────────┐
            │     Final Config          │
            │  (merged with deps)       │
            └───────────────────────────┘
```

## 🔑 Key Components

### 1. Terminology and Structure

#### Core Concepts:
- **Field** - The configuration entity itself (e.g., `name`, `breed_standard`, `color`)
- **Properties** - Characteristics of a field (e.g., `required`, `maxLength`, `validation`)
- **Config** - Complete configuration object combining fields with their properties

### 2. Unified Configuration Model (app_config table)

All configuration types stored in a single table with JSONB for flexibility:

```typescript
interface AppConfig {
  // Identifiers
  id: string;        // Unique code (field_name, entity_Dog, mixin_sortable)
  type: string;      // field, entity, mixin, feature, template, ui_config
  
  // Configuration data (properties stored inside)
  self_data: any;    // Own configuration with properties
  override_data: any; // Local overrides of properties
  data: any;         // Computed result after merge
  
  // Dependencies
  deps: string[];    // Array of parent config IDs
  
  // Metadata for UI
  caption?: string;  // Human-readable description
  category?: string; // Grouping category
  tags?: string[];   // Search tags
  version: number;   // Version number
}
```

### 3. Field Configuration Structure

Example of field configuration stored in `self_data`:

```typescript
// Example: field configuration with properties
{
  "fieldType": "string",      // Type of the field
  "component": 10,             // UI component for rendering
  "required": true,            // Property: is required
  "maxLength": 255,            // Property: maximum length
  "placeholder": "Enter name", // Property: placeholder text
  "validation": {              // Property: validation rules
    "pattern": "^[a-zA-Z]+$"
  },
  "permissions": {             // Property: access control
    "read": ["*"],
    "write": ["admin"]
  },
  "sortOrder": 10,            // Property: order in UI
  "isSystem": false           // Property: system field flag
}
```

### 4. Mixin System

```typescript
interface PropertyMixin {
  name: string; // 'sortable', 'searchable', 'auditable'
  apply: (property: PropertyDefinition) => PropertyDefinition;
}

// Example mixins
const SORTABLE_MIXIN = {
  name: 'sortable',
  apply: (prop) => ({
    ...prop,
    features: {
      ...prop.features,
      sortable: true,
      sortPriority: 0
    }
  })
};

const AUDITABLE_MIXIN = {
  name: 'auditable',
  apply: (prop) => ({
    ...prop,
    features: {
      ...prop.features,
      trackChanges: true,
      auditLog: true
    }
  })
};

const SEARCHABLE_MIXIN = {
  name: 'searchable',
  apply: (prop) => ({
    ...prop,
    features: {
      ...prop.features,
      searchable: true,
      searchWeight: 1.0
    }
  })
};

const ENCRYPTED_MIXIN = {
  name: 'encrypted',
  apply: (prop) => ({
    ...prop,
    features: {
      ...prop.features,
      encrypted: true,
      encryptionMethod: 'AES-256'
    }
  })
};
```

## 📋 Implementation Status

### ✅ Phase 1: Foundation (COMPLETED)
- ✅ Migrated from dual-table (property_registry + property_usage) to single `app_config` table
- ✅ Implemented RxDB + Supabase sync with field mapping (deleted ↔ _deleted)
- ✅ Built signal stores with @preact/signals-react for reactive state
- ✅ Fixed all RxDB schema validation issues
- ✅ Created automatic sync without manual triggers

### ✅ Phase 2: Semantic Tree Generation (COMPLETED)
- ✅ Generated entity configurations for all 258 Supabase tables
- ✅ Analyzed 430 unique fields across all entities
- ✅ Created 3-level semantic inheritance hierarchy:
  - **12 Field Properties** (atomic units like `required`, `maxLength`)
  - **9 Base Fields** (common fields like `name`, `created_at`)
  - **18 Entity Fields** for breed table (test mode)
- ✅ Implemented automatic field categorization:
  - System fields (>80% occurrence): id, created_at, created_by, updated_at, updated_by
  - Common fields (>40% occurrence): name, description
  - Frequent fields (>10% occurrence): code, contact_id, notes
- ✅ Built dependency resolution through `deps[]` arrays
- ✅ Generated SQL inserts with proper inheritance

## 🚀 Initial Data Generation

### Overview
The initial configuration data is generated through a multi-step process that analyzes existing database schemas and creates a semantic inheritance tree.

### Generation Process

#### Step 1: Entity Configuration Generation
```bash
node scripts/generate-entity-configs.cjs
```
- Connects to Supabase and reads all table schemas
- Generates JSON configuration for each table
- Maps PostgreSQL types to field types and UI components
- Output: `/src/data/entities/{main,lookup,child}/*.json`

**Statistics:**
- 258 total entities processed
- 25 main resources
- 127 lookup tables
- 106 child resources

#### Step 2: Field Analysis
```bash
node scripts/analyze-fields.cjs
```
- Loads all entity configurations
- Analyzes field frequency and patterns
- Identifies common properties
- Generates semantic tree structure
- Output: `/src/data/semantic-tree/semantic-tree.json`

**Key Findings:**
- 430 unique fields discovered
- 5 system fields (>80% occurrence)
- 2 common fields (>40% occurrence)
- Explicit property inheritance (no defaults)

#### Step 3: SQL Generation and Database Insert
```bash
node scripts/generate-sql-inserts.cjs
```
- Loads semantic tree
- Computes merged data for each configuration
- Generates SQL inserts
- Uses upsert to update existing records
- Output: `/src/data/semantic-tree/app-config-inserts.sql`

### Data Inheritance Model

#### Three-Level Hierarchy

**Level 1: Field Properties (Atomic Units)**
```json
{
  "id": "field_property_required",
  "type": "field_property",
  "self_data": {
    "required": true,
    "validation": { "notNull": true }
  }
}
```

**Level 2: Base Fields (Common Fields)**
```json
{
  "id": "field_name",
  "type": "field",
  "deps": [
    "field_property_required",
    "field_property_not_system",
    "field_property_maxlength_250"
  ],
  "self_data": {
    "displayName": "Name",
    "permissions": {
      "read": ["*"],
      "write": ["admin", "editor"]
    }
  }
}
```

**Level 3: Entity-Specific Fields**
```json
{
  "id": "breed_field_name",
  "type": "entity_field",
  "deps": ["field_name"],
  "category": "breed",
  "self_data": {
    "fieldType": "string",
    "component": "text",
    "placeholder": "Enter name",
    "maxLength": 250
  }
}
```

### Dependency Resolution

When computing the final `data` field:
1. Start with empty object
2. For each dependency in `deps[]`:
   - Recursively compute its data
   - Merge into result
3. Apply `self_data`
4. Apply `override_data` (if runtime modifications needed)
5. Result stored in `data` field

### Key Design Decisions

1. **Explicit Properties**: All boolean properties are explicit (e.g., both `field_property_required` and `field_property_not_required` exist)
2. **No Defaults**: No implicit default values - everything is explicitly inherited
3. **Empty override_data**: Initial generation has empty `override_data` - used only for runtime modifications
4. **Full self_data**: Entity fields contain complete configuration in `self_data`, not just differences
5. **Upsert Strategy**: Database updates use upsert with `ignoreDuplicates: false` to force updates

### Phase 3: Mixin System (2-3 days)

#### 3.1 Create Mixin Engine
- Registration and management of mixins
- Composition of mixins for properties
- Conflict resolution for multiple mixins
- Mixin inheritance and override rules

#### 3.2 Standard Mixins Library
- `sortable` - adds sorting capability
- `searchable` - adds to search fields
- `auditable` - change tracking
- `encrypted` - encryption in RxDB
- `translatable` - multi-language support
- `computed` - calculated fields
- `indexed` - database indexing
- `cached` - caching strategy
- `validated` - validation rules

#### 3.3 UI for Mixin Management
- Visual mixin composer
- Preview of mixin application results
- Mixin conflict detector
- Performance impact analyzer

### Phase 4: Schema Generator (3-4 days)

#### 4.1 RxDB Schema Generator

```typescript
class RxDBSchemaGenerator {
  generateFromConfig(config: ConfigSchema): RxJsonSchema {
    return {
      version: 0,
      primaryKey: 'id',
      type: 'object',
      properties: this.convertProperties(config.properties),
      required: this.extractRequired(config.properties),
      indexes: this.generateIndexes(config),
      encrypted: this.extractEncrypted(config.properties),
      attachments: this.hasAttachments(config.properties)
    };
  }
  
  private convertProperties(props: Record<string, PropertyDefinition>) {
    const rxProps = {};
    for (const [key, prop] of Object.entries(props)) {
      rxProps[key] = {
        type: this.mapType(prop.type),
        maxLength: prop.maxLength,
        minLength: prop.minLength,
        minimum: prop.minimum,
        maximum: prop.maximum,
        pattern: prop.pattern,
        ref: prop.entitySchemaName, // For references
        items: prop.type === 'array' ? { type: 'string' } : undefined
      };
    }
    return rxProps;
  }
  
  private mapType(type: PropertyType): string {
    const typeMap = {
      'string': 'string',
      'number': 'number',
      'boolean': 'boolean',
      'date': 'string', // ISO date string
      'reference': 'string', // Reference ID
      'json': 'object',
      'array': 'array'
    };
    return typeMap[type] || 'string';
  }
  
  private extractRequired(props: Record<string, PropertyDefinition>): string[] {
    return Object.entries(props)
      .filter(([_, prop]) => prop.isRequired)
      .map(([key, _]) => key);
  }
  
  private generateIndexes(config: ConfigSchema): string[] {
    const indexes = ['created_at', 'updated_at'];
    
    // Add searchable fields
    if (config.layout?.searchFields) {
      indexes.push(...config.layout.searchFields);
    }
    
    // Add sortable fields
    if (config.layout?.sortFields) {
      indexes.push(...config.layout.sortFields);
    }
    
    // Add fields with indexing mixin
    for (const [key, prop] of Object.entries(config.properties)) {
      if (prop.mixins?.includes('indexed')) {
        indexes.push(key);
      }
    }
    
    return [...new Set(indexes)]; // Remove duplicates
  }
}
```

#### 4.2 Supabase Migration Generator
- Generate SQL for table creation
- Generate migrations on schema changes
- Rollback mechanism
- Foreign key constraints from references
- Indexes from property mixins

#### 4.3 UI Component Generator
- Form generation from configuration
- Table/list generation
- Filter and sort UI generation
- Custom component mapping

### Phase 5: Config Builder UI (4-5 days)

#### 5.1 Visual Schema Designer
- Drag-n-drop properties from registry
- Visual relationship builder
- Real-time preview
- Schema validation
- Performance analyzer

#### 5.2 Workspace Configuration
- Field visibility settings
- Access control configuration
- UI customization for different roles
- Workspace templates
- Conditional field display rules

#### 5.3 Integration with Existing System
- Update config-admin app
- Integration with Windmill for merge logic
- Real-time sync via Supabase
- Backward compatibility layer

### Phase 6: Testing & Migration (2-3 days)

#### 6.1 Testing
- Unit tests for generators
- Integration tests with RxDB
- E2E tests for config flow
- Performance benchmarks
- Security audit

#### 6.2 Data Migration
- Convert existing configs
- Validate generated schemas
- Rollback plan
- Data integrity checks
- Progressive migration strategy

## 🛠️ Technical Implementation

### Config Merge Strategy (Updated)

```typescript
class ConfigMerger {
  merge(configs: ConfigSchema[]): ConfigSchema {
    const result: ConfigSchema = {
      id: configs[configs.length - 1].id,
      type: configs[configs.length - 1].type,
      deps: [],
      properties: {}
    };
    
    // Merge properties with mixin composition
    for (const config of configs) {
      for (const [key, prop] of Object.entries(config.properties)) {
        if (typeof prop === 'string') {
          // Reference to property registry
          result.properties[key] = this.resolveProperty(prop);
        } else {
          // Direct property definition
          result.properties[key] = this.applyMixins(prop);
        }
      }
    }
    
    // Apply layout and UI settings
    result.layout = this.mergeLayouts(configs.map(c => c.layout));
    
    // Calculate final data
    result.data = this.computeFinalConfig(result);
    
    return result;
  }
  
  private applyMixins(prop: PropertyDefinition): PropertyDefinition {
    let result = { ...prop };
    for (const mixinName of prop.mixins || []) {
      const mixin = this.getMixin(mixinName);
      result = mixin.apply(result);
    }
    return result;
  }
  
  private mergeLayouts(layouts: (Layout | undefined)[]): Layout {
    // Deep merge layout configurations
    const merged: Layout = {
      listColumns: [],
      detailSections: [],
      searchFields: [],
      sortFields: []
    };
    
    for (const layout of layouts) {
      if (!layout) continue;
      
      // Merge arrays with deduplication
      merged.listColumns = [...new Set([...merged.listColumns, ...(layout.listColumns || [])])];
      merged.searchFields = [...new Set([...merged.searchFields, ...(layout.searchFields || [])])];
      merged.sortFields = [...new Set([...merged.sortFields, ...(layout.sortFields || [])])];
      
      // Merge sections
      merged.detailSections = this.mergeSections(merged.detailSections, layout.detailSections);
    }
    
    return merged;
  }
}
```

### Unified Configuration Database Schema (app_config)

```sql
-- Single table for all configuration types
CREATE TABLE public.app_config (
  -- Identifiers
  id TEXT PRIMARY KEY,  -- Unique code (field_name, entity_Dog, mixin_sortable)
  type TEXT NOT NULL,   -- field, entity, mixin, feature, template, ui_config
  
  -- Configuration data (all field properties stored inside)
  self_data JSONB DEFAULT '{}',      -- Own configuration with properties
  override_data JSONB DEFAULT '{}',   -- Local property overrides
  data JSONB DEFAULT '{}',           -- Computed result after merge
  
  -- Dependencies
  deps TEXT[] DEFAULT '{}',  -- Array of parent config IDs
  
  -- Minimal metadata for UI
  caption TEXT,          -- Human-readable description
  category TEXT,         -- Grouping category
  tags TEXT[] DEFAULT '{}', -- Search tags
  
  -- Versioning
  version INTEGER DEFAULT 1,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,
  updated_by TEXT,
  
  -- Soft delete
  deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX idx_app_config_type ON app_config(type);
CREATE INDEX idx_app_config_category ON app_config(category);
CREATE INDEX idx_app_config_tags ON app_config USING GIN(tags);
CREATE INDEX idx_app_config_deps ON app_config USING GIN(deps);
CREATE INDEX idx_app_config_deleted ON app_config(deleted);
CREATE INDEX idx_app_config_version ON app_config(version);

-- Unique constraint for active records
CREATE UNIQUE INDEX idx_app_config_id_active 
ON app_config(id) 
WHERE deleted = false;
```

## 🎯 Benefits of This Approach

1. **Unification** - Single system for all configurations
2. **Reusability** - Properties and mixins used everywhere
3. **Flexibility** - Easy to add new features via mixins
4. **Type Safety** - Generate TypeScript types from configurations
5. **Versioning** - Track configuration changes
6. **Real-time** - Instant updates via Supabase
7. **Offline-first** - RxDB schemas for local operation
8. **Performance** - Optimized through indexing and caching
9. **Scalability** - Property registry scales independently
10. **Maintainability** - Clear separation of concerns

## 📅 Timeline

### Week 1: Foundation
- **Days 1-3**: Property Registry implementation
- **Days 4-5**: Mixin System development

### Week 2: Generators
- **Days 1-2**: RxDB Schema Generator
- **Days 3-4**: Supabase Migration Generator
- **Day 5**: UI Component Generator

### Week 3: User Interface
- **Days 1-3**: Visual Schema Designer
- **Days 4-5**: Workspace Configuration UI

### Week 4: Integration & Launch
- **Days 1-2**: System Integration
- **Days 3-4**: Testing & Migration
- **Day 5**: Documentation & Deployment

## 🚀 Getting Started

### Prerequisites
- Existing config and config_type tables in Supabase
- Windmill integration for merge operations
- config-admin app setup

### Initial Setup
1. Create property_registry tables in Supabase
2. Import existing properties from current configs
3. Set up mixin registry with standard mixins
4. Configure config-admin to use new system

### Migration Path
1. Run property extraction script on existing configs
2. Review and categorize extracted properties
3. Apply appropriate mixins
4. Test generated schemas
5. Progressive rollout by config type

## 📚 Additional Resources

- [CONFIG_TS.md](./CONFIG_TS.md) - Original requirements and task definition
- [RxDB Schema Documentation](https://rxdb.info/rx-schema.html)
- [Supabase Table Management](https://supabase.com/docs/guides/database)

### Archived Documentation
- [CONFIG_ARCHITECTURE.md](./archive/CONFIG_ARCHITECTURE.md) - Previous config architecture
- [CONFIG_DRIVEN_STORE.md](./archive/CONFIG_DRIVEN_STORE.md) - Previous config-driven store implementation
- [CONFIG_SETUP.md](./archive/CONFIG_SETUP.md) - Previous Windmill integration setup

## 🔄 Migration Strategy from Current System

### Current State Analysis
- Existing config table with JSON data
- Windmill merge function
- Legacy field definitions in self_data

### Migration Steps
1. **Analyze** - Extract all unique properties from existing configs
2. **Categorize** - Group properties by type and usage
3. **Standardize** - Create standardized property definitions
4. **Map** - Create mapping from old to new format
5. **Convert** - Progressive conversion of configs
6. **Validate** - Ensure backward compatibility
7. **Deploy** - Phased rollout with rollback capability

## 🎯 Benefits

1. **Unification** - Single system for all configurations
2. **Reusability** - Properties and base fields used everywhere
3. **Flexibility** - Easy to add new properties and fields
4. **Type Safety** - Generate TypeScript types from configurations
5. **Versioning** - Track configuration changes
6. **Real-time** - Instant updates via Supabase
7. **Offline-first** - RxDB schemas for local operation
8. **Performance** - Optimized through proper indexing
9. **Scalability** - Semantic inheritance scales to thousands of fields
10. **Maintainability** - Clear separation of concerns

## 🚀 Next Steps

1. **Complete Entity Field Generation** - Expand from breed to all 258 entities
2. **Build UI Components** - Create dynamic forms based on configurations
3. **Implement Runtime Overrides** - Use override_data for workspace customization
4. **Add Validation Engine** - Process validation rules from configurations
5. **Create Migration Tools** - Convert existing configs to new format

## 📚 Related Documentation

- [CONFIG_TS.md](./CONFIG_TS.md) - Original requirements and task definition
- [RxDB Schema Documentation](https://rxdb.info/rx-schema.html)
- [Supabase Table Management](https://supabase.com/docs/guides/database)

## 🔧 Maintenance Scripts

### Regenerate All Configurations
```bash
# Step 1: Generate entity configs from Supabase
node scripts/generate-entity-configs.cjs

# Step 2: Analyze and build semantic tree
node scripts/analyze-fields.cjs

# Step 3: Generate SQL and update database
node scripts/generate-sql-inserts.cjs
```

### Check Database State
```bash
node scripts/check-db.cjs
```

### Clean and Rebuild
```bash
node scripts/clean-and-insert.cjs
```

---

*Last Updated: August 29, 2025*
*Version: 2.0.0 - Semantic Inheritance Implementation*