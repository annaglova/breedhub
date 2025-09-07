# BreedHub Scripts Documentation

This document provides comprehensive documentation for all scripts in the BreedHub project. These scripts are primarily used for database management, field analysis, and configuration generation.

## Overview

The BreedHub project contains several utility scripts located in:
- `/apps/config-admin/scripts/` - Main administrative and database management scripts
- `/scripts/` - Project-wide utility scripts

## Script Categories

### 🔍 Analysis & Discovery Scripts
- [analyze-fields.cjs](#analyze-fieldscjs) - Comprehensive field analysis and semantic tree generation

### 🗄️ Database Management Scripts
- [check-db.cjs](#check-dbcjs) - Database health check and verification
- [clean-and-insert.cjs](#clean-and-insertcjs) - Clean and rebuild database records
- [clean-old-data.cjs](#clean-old-datacjs) - Remove old/stale data
- [cleanup-and-reinsert.cjs](#cleanup-and-reinsertcjs) - Complete cleanup and data regeneration
- [delete-defaults.cjs](#delete-defaultscjs) - Remove default field property records
- [fix-all-null-fields.cjs](#fix-all-null-fieldscjs) - Fix all NULL values in database
- [fix-null-tags.cjs](#fix-null-tagscjs) - Fix NULL tags specifically
- [reseed-fields.js](#reseed-fieldsjs) - Reseed field and property data

### ⚙️ Configuration Generation Scripts
- [generate-entity-configs.cjs](#generate-entity-configscjs) - Generate entity configurations from database schema
- [generate-sql-inserts.cjs](#generate-sql-insertscjs) - Generate SQL insert statements from semantic tree

### 🧪 Testing & Development Scripts
- [test-breed-only.cjs](#test-breed-onlycjs) - Test with breed table only

### 🔧 Update & Maintenance Scripts
- [update-system-to-base.cjs](#update-system-to-basecjs) - Update category values from 'system' to 'base'
- [update-tags.cjs](#update-tagscjs) - Update tags for entity fields

---

## Detailed Script Documentation

### analyze-fields.cjs

**Location:** `/apps/config-admin/scripts/analyze-fields.cjs`

**Purpose:** Analyzes all entity configurations and generates a semantic tree structure for field properties, base fields, and entity-specific fields.

**What it does:**
1. Loads all entity JSON configurations from `/src/data/entities/`
2. Analyzes field frequency and patterns across entities
3. Identifies common properties and variations
4. Generates base field definitions for frequently used fields
5. Creates atomic field properties (required, system, unique, etc.)
6. Builds a complete semantic tree structure
7. Outputs analysis files for further processing

**When to use:**
- After making changes to entity configurations
- Before running SQL generation scripts
- When you need to understand field usage patterns
- To rebuild the semantic tree structure

**How to run:**
```bash
cd /apps/config-admin
node scripts/analyze-fields.cjs
```

**Dependencies:**
- Entity configuration files in `/src/data/entities/`
- `entity-categories.json` file

**Output files:**
- `/src/data/semantic-tree/field-analysis.json` - Field usage analysis
- `/src/data/semantic-tree/semantic-tree.json` - Complete semantic tree
- `/src/data/semantic-tree/analysis-report.json` - Summary report

**Database Impact:** None (read-only analysis)

---

### check-db.cjs

**Location:** `/apps/config-admin/scripts/check-db.cjs`

**Purpose:** Performs health checks on the `app_config` table to verify data integrity.

**What it does:**
1. Connects to Supabase database
2. Counts records by type
3. Shows sample record structure
4. Verifies data completeness

**When to use:**
- Before major database operations
- To verify database state
- For troubleshooting data issues
- After running insert/update scripts

**How to run:**
```bash
cd /apps/config-admin
node scripts/check-db.cjs
```

**Dependencies:**
- Supabase environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_SERVICE_KEY)
- `.env` file with database credentials

**Database Impact:** Read-only (no modifications)

---

### clean-and-insert.cjs

**Location:** `/apps/config-admin/scripts/clean-and-insert.cjs`

**Purpose:** Cleans specific record types and rebuilds them with fresh data.

**What it does:**
1. Deletes records with types: `field_property`, `field`, `entity_field`
2. Automatically runs `generate-sql-inserts.cjs` to rebuild data
3. Provides automated cleanup and regeneration workflow

**When to use:**
- When you need to refresh configuration data
- After making changes to field definitions
- To fix corrupted configuration records

**How to run:**
```bash
cd /apps/config-admin
node scripts/clean-and-insert.cjs
```

**Dependencies:**
- Supabase database connection
- `generate-sql-inserts.cjs` script

**Database Impact:** 
- **DESTRUCTIVE**: Deletes field-related configuration records
- Rebuilds data automatically

---

### clean-old-data.cjs

**Location:** `/apps/config-admin/scripts/clean-old-data.cjs`

**Purpose:** Removes old/stale records from specific types without rebuilding.

**What it does:**
1. Deletes records with types: `field_property`, `field`, `entity_field`
2. Provides confirmation of deletion
3. Does not rebuild data (manual cleanup only)

**When to use:**
- When you want to clean data without immediate rebuilding
- For manual cleanup operations
- Before running custom data generation

**How to run:**
```bash
cd /apps/config-admin
node scripts/clean-old-data.cjs
```

**Dependencies:**
- Supabase database connection

**Database Impact:**
- **DESTRUCTIVE**: Deletes specified record types
- No automatic rebuild

---

### cleanup-and-reinsert.cjs

**Location:** `/apps/config-admin/scripts/cleanup-and-reinsert.cjs`

**Purpose:** Complete cleanup and regeneration of semantic tree data with automated workflow.

**What it does:**
1. Deletes all semantic tree related records
2. Automatically runs `generate-sql-inserts.cjs` with auto-confirmation
3. Provides seamless cleanup and rebuild process

**When to use:**
- For complete refresh of configuration system
- After major changes to field analysis logic
- When corruption is suspected in configuration data

**How to run:**
```bash
cd /apps/config-admin
node scripts/cleanup-and-reinsert.cjs
```

**Dependencies:**
- Supabase database connection
- `generate-sql-inserts.cjs` script

**Database Impact:**
- **DESTRUCTIVE**: Complete removal of semantic tree data
- Automatic rebuild with fresh data

---

### delete-defaults.cjs

**Location:** `/apps/config-admin/scripts/delete-defaults.cjs`

**Purpose:** Removes the `field_property_defaults` record from the database.

**What it does:**
1. Deletes the specific record with ID `field_property_defaults`
2. Shows total remaining records
3. Provides confirmation of deletion

**When to use:**
- When removing default property configurations
- As part of configuration cleanup process
- When defaults are no longer needed

**How to run:**
```bash
cd /apps/config-admin
node scripts/delete-defaults.cjs
```

**Dependencies:**
- Supabase database connection

**Database Impact:**
- **DESTRUCTIVE**: Removes specific default configuration record

---

### fix-all-null-fields.cjs

**Location:** `/apps/config-admin/scripts/fix-all-null-fields.cjs`

**Purpose:** Comprehensive fix for all NULL values in the `app_config` table.

**What it does:**
1. Fixes NULL `tags` by setting to empty array `[]`
2. Fixes NULL `deps` by setting to empty array `[]`
3. Fixes NULL `self_data` by setting to empty object `{}`
4. Fixes NULL `override_data` by setting to empty object `{}`
5. Fixes NULL `data` by setting to empty object `{}`
6. Fixes NULL `version` by setting to `1`
7. Fixes NULL `deleted` by setting to `false`
8. Provides verification of fixes

**When to use:**
- After data imports that may contain NULL values
- When database constraints require non-NULL values
- For data integrity maintenance
- Before running scripts that expect non-NULL values

**How to run:**
```bash
cd /apps/config-admin
node scripts/fix-all-null-fields.cjs
```

**Dependencies:**
- Supabase database connection

**Database Impact:**
- **MODIFIES**: Updates NULL values with appropriate defaults
- Safe operation (no data deletion)

---

### fix-null-tags.cjs

**Location:** `/apps/config-admin/scripts/fix-null-tags.cjs`

**Purpose:** Specifically fixes NULL values in the `tags` column.

**What it does:**
1. Identifies all records with NULL tags
2. Updates them to have empty array `[]` instead
3. Verifies the fix was successful

**When to use:**
- When only tags column has NULL issues
- As a targeted fix for tag-related problems
- Before running scripts that require array tags

**How to run:**
```bash
cd /apps/config-admin
node scripts/fix-null-tags.cjs
```

**Dependencies:**
- Supabase database connection

**Database Impact:**
- **MODIFIES**: Updates NULL tags to empty arrays
- Safe operation (no data deletion)

---

### generate-entity-configs.cjs

**Location:** `/apps/config-admin/scripts/generate-entity-configs.cjs`

**Purpose:** Generates entity configuration files from database schema introspection.

**What it does:**
1. Connects to database and introspects table schemas
2. Maps PostgreSQL types to application field types
3. Generates UI component mappings
4. Creates validation rules based on constraints
5. Produces complete entity configuration files
6. Organizes configs by category (main, lookup, child)

**When to use:**
- When adding new tables to the system
- After database schema changes
- To regenerate entity configurations from scratch
- For initial system setup

**How to run:**
```bash
cd /apps/config-admin
node scripts/generate-entity-configs.cjs
```

**Dependencies:**
- Supabase database connection with schema introspection
- `resourcesList.json` for entity categorization

**Output:**
- Entity configuration files in `/src/data/entities/`
- Organized by category (main/lookup/child)

**Database Impact:** Read-only (schema introspection only)

---

### generate-sql-inserts.cjs

**Location:** `/apps/config-admin/scripts/generate-sql-inserts.cjs`

**Purpose:** Generates SQL insert statements from semantic tree and optionally inserts them into the database.

**What it does:**
1. Loads semantic tree data
2. Computes merged data from dependencies
3. Generates SQL INSERT statements
4. Optionally inserts directly to Supabase
5. Creates field properties, base fields, and entity fields
6. Handles dependency resolution and data merging

**When to use:**
- After running field analysis
- To populate configuration system with generated data
- When rebuilding the entire configuration structure
- For deployment to new environments

**How to run:**
```bash
cd /apps/config-admin
node scripts/generate-sql-inserts.cjs
# Follow interactive prompts to confirm database insertion
```

**Dependencies:**
- Semantic tree file (`semantic-tree.json`)
- Supabase database connection (optional)

**Output:**
- SQL file: `/src/data/semantic-tree/app-config-inserts.sql`
- Optional direct database insertion

**Database Impact:**
- **CREATES**: Inserts configuration records if confirmed
- Creates field properties, base fields, and entity fields

---

### test-breed-only.cjs

**Location:** `/apps/config-admin/scripts/test-breed-only.cjs`

**Purpose:** Testing script that works with only the 'breed' entity for development and testing purposes.

**What it does:**
1. Clears ALL data from `app_config` table
2. Runs field analysis for breed entity only
3. Generates and inserts breed-specific configuration data
4. Provides isolated testing environment

**When to use:**
- During development and testing
- When you need to test with minimal data
- For debugging configuration generation logic
- When working on breed-specific features

**How to run:**
```bash
cd /apps/config-admin
node scripts/test-breed-only.cjs
```

**Dependencies:**
- Supabase database connection
- `analyze-fields.cjs` script
- `generate-sql-inserts.cjs` script

**Database Impact:**
- **DESTRUCTIVE**: Deletes ALL app_config records
- Rebuilds with breed-only test data

**⚠️ Warning:** This script deletes ALL configuration data. Use only in development.

---

### update-system-to-base.cjs

**Location:** `/apps/config-admin/scripts/update-system-to-base.cjs`

**Purpose:** Updates category values from 'system' to 'base' across all records.

**What it does:**
1. Finds all records with `category = 'system'`
2. Updates them to `category = 'base'`
3. Updates timestamps
4. Provides verification of changes

**When to use:**
- When refactoring category naming conventions
- After system architecture changes
- For data migration purposes

**How to run:**
```bash
cd /apps/config-admin
node scripts/update-system-to-base.cjs
```

**Dependencies:**
- Supabase database connection

**Database Impact:**
- **MODIFIES**: Updates category values
- Safe operation (no data deletion)

---

### update-tags.cjs

**Location:** `/apps/config-admin/scripts/update-tags.cjs`

**Purpose:** Updates tags for entity fields from semantic tree data.

**What it does:**
1. Loads semantic tree configuration
2. Updates tags for all entity fields in batches
3. Processes entity fields with their associated tags
4. Provides progress feedback and error handling

**When to use:**
- After regenerating semantic tree with new tags
- When tag structure has been modified
- To sync database tags with current semantic tree

**How to run:**
```bash
cd /apps/config-admin
node scripts/update-tags.cjs
```

**Dependencies:**
- Semantic tree file (`semantic-tree.json`)
- Supabase database connection

**Database Impact:**
- **MODIFIES**: Updates tags for entity field records
- Safe operation (no data deletion)

---

### reseed-fields.js

**Location:** `/scripts/reseed-fields.js`

**Purpose:** Reseeds field and property data from generated SQL file.

**What it does:**
1. Reads SQL insert file
2. Parses INSERT statements into JSON records
3. Deletes existing properties and fields
4. Inserts parsed records in batches
5. Provides complete data reseeding functionality

**When to use:**
- For deploying configuration data to new environments
- When you need to restore data from SQL backup
- As part of deployment automation
- For data migration between environments

**How to run:**
```bash
cd /scripts
node reseed-fields.js
```

**Dependencies:**
- SQL insert file at `/apps/config-admin/src/data/semantic-tree/app-config-inserts.sql`
- Supabase database connection

**Database Impact:**
- **DESTRUCTIVE**: Deletes and recreates field configuration data
- Complete rebuild from SQL file

**⚠️ Warning:** Contains hardcoded Supabase credentials. Use only in development.

---

## Typical Workflows

### 1. Complete Configuration Rebuild
```bash
# 1. Analyze all entity fields and generate semantic tree
node scripts/analyze-fields.cjs

# 2. Generate and insert configuration data
node scripts/generate-sql-inserts.cjs

# 3. Verify the database
node scripts/check-db.cjs
```

### 2. Clean and Refresh Data
```bash
# Option A: Clean and auto-rebuild
node scripts/cleanup-and-reinsert.cjs

# Option B: Manual clean and rebuild
node scripts/clean-old-data.cjs
node scripts/generate-sql-inserts.cjs
```

### 3. Fix Data Issues
```bash
# Fix all NULL values
node scripts/fix-all-null-fields.cjs

# Update categories if needed
node scripts/update-system-to-base.cjs

# Update tags from semantic tree
node scripts/update-tags.cjs
```

### 4. Development Testing
```bash
# Test with breed table only
node scripts/test-breed-only.cjs

# Verify results
node scripts/check-db.cjs
```

## Environment Requirements

All scripts require:
- Node.js environment
- `.env` file with Supabase credentials:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_SERVICE_KEY`
- Supabase database access

## Safety Considerations

**⚠️ Destructive Scripts:** 
- `clean-and-insert.cjs`
- `clean-old-data.cjs`
- `cleanup-and-reinsert.cjs`
- `delete-defaults.cjs`
- `test-breed-only.cjs`
- `reseed-fields.js`

Always backup your database before running destructive scripts in production.

**🔧 Safe Scripts:**
- `analyze-fields.cjs`
- `check-db.cjs`
- `fix-all-null-fields.cjs`
- `fix-null-tags.cjs`
- `generate-entity-configs.cjs`
- `update-system-to-base.cjs`
- `update-tags.cjs`

## Common Issues & Solutions

1. **Missing semantic tree**: Run `analyze-fields.cjs` first
2. **NULL value errors**: Run `fix-all-null-fields.cjs`
3. **Database connection issues**: Check `.env` file and Supabase credentials
4. **Entity configuration missing**: Run `generate-entity-configs.cjs`
5. **Stale data**: Use `cleanup-and-reinsert.cjs` for complete refresh

---

*Last updated: 2025-09-07*