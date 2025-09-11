# Config Admin Scripts Documentation

## Overview

This directory contains scripts for managing the property-based configuration system for BreedHub. These scripts handle entity configuration generation, field analysis, and database synchronization.

## Core Scripts

### 1. `generate-entity-configs.cjs`
**Purpose**: Generates JSON configuration files for all database entities by analyzing table schemas.

**Features**:
- Extracts column information using RPC functions
- Detects foreign key relationships
- Maps PostgreSQL types to UI components
- Generates validation rules
- Creates proper display names and placeholders
- Sorts fields (user fields first, system fields last)

**Usage**:
```bash
node scripts/generate-entity-configs.cjs
```

**Output**: 
- Entity JSON files in `src/data/entities/{main|lookup|child}/`
- Generation summary in `src/data/entities/generation-summary.json`

---

### 2. `generate-entity-configs-with-rls.cjs`
**Purpose**: Enhanced version that integrates RLS (Row Level Security) policies to automatically generate permissions.

**Features**:
- All features from base generator
- Reads RLS policies via `get_table_policies` RPC
- Extracts permissions from policy expressions
- Supports column-level permission detection
- Falls back to default permissions when RLS is disabled

**Usage**:
```bash
# Standard run
node scripts/generate-entity-configs-with-rls.cjs

# With RLS debugging
DEBUG_RLS=true node scripts/generate-entity-configs-with-rls.cjs
```

**Note**: Use this when RLS policies are configured in your database.

---

### 3. `analyze-fields.cjs`
**Purpose**: Analyzes all entity fields to identify patterns and generate semantic tree for property-based configuration.

**Features**:
- Identifies common fields across entities
- Generates base fields (>3% occurrence threshold, ~8+ occurrences)
- Creates field properties for inheritance
- Builds semantic relationships
- Produces detailed analysis reports
- **Special field inheritance handling**:
  - `breeder_id` - manually added as base field, inherits from `contact_id`
  - `kennel_id` - manually added as base field, inherits from `account_id`
  - Fields inheriting from `contact_id`: `owner_id`, `created_by`, `updated_by`, `breeder_id`, `handler_id`, `primary_contact_id`
  - Fields inheriting from `account_id`: `provider_id`, `kennel_id`
  - Special entity-level inheritance:
    - `pet_field_father_breed_id`, `pet_field_mother_breed_id` → inherit from `field_breed_id`
    - `pet_field_father_id`, `pet_field_mother_id`, `litter_field_father_id`, `litter_field_mother_id` → inherit from `field_pet_id`
    - `pet_field_owner_kennel_id` → inherits from `field_kennel_id`
    - `pet_field_country_of_birth_id`, `pet_field_country_of_stay_id` → inherit from `field_country_id`

**Excluded Fields**:
- `pet_breed_id` - too specific to be a base field

**Usage**:
```bash
node scripts/analyze-fields.cjs
```

**Output**:
- `src/data/semantic-tree/field-analysis.json` - Raw field data
- `src/data/semantic-tree/semantic-tree.json` - Hierarchical structure with inheritance
- `src/data/semantic-tree/analysis-report.json` - Statistics and patterns

---

### 4. `generate-sql-inserts.cjs`
**Purpose**: Generates SQL INSERT statements for app_config table based on semantic analysis.

**Features**:
- Creates property records (shared attributes)
- Generates base field configurations
- Produces entity-specific field overrides
- Supports selective generation with flags
- **PRESERVES existing override_data** when regenerating (since commit a7f6c64)
  - Fetches existing records before insertion
  - Maintains user's manual customizations
  - Merges configurations: dependencies → self_data → override_data (highest priority)

**Usage**:
```bash
# Generate all SQL inserts
node scripts/generate-sql-inserts.cjs

# Generate only for breed entity
node scripts/generate-sql-inserts.cjs --breed-only

# Auto-confirm database insert
echo "y" | node scripts/generate-sql-inserts.cjs
```

**Output**: 
- `src/data/semantic-tree/app-config-inserts.sql`
- Direct insertion to Supabase when confirmed
- Preserves existing override_data during upsert

---

### 5. `test-breed-only.cjs`
**Purpose**: Test workflow that cleans database and regenerates configs only for breed entity.

**Workflow**:
1. Cleans all data from app_config
2. Runs field analysis
3. Generates SQL inserts for breed only
4. Auto-inserts to database

**Usage**:
```bash
node scripts/test-breed-only.cjs
```

---

## Utility Scripts

### 6. `check-db.cjs`
**Purpose**: Verifies database connection and displays app_config statistics.

**Usage**:
```bash
node scripts/check-db.cjs
```

---

### 7. `check-rxdb-sync.cjs`
**Purpose**: Monitors RxDB synchronization status and troubleshoots sync issues.

**Features**:
- Shows documents in Supabase
- Checks for NULL values that break sync
- Provides fix suggestions

**Usage**:
```bash
node scripts/check-rxdb-sync.cjs
```

---

### 8. `test-rls-permissions.cjs`
**Purpose**: Tests RLS policy extraction and permission generation.

**Features**:
- Shows current RLS status for tables
- Demonstrates permission derivation
- Provides example SQL for RLS setup

**Usage**:
```bash
node scripts/test-rls-permissions.cjs
```

---

## Data Files

### `entity-categories.json`
Contains categorized lists of database tables:
- `MAIN_RESOURCES`: Primary business entities
- `LOOKUP_RESOURCES`: Reference/lookup tables  
- `CHILD_RESOURCES`: Relationship/junction tables

---

## UI Integration

### Regeneration Button
The Config Admin interface includes a "Regenerate Configs" button in the header that:
- Located next to "Config Admin" title
- Shows instructions for manual script execution
- Preserves override_data during regeneration
- Reloads the page after completion

**Component**: `src/components/RegenerateButton.tsx`

**Note**: Currently requires manual script execution as Vite cannot directly run Node.js scripts. Consider integrating with:
- Windmill for automated execution
- Express backend server
- Supabase Edge Functions

---

## Typical Workflows

### Full Regeneration (Preserves Overrides)
```bash
# 1. Generate entity configs from database
node scripts/generate-entity-configs.cjs

# 2. Analyze fields for patterns
node scripts/analyze-fields.cjs

# 3. Generate and insert to database (preserves override_data)
node scripts/generate-sql-inserts.cjs
```

### Test with Single Entity
```bash
# Quick test with breed entity only
node scripts/test-breed-only.cjs
```

### Enable RLS Support
```bash
# When RLS policies are configured
node scripts/generate-entity-configs-with-rls.cjs
```

### Troubleshooting Sync Issues
```bash
# Check database status
node scripts/check-db.cjs

# Check RxDB sync issues
node scripts/check-rxdb-sync.cjs
```

---

## Environment Variables

Required in `.env`:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_SERVICE_KEY=your_service_key
```

Optional:
```env
DEBUG_RLS=true  # Enable RLS parsing debug output
```

---

## Directory Structure

```
scripts/
├── Core Generators
│   ├── generate-entity-configs.cjs         # Base config generator
│   ├── generate-entity-configs-with-rls.cjs # RLS-aware generator
│   ├── analyze-fields.cjs                  # Field pattern analyzer
│   └── generate-sql-inserts.cjs           # SQL insert generator
│
├── Test Scripts
│   ├── test-breed-only.cjs                # Breed-only test workflow
│   └── test-rls-permissions.cjs           # RLS testing
│
├── Utilities
│   ├── check-db.cjs                       # Database status
│   └── check-rxdb-sync.cjs                # Sync troubleshooting
│
└── Data
    └── entity-categories.json              # Table categorization
```

---

## Notes

1. **Order Matters**: Always run `generate-entity-configs.cjs` before `analyze-fields.cjs`
2. **Clean Before Test**: Use test scripts to ensure clean state
3. **RLS Integration**: Switch to `generate-entity-configs-with-rls.cjs` when implementing Row Level Security
4. **Foreign Keys**: The generator automatically detects FK relationships and adds proper metadata
5. **Permissions**: Default permissions are `read: ["*"]` and `write: ["admin", "editor"]` for regular fields

---

## Troubleshooting

### RxDB Sync Issues
- Run `check-rxdb-sync.cjs` to identify NULL values
- Common issue: NULL in array fields (tags, deps)
- Solution: Update to empty arrays `[]`

### Missing Foreign Key Detection
- Ensure RPC functions exist: `get_table_columns`, `get_foreign_keys_from`
- Check field naming: FK fields should end with `_id`

### RLS Permissions Not Working
- Verify RLS is enabled: `ALTER TABLE table_name ENABLE ROW LEVEL SECURITY`
- Check `get_table_policies` RPC function exists
- Use `DEBUG_RLS=true` for detailed output

---

*Last updated: 2025-09-11*