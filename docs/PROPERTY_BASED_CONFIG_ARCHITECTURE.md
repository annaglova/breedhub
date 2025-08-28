# 🏗️ Property-Based Configuration Architecture for BreedHub

## Overview

This document outlines the architecture and implementation plan for a unified property-based configuration system that will power all aspects of the BreedHub application configuration.

## Core Concept

Create a universal configuration system where **property (field)** is the atomic unit that can be reused across different contexts:
- Supabase table schemas
- UI configurations (menus, workspaces, field visibility)
- RxDB schemas for local storage
- Form and table generation
- Sorting, filtering, and search configurations

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

## 📋 Implementation Plan

### ✅ Phase 1: Property Registry (COMPLETED)
- ✅ Created Property Registry with full CRUD operations
- ✅ Implemented RxDB + Supabase sync
- ✅ Built comprehensive UI for property management
- ✅ Added UUID-based identification system
- ✅ Enabled real-time updates and offline support

### 🚀 Phase 2: Entity Registry & Auto-Discovery (NEW PLAN)

#### 2.1 Create Entity Registry
- Build registry of all entities in the system (Dog, Cat, Breed, etc.)
- Define entity metadata (table name, display name, icon, category)
- Track relationships between entities
- Store entity-specific configurations

#### 2.2 Schema Auto-Discovery Tool
- Analyze existing Supabase tables and RxDB schemas
- Extract all fields with their types and constraints
- Parse existing JSON configs (breed.json, account.json, etc.)
- Identify patterns in field naming and types

#### 2.3 Property Categorization Engine
- **Common Properties**: Fields that appear in multiple entities (id, name, created_at, updated_at)
- **System Properties**: Technical fields (_deleted, _attachments, sync metadata)
- **Entity-Specific Properties**: Unique fields per entity (breed_standard, color_genetics)
- **Relationship Properties**: Foreign keys and references between entities

#### 2.4 Bulk Property Import
- Generate comprehensive JSON with all discovered properties
- Auto-assign appropriate component types based on data types
- Suggest mixins based on field patterns (e.g., all *_date fields get 'sortable')
- Create property naming conventions and apply them
- Import all properties to Property Registry in one operation

#### 2.5 Property Deduplication
- Identify duplicate properties with different names
- Suggest standardization (e.g., created_date vs created_at)
- Create property aliases for backward compatibility
- Generate migration plan for property consolidation

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

This architecture provides a robust, scalable foundation for managing all configuration aspects of the BreedHub application through a unified property-based system.