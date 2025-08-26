-- Property Registry Tables for Property-Based Configuration System
-- Version: 1.0.0
-- Date: 2024-08-26

-- ============================================
-- 1. Property Registry Table
-- ============================================
-- Stores all property definitions that can be reused across configurations
CREATE TABLE IF NOT EXISTS public.property_registry (
  uid TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('string', 'number', 'boolean', 'date', 'datetime', 'json', 'array', 'reference')),
  data_type TEXT, -- SQL data type (varchar, integer, jsonb, etc.)
  caption TEXT NOT NULL,
  component INTEGER NOT NULL, -- 0=EntitySelect, 3=DatePicker, 4=Number, 5=Checkbox, 10=TextInput
  
  -- Full configuration stored as JSONB
  config JSONB NOT NULL DEFAULT '{}',
  
  -- Arrays for quick filtering
  mixins TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  
  -- Metadata
  category TEXT,
  version INTEGER DEFAULT 1,
  is_system BOOLEAN DEFAULT false,
  
  -- Timestamps and audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Constraints
  CONSTRAINT valid_component CHECK (component IN (0, 3, 4, 5, 10))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_property_registry_name ON property_registry(name);
CREATE INDEX IF NOT EXISTS idx_property_registry_type ON property_registry(type);
CREATE INDEX IF NOT EXISTS idx_property_registry_category ON property_registry(category);
CREATE INDEX IF NOT EXISTS idx_property_registry_mixins ON property_registry USING GIN(mixins);
CREATE INDEX IF NOT EXISTS idx_property_registry_tags ON property_registry USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_property_registry_is_system ON property_registry(is_system);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_property_registry_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.version = COALESCE(OLD.version, 0) + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER property_registry_updated_at
  BEFORE UPDATE ON property_registry
  FOR EACH ROW
  EXECUTE FUNCTION update_property_registry_updated_at();

-- ============================================
-- 2. Property Usage Tracking Table
-- ============================================
-- Tracks where each property is used and with what overrides
CREATE TABLE IF NOT EXISTS public.property_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_uid TEXT NOT NULL REFERENCES property_registry(uid) ON DELETE CASCADE,
  config_id TEXT NOT NULL, -- References config(id) if exists
  field_name TEXT NOT NULL,
  overrides JSONB DEFAULT '{}', -- Local overrides for this usage
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint to prevent duplicate usage tracking
  CONSTRAINT unique_property_usage UNIQUE (property_uid, config_id, field_name)
);

-- Indexes for usage queries
CREATE INDEX IF NOT EXISTS idx_property_usage_property ON property_usage(property_uid);
CREATE INDEX IF NOT EXISTS idx_property_usage_config ON property_usage(config_id);
CREATE INDEX IF NOT EXISTS idx_property_usage_field ON property_usage(field_name);

-- ============================================
-- 3. Mixin Registry Table
-- ============================================
-- Stores reusable mixins that can be applied to properties
CREATE TABLE IF NOT EXISTS public.mixin_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  
  -- JavaScript/TypeScript function as text that transforms a property
  apply_function TEXT NOT NULL,
  
  -- Additional configuration for the mixin
  config JSONB DEFAULT '{}',
  
  -- Organization
  category TEXT,
  is_system BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for mixin queries
CREATE INDEX IF NOT EXISTS idx_mixin_registry_name ON mixin_registry(name);
CREATE INDEX IF NOT EXISTS idx_mixin_registry_category ON mixin_registry(category);
CREATE INDEX IF NOT EXISTS idx_mixin_registry_is_system ON mixin_registry(is_system);

-- Trigger to update updated_at
CREATE TRIGGER mixin_registry_updated_at
  BEFORE UPDATE ON mixin_registry
  FOR EACH ROW
  EXECUTE FUNCTION update_property_registry_updated_at();

-- ============================================
-- 4. Insert Default System Mixins
-- ============================================
INSERT INTO mixin_registry (name, description, category, is_system, apply_function) VALUES 
('sortable', 'Makes the property sortable in lists', 'feature', true, 
'return { ...property, features: { ...property.features, sortable: true, sortPriority: 0 } }'),

('searchable', 'Adds the property to search fields', 'feature', true,
'return { ...property, features: { ...property.features, searchable: true, searchWeight: 1.0 } }'),

('indexed', 'Creates a database index for the property', 'performance', true,
'return { ...property, features: { ...property.features, indexed: true } }'),

('required', 'Makes the property required', 'validation', true,
'return { ...property, isRequired: true, validators: [...(property.validators || []), { type: "required", message: "This field is required" }] }'),

('auditable', 'Tracks changes to the property', 'feature', true,
'return { ...property, features: { ...property.features, trackChanges: true, auditLog: true } }'),

('encrypted', 'Encrypts the property value in storage', 'security', true,
'return { ...property, features: { ...property.features, encrypted: true, encryptionMethod: "AES-256" } }'),

('cached', 'Enables caching for the property', 'performance', true,
'return { ...property, features: { ...property.features, cached: true, cacheTTL: 3600 } }'),

('readonly', 'Makes the property read-only', 'ui', true,
'return { ...property, features: { ...property.features, readonly: true }, component: property.component }'),

('hidden', 'Hides the property from UI', 'ui', true,
'return { ...property, features: { ...property.features, hidden: true, showInList: false, showInDetail: false } }'),

('translatable', 'Makes the property support multiple languages', 'i18n', true,
'return { ...property, features: { ...property.features, translatable: true, languages: ["en", "uk", "es"] } }')
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  apply_function = EXCLUDED.apply_function,
  updated_at = NOW();

-- ============================================
-- 5. Insert Common Property Templates
-- ============================================
INSERT INTO property_registry (uid, name, type, caption, component, category, is_system, config) VALUES
-- Common ID fields
('sys-id', 'id', 'string', 'ID', 10, 'system', true, 
'{"maxLength": 100, "pattern": "^[a-zA-Z0-9_-]+$", "mixins": ["required", "indexed"]}'),

('sys-uid', 'uid', 'string', 'UID', 10, 'system', true,
'{"maxLength": 36, "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", "mixins": ["required", "indexed"]}'),

-- Common text fields
('sys-name', 'name', 'string', 'Name', 10, 'system', true,
'{"maxLength": 255, "mixins": ["required", "searchable", "sortable"]}'),

('sys-description', 'description', 'string', 'Description', 10, 'system', true,
'{"maxLength": 1000, "component": 10, "mixins": ["searchable"]}'),

('sys-url', 'url', 'string', 'URL', 10, 'system', true,
'{"pattern": "^https?://", "mixins": ["indexed"]}'),

-- Common date fields
('sys-created-at', 'created_at', 'datetime', 'Created At', 3, 'system', true,
'{"mixins": ["sortable", "indexed", "readonly"]}'),

('sys-updated-at', 'updated_at', 'datetime', 'Updated At', 3, 'system', true,
'{"mixins": ["sortable", "indexed", "readonly"]}'),

-- Common reference fields
('sys-created-by', 'created_by', 'reference', 'Created By', 0, 'system', true,
'{"entitySchemaName": "users", "displayField": "name", "mixins": ["readonly"]}'),

('sys-updated-by', 'updated_by', 'reference', 'Updated By', 0, 'system', true,
'{"entitySchemaName": "users", "displayField": "name", "mixins": ["readonly"]}'),

-- Common boolean fields
('sys-is-active', 'is_active', 'boolean', 'Is Active', 5, 'system', true,
'{"default": true, "mixins": ["indexed"]}'),

('sys-is-deleted', 'is_deleted', 'boolean', 'Is Deleted', 5, 'system', true,
'{"default": false, "mixins": ["indexed", "hidden"]}')
ON CONFLICT (uid) DO NOTHING;

-- ============================================
-- 6. Helper Functions
-- ============================================

-- Function to clone a property with new name
CREATE OR REPLACE FUNCTION clone_property(
  source_uid TEXT,
  new_name TEXT,
  new_caption TEXT DEFAULT NULL
) RETURNS TEXT AS $$
DECLARE
  new_uid TEXT;
  source_record RECORD;
BEGIN
  -- Generate new UID
  new_uid := gen_random_uuid()::TEXT;
  
  -- Get source property
  SELECT * INTO source_record FROM property_registry WHERE uid = source_uid;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Source property % not found', source_uid;
  END IF;
  
  -- Insert cloned property
  INSERT INTO property_registry (
    uid, name, type, data_type, caption, component, config,
    mixins, tags, category, is_system
  )
  VALUES (
    new_uid,
    new_name,
    source_record.type,
    source_record.data_type,
    COALESCE(new_caption, source_record.caption),
    source_record.component,
    source_record.config,
    source_record.mixins,
    source_record.tags,
    source_record.category,
    false -- Cloned properties are not system
  );
  
  RETURN new_uid;
END;
$$ LANGUAGE plpgsql;

-- Function to get all properties with specific mixin
CREATE OR REPLACE FUNCTION get_properties_with_mixin(mixin_name TEXT)
RETURNS TABLE (
  uid TEXT,
  name TEXT,
  type TEXT,
  caption TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.uid,
    p.name,
    p.type,
    p.caption
  FROM property_registry p
  WHERE mixin_name = ANY(p.mixins)
  ORDER BY p.name;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 7. Row Level Security (RLS)
-- ============================================

-- Enable RLS on tables
ALTER TABLE property_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE mixin_registry ENABLE ROW LEVEL SECURITY;

-- Policies for property_registry
CREATE POLICY "Properties are viewable by everyone" 
  ON property_registry FOR SELECT 
  USING (true);

CREATE POLICY "System properties are read-only"
  ON property_registry FOR ALL
  USING (NOT is_system OR auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Authenticated users can create properties"
  ON property_registry FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND NOT is_system);

CREATE POLICY "Users can update their own properties"
  ON property_registry FOR UPDATE
  USING (created_by = auth.uid() OR auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (created_by = auth.uid() OR auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Users can delete their own properties"
  ON property_registry FOR DELETE
  USING (created_by = auth.uid() AND NOT is_system);

-- Policies for property_usage
CREATE POLICY "Property usage is viewable by everyone"
  ON property_usage FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can track usage"
  ON property_usage FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Policies for mixin_registry
CREATE POLICY "Mixins are viewable by everyone"
  ON mixin_registry FOR SELECT
  USING (true);

CREATE POLICY "Only admins can manage mixins"
  ON mixin_registry FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin');

-- ============================================
-- 8. Comments for documentation
-- ============================================
COMMENT ON TABLE property_registry IS 'Central registry of all reusable property definitions for the property-based configuration system';
COMMENT ON TABLE property_usage IS 'Tracks where properties are used and with what local overrides';
COMMENT ON TABLE mixin_registry IS 'Registry of mixins that can be applied to properties to add features';

COMMENT ON COLUMN property_registry.uid IS 'Unique identifier for the property';
COMMENT ON COLUMN property_registry.name IS 'Unique name of the property (e.g., "created_at", "name")';
COMMENT ON COLUMN property_registry.type IS 'Data type of the property';
COMMENT ON COLUMN property_registry.component IS 'UI component type: 0=EntitySelect, 3=DatePicker, 4=Number, 5=Checkbox, 10=TextInput';
COMMENT ON COLUMN property_registry.mixins IS 'Array of mixin names applied to this property';
COMMENT ON COLUMN property_registry.config IS 'Full configuration including validation, UI settings, etc.';

COMMENT ON COLUMN mixin_registry.apply_function IS 'JavaScript function that transforms a property definition';