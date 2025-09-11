# Config Admin - Property-Based Configuration System

## Overview
Config Admin is a sophisticated configuration management system for BreedHub that implements a property-based, hierarchical configuration architecture with semantic inheritance.

## Key Features

### 🧬 Property-Based Inheritance
- **Atomic Properties**: Smallest units of configuration (e.g., `property_required`, `property_maxlength_250`)
- **Field Definitions**: Inherit from properties and base fields
- **Entity Configurations**: Complete configurations for database entities
- **Cascading Updates**: Changes propagate through dependency chains

### 🔄 Override System
- **Preserved During Regeneration**: User customizations never lost
- **Three-Layer Merge**: dependencies → self_data → override_data (highest priority)
- **Safe Updates**: Regenerate base configs without losing manual changes

### 🎯 Semantic Field Relationships
Parent-child field inheritance patterns:
- `field_contact_id` → `owner_id`, `created_by`, `updated_by`, `breeder_id`
- `field_account_id` → `provider_id`, `kennel_id`
- `field_breed_id` → `father_breed_id`, `mother_breed_id`
- `field_pet_id` → `father_id`, `mother_id`
- `field_country_id` → `country_of_birth_id`, `country_of_stay_id`

### 💾 Offline-First Architecture
- **RxDB** for local storage with Dexie adapter
- **Supabase** for real-time synchronization
- **Signal Stores** for reactive state management
- Works fully offline with automatic sync when online

## Quick Start

### Prerequisites
```bash
# Required environment variables in .env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_SERVICE_KEY=your_service_key
```

### Installation
```bash
# From project root
pnpm install

# Start development server
pnpm dev
```

### Regenerate Configurations
```bash
# From apps/config-admin directory

# 1. Generate entity configs from database schema
node scripts/generate-entity-configs.cjs

# 2. Analyze fields and build semantic tree
node scripts/analyze-fields.cjs

# 3. Generate and insert to database (preserves overrides)
echo "y" | node scripts/generate-sql-inserts.cjs
```

## UI Components

### 📍 Properties Page (`/`)
- Grid view of all atomic properties
- Create/Edit/Delete operations (protected for system properties)
- JSON editor for self_data
- Search and pagination

### 📊 App Config Page (`/app-config`)
- Hierarchical tree view of all configurations
- Real-time search across 2800+ configs
- Visual dependency management
- Edit override_data via modal
- Field inheritance visualization

### 🔄 Regenerate Button
- Located in header next to "Config Admin"
- Preserves all override_data
- Shows manual execution instructions
- Future: Windmill/Edge Functions integration

## Architecture

### Data Model
```typescript
interface AppConfig {
  id: string;              // Unique identifier
  type: ConfigType;        // property|field|entity_field|...
  self_data: any;          // Own configuration
  override_data: any;      // User customizations (highest priority)
  data: any;               // Computed: merge(deps + self_data + override_data)
  deps: string[];          // Dependency IDs for inheritance
  tags: string[];          // Metadata tags
  category?: string;       // Organization category
  caption?: string;        // Display name
}
```

### Configuration Types
- **property** - Atomic configuration units
- **field** - Base field definitions  
- **entity_field** - Entity-specific field configurations
- **entity** - Complete entity configurations
- **mixin** - Reusable configuration sets
- **template** - Configuration templates
- **ui_config** - UI-specific settings

### Merge Logic
1. **Dependencies merged first** (lowest priority)
2. **self_data applied** (middle priority)
3. **override_data applied last** (highest priority)

## Scripts Documentation

### Core Generators

#### `generate-entity-configs.cjs`
Generates JSON configurations from database schema:
- Extracts column metadata
- Detects foreign key relationships
- Maps PostgreSQL types to UI components
- Generates validation rules

#### `analyze-fields.cjs`
Analyzes fields across all entities:
- Identifies common fields (>3% occurrence)
- Generates base fields and properties
- Builds semantic inheritance tree
- Creates parent-child relationships
- Special handling for breeder_id, kennel_id

#### `generate-sql-inserts.cjs`
Creates SQL for app_config table:
- **Preserves existing override_data**
- Generates property records
- Creates base field configs
- Produces entity field overrides
- Supports --breed-only flag for testing

### Utility Scripts

#### `check-db.cjs`
Database connection verification and statistics

#### `check-rxdb-sync.cjs`
RxDB synchronization troubleshooting

#### `test-breed-only.cjs`
Test workflow for single entity regeneration

## Key Files

### `/src/components/RegenerateButton.tsx`
UI component for configuration regeneration with override preservation

### `/src/pages/AppConfig.tsx`
Main configuration management interface with tree view

### `/scripts/analyze-fields.cjs`
Field analysis with inheritance patterns (lines 471-553 for special cases)

### `/scripts/generate-sql-inserts.cjs`
SQL generation with override preservation (lines 340-373)

### `/src/data/semantic-tree/`
Generated analysis outputs:
- `field-analysis.json` - Raw field data
- `semantic-tree.json` - Hierarchical structure
- `analysis-report.json` - Statistics
- `app-config-inserts.sql` - Generated SQL

## Special Field Handling

### Manually Added Base Fields
- **breeder_id** - Critical for pet/litter entities
- **kennel_id** - Critical for account relationships

### Excluded Fields
- **pet_breed_id** - Too specific for base field

### Entity-Specific Inheritance
Pet entity special cases:
- `father_breed_id`, `mother_breed_id` → inherit from `breed_id`
- `father_id`, `mother_id` → inherit from `pet_id`
- `owner_kennel_id` → inherits from `kennel_id`
- `country_of_birth_id`, `country_of_stay_id` → inherit from `country_id`

## Session Recovery Guide

When recovering a development session:

1. **Check current state**:
```bash
node scripts/check-db.cjs
```

2. **Review recent changes**:
```bash
git log --oneline -10
git status
```

3. **Key concepts to remember**:
- Single `app_config` table architecture
- Property-based inheritance via deps arrays
- Override preservation during regeneration
- Cascading updates through dependency tree
- System properties protection

4. **Regenerate if needed** (preserves overrides):
```bash
node scripts/analyze-fields.cjs
echo "y" | node scripts/generate-sql-inserts.cjs
```

## Future Enhancements

### Planned Features
- [ ] Windmill integration for automated regeneration
- [ ] Visual configuration builder
- [ ] Field override system at config level
- [ ] Universal store implementation
- [ ] Component registry development
- [ ] Configuration marketplace

### Integration Options
- **Windmill**: Automated script execution
- **Express Backend**: API for regeneration
- **Supabase Edge Functions**: Serverless execution
- **Electron**: Desktop application

## Troubleshooting

### RxDB Sync Issues
```bash
node scripts/check-rxdb-sync.cjs
```
Common fix: Update NULL arrays to `[]`

### Missing Foreign Keys
- Ensure RPC functions exist
- Check field naming (*_id pattern)

### Override Data Lost
- Check `generate-sql-inserts.cjs` fetches existing records
- Verify merge order: deps → self → override

## Contributing

1. Always preserve override_data during regeneration
2. Document special field relationships
3. Update SCRIPTS.md for new scripts
4. Test with breed entity first
5. Maintain semantic inheritance patterns

## Version History

- **5.0.0** (Sept 11, 2025): Enhanced field inheritance with override preservation
- **4.2.0** (Sept 6, 2025): Platform vision & grouping configs
- **4.0.0** (Sept 4, 2025): Hierarchical configuration architecture
- **3.0.0** (Sept 3, 2025): UI standardization & template cloning
- **2.0.0** (Aug 31, 2025): Override data preservation
- **1.0.0** (Aug 2025): Initial property-based system

---
*For detailed architecture documentation, see `/docs/PROPERTY_BASED_CONFIG_ARCHITECTURE.md`*
*For scripts documentation, see `/apps/config-admin/SCRIPTS.md`*