# Config Admin Scripts

## Core Generation Scripts

### `analyze-fields.cjs`
Analyzes entity JSON files and generates semantic tree structure.
- Scans entity directories (main, lookup, child)
- Extracts field metadata and relationships
- Outputs semantic-tree.json

**Usage:** `node analyze-fields.cjs`

### `generate-sql-inserts.cjs` 
Main script for generating SQL inserts for app_config table.
- Uses semantic tree from analyze-fields.cjs
- Generates fields, properties, and entity configurations
- Supports cascade updates via cascading-updates.cjs
- Outputs app-config-inserts.sql

**Usage:** `node generate-sql-inserts.cjs [--breed-only]`

### `cascading-updates.cjs`
Utility module for handling cascade updates in configuration hierarchy.
- Builds dependency graphs
- Performs topological sorting
- Handles cascade updates when properties change

### `generate-entity-configs.cjs`
Generates entity configurations from resourcesList.json.
- Creates default field configurations
- Sets up entity metadata

**Usage:** `node generate-entity-configs.cjs`

## Testing & Validation Scripts

### `check-cascade.cjs`
Tests cascade update functionality between properties and fields.
- Verifies that property changes propagate to dependent fields

**Usage:** `node check-cascade.cjs`

### `check-field.cjs`
Checks specific field configuration and its dependencies.
- Verifies field data integrity
- Tests property inheritance

**Usage:** `node check-field.cjs`

### `check-properties.cjs`
Validates property configurations in the database.
- Checks for missing or invalid properties
- Verifies property relationships

**Usage:** `node check-properties.cjs`

### `check-db.cjs`
General database connectivity and schema check.

**Usage:** `node check-db.cjs`

### `check-rxdb-sync.cjs`
Tests RxDB synchronization with Supabase.
- Verifies replication setup
- Tests sync functionality

**Usage:** `node check-rxdb-sync.cjs`

## Test Scripts

### `test-breed-only.cjs`
Tests breed-only mode for field generation.

### `test-constraints.cjs`
Tests database constraints and validation rules.

### `test-rls-permissions.cjs`
Tests Row Level Security permissions.

### `test-rxdb-validation.cjs`
Tests RxDB schema validation.

## Utility Scripts

### `clean-and-reinsert.cjs`
Cleans existing data and reinserts fresh configuration.
- Useful for resetting to clean state
- **WARNING:** Deletes existing data

**Usage:** `node clean-and-reinsert.cjs`

## Data Files

### `entity-categories.json`
Mapping of entities to their categories (main, lookup, child).

## Workflow

1. **Analyze Fields:** Run `analyze-fields.cjs` to generate semantic tree
2. **Generate SQL:** Run `generate-sql-inserts.cjs` to create SQL inserts
3. **Apply to Database:** Execute generated SQL in Supabase
4. **Test:** Use check-*.cjs scripts to verify

## Environment Variables

All scripts require `.env` file with:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_SERVICE_KEY=your_service_key
```