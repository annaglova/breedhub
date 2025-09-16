# Config Admin Scripts

## Core Generation Scripts

### `analyze-fields.cjs`
Analyzes entity JSON files and generates semantic tree structure.
- Scans entity directories (main, lookup, child)
- Extracts field metadata and relationships
- Identifies inheritance patterns and base fields
- Implements semantic field hierarchy (contact_id → breeder_id, handler_id, etc.)
- Outputs semantic-tree.json with parent-child relationships

**Usage:** `node analyze-fields.cjs`

**Key Features:**
- Base field detection (>3% occurrence threshold)
- Manual inclusion of critical fields (breeder_id, kennel_id)
- Inheritance pattern recognition for FK relationships
- Semantic tagging with `child_of:{parent}` metadata

### `generate-sql-inserts.cjs` 
Main script for generating SQL inserts for app_config table.
- Uses semantic tree from analyze-fields.cjs
- Generates fields, properties, and entity configurations
- **Smart Merge**: Preserves custom user properties during regeneration
- **Change Detection**: Skips unchanged records (60-80% efficiency gain)
- **Custom Dependencies**: Preserves user-added dependencies automatically
- Supports cascade updates via cascading-updates.cjs
- Outputs app-config-inserts.sql

**Usage:** `node generate-sql-inserts.cjs [--breed-only]`

**Advanced Features:**
- Override data preservation during regeneration
- Deep comparison to detect actual changes
- Custom property merging (generated + user customizations)
- Batch processing for large-scale updates

### `cascading-updates.cjs` & `cascading-updates-v2.cjs`
Utility modules for handling cascade updates in configuration hierarchy.
- **v1**: Basic dependency graph and topological sorting
- **v2**: Enhanced with BatchProcessor integration, 4x performance improvement
- Builds dependency graphs and reverse dependency maps
- Performs topological sorting for correct update order
- Handles cascade updates when properties/fields change
- Automatic change detection before updates
- Performance: 917 records/sec (v2) vs 200 records/sec (v1)

**Usage:** `node cascading-updates-v2.cjs <command> [options]`

**Commands:**
- `update-property <propertyId>`: Update specific property and cascade
- `update-field <fieldId>`: Update specific field and cascade
- `rebuild-all`: Full dependency tree rebuild
- `dry-run`: Preview changes without applying

### `batch-processor.cjs`
High-performance batch processing utility for database operations.
- Intelligent record deduplication
- Configurable batch sizes (default: 500 records)
- Retry logic with exponential backoff
- Rate limiting between batches
- Performance metrics tracking
- Error handling and recovery

**Usage:** Used internally by cascading-updates-v2.cjs

**Features:**
- Deduplication by record ID
- Progress tracking
- Failed batch retry
- Memory-efficient processing

### `rebuild-hierarchy.cjs`
Specialized script for rebuilding hierarchical configuration structures.
- Rebuilds nested structures: fields → page → space → workspace → app
- Proper empty object handling (shows `{}` not missing data)
- Uses parent's deps to find children (not reverse lookup)
- Ensures clean structure without data duplication
- Runs AFTER cascade updates to incorporate all changes

**Usage:** `node rebuild-hierarchy.cjs [--dry-run]`

**Key Features:**
- Hierarchical structure rebuilding
- Empty config handling
- Parent-child relationship maintenance
- Clean data structure enforcement

### `generate-entity-configs.cjs`
Generates entity configurations from resourcesList.json.
- Creates default field configurations
- Sets up entity metadata
- Maintains entity categorization (main, lookup, child)

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