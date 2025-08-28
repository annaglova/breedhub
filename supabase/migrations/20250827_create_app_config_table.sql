-- ============================================================================
-- Migration: Create unified app_config table for all configuration types
-- Date: 2025-08-27
-- Description: 
--   Creates a single table for storing all configuration types (fields, entities,
--   mixins, templates, etc.) with properties stored inside JSONB fields.
--   Merge logic is handled in the application store layer, not database triggers.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. Create app_config table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.app_config (
  -- Primary identifier (e.g., 'field_name', 'entity_Dog', 'mixin_sortable')
  id TEXT PRIMARY KEY,
  
  -- Configuration type
  type TEXT NOT NULL CHECK (type IN (
    'field',      -- Field definitions (formerly properties)
    'entity',     -- Entity schemas (Dog, Cat, Breed, etc.)
    'mixin',      -- Reusable mixins (sortable, searchable, etc.)
    'feature',    -- Feature configurations
    'template',   -- Form/UI templates
    'ui_config'   -- UI-specific configurations
  )),
  
  -- Configuration data with field properties stored inside JSONB
  self_data JSONB DEFAULT '{}' NOT NULL,      -- Own configuration with properties
  override_data JSONB DEFAULT '{}' NOT NULL,   -- Local property overrides
  data JSONB DEFAULT '{}' NOT NULL,           -- Computed result (merged in store)
  
  -- Dependencies (parent configs for inheritance)
  deps TEXT[] DEFAULT '{}' NOT NULL,
  
  -- Metadata for UI display and organization
  caption TEXT,                    -- Human-readable description
  category TEXT,                   -- Grouping category
  tags TEXT[] DEFAULT '{}' NOT NULL, -- Search/filter tags
  
  -- Version control
  version INTEGER DEFAULT 1 NOT NULL,
  
  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by TEXT,
  updated_by TEXT,
  
  -- Soft delete support
  deleted BOOLEAN DEFAULT false NOT NULL,
  deleted_at TIMESTAMPTZ
);

-- ============================================================================
-- 2. Create indexes for performance
-- ============================================================================

-- Type index for filtering by configuration type
CREATE INDEX idx_app_config_type ON public.app_config(type);

-- Category index for grouping
CREATE INDEX idx_app_config_category ON public.app_config(category);

-- GIN index for tag-based search
CREATE INDEX idx_app_config_tags ON public.app_config USING GIN(tags);

-- GIN index for dependency tracking
CREATE INDEX idx_app_config_deps ON public.app_config USING GIN(deps);

-- Deleted flag index for filtering active records
CREATE INDEX idx_app_config_deleted ON public.app_config(deleted);

-- Version index for version management
CREATE INDEX idx_app_config_version ON public.app_config(version);

-- Composite index for type + deleted for efficient queries
CREATE INDEX idx_app_config_type_deleted ON public.app_config(type, deleted);

-- Unique constraint ensuring only one active record per ID
CREATE UNIQUE INDEX idx_app_config_id_active 
ON public.app_config(id) 
WHERE deleted = false;

-- ============================================================================
-- 3. Create updated_at trigger
-- ============================================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_app_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function before updates
CREATE TRIGGER app_config_updated_at
  BEFORE UPDATE ON public.app_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_app_config_updated_at();

-- ============================================================================
-- 4. Add comments for documentation
-- ============================================================================

COMMENT ON TABLE public.app_config IS 
'Unified configuration table storing all configuration types (fields, entities, mixins, templates).
All field properties are stored within JSONB fields. Merge logic is handled by the application store.';

COMMENT ON COLUMN public.app_config.id IS 
'Unique identifier using naming convention: type_name (e.g., field_breed_name, entity_Dog)';

COMMENT ON COLUMN public.app_config.type IS 
'Configuration type: field, entity, mixin, feature, template, or ui_config';

COMMENT ON COLUMN public.app_config.self_data IS 
'Own configuration data including all field properties (required, validation, etc.)';

COMMENT ON COLUMN public.app_config.override_data IS 
'Local overrides for inherited properties';

COMMENT ON COLUMN public.app_config.data IS 
'Final computed configuration after merging deps + self_data + override_data (computed in store)';

COMMENT ON COLUMN public.app_config.deps IS 
'Array of parent configuration IDs for inheritance';

-- ============================================================================
-- 5. Migrate existing property_registry data (if exists)
-- ============================================================================

-- Check if property_registry table exists and migrate data
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'property_registry'
  ) THEN
    -- Migrate property definitions to app_config as 'field' type
    INSERT INTO public.app_config (
      id,
      type,
      caption,
      category,
      tags,
      version,
      created_at,
      updated_at,
      created_by,
      deleted,
      self_data,
      data
    )
    SELECT
      'field_' || name as id,
      'field' as type,
      caption,
      category,
      tags,
      version,
      created_at,
      updated_at,
      created_by,
      deleted,
      jsonb_build_object(
        'name', name,
        'fieldType', type,
        'component', component,
        'dataType', data_type,
        'config', config,
        'mixins', mixins,
        'isSystem', is_system,
        'required', COALESCE((config->>'isRequired')::boolean, false),
        'validation', COALESCE(config->'validators', '{}'),
        'placeholder', config->>'placeholder',
        'maxLength', (config->>'maxLength')::integer,
        'minLength', (config->>'minLength')::integer
      ) as self_data,
      '{}' as data  -- Will be computed by store
    FROM public.property_registry
    WHERE NOT deleted
    ON CONFLICT (id) WHERE deleted = false DO NOTHING;
    
    RAISE NOTICE 'Migrated % records from property_registry to app_config', 
      (SELECT COUNT(*) FROM public.property_registry WHERE NOT deleted);
  END IF;
END
$$;

-- ============================================================================
-- 6. Create RLS policies (disabled by default for admin-only access)
-- ============================================================================

-- RLS is disabled by default - enable and add policies as needed
ALTER TABLE public.app_config DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 7. Grant permissions
-- ============================================================================

-- Grant permissions to authenticated users (adjust as needed)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_config TO authenticated;
GRANT SELECT ON public.app_config TO anon;

COMMIT;

-- ============================================================================
-- Example data structure for field configuration:
-- {
--   "fieldType": "string",      // Type of the field
--   "component": 10,            // UI component for rendering
--   "required": true,           // Property: is required
--   "maxLength": 255,           // Property: maximum length
--   "placeholder": "Enter name",// Property: placeholder text
--   "validation": {             // Property: validation rules
--     "pattern": "^[a-zA-Z]+$"
--   },
--   "permissions": {            // Property: access control
--     "read": ["*"],
--     "write": ["admin"]
--   },
--   "sortOrder": 10,           // Property: order in UI
--   "isSystem": false          // Property: system field flag
-- }
-- ============================================================================