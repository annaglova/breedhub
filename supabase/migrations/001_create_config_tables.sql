-- ============================================================================
-- Local Migration: Create Dynamic Configuration Tables (без Edge Functions)
-- Date: 2024-01-14
-- Description: Версія для локального Supabase з Windmill integration
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "http"; -- Для виклику Windmill

-- ============================================================================
-- 1. Main Configuration Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.app_config (
    -- Identifiers
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    
    -- Hierarchy
    parent_id UUID REFERENCES app_config(id) ON DELETE CASCADE,
    scope TEXT NOT NULL CHECK (scope IN ('global', 'workspace', 'space', 'view', 'user')),
    scope_id TEXT,
    
    -- Configuration data
    base_config JSONB DEFAULT '{}' NOT NULL,
    overrides JSONB DEFAULT '{}' NOT NULL,
    computed_config JSONB DEFAULT '{}' NOT NULL,
    
    -- Metadata
    version INTEGER DEFAULT 1 NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_by UUID,
    
    -- Performance
    cache_ttl INTEGER DEFAULT 3600,
    last_accessed TIMESTAMPTZ,
    access_count INTEGER DEFAULT 0 NOT NULL,
    
    -- Constraints
    CONSTRAINT unique_scope_id UNIQUE(scope, scope_id),
    CONSTRAINT check_scope_id CHECK (
        (scope = 'global' AND scope_id IS NULL) OR
        (scope != 'global' AND scope_id IS NOT NULL)
    )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_app_config_scope ON app_config(scope, scope_id);
CREATE INDEX IF NOT EXISTS idx_app_config_parent ON app_config(parent_id);
CREATE INDEX IF NOT EXISTS idx_app_config_key ON app_config(key);
CREATE INDEX IF NOT EXISTS idx_app_config_active ON app_config(is_active) WHERE is_active = true;

-- ============================================================================
-- 2. Configuration Templates Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.config_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    entity_type TEXT NOT NULL,
    
    -- Template structure
    schema JSONB NOT NULL,
    default_config JSONB NOT NULL DEFAULT '{}',
    ui_schema JSONB DEFAULT '{}',
    
    -- Permissions
    required_role TEXT[] DEFAULT ARRAY[]::TEXT[],
    
    -- Metadata
    description TEXT,
    category TEXT,
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    is_system BOOLEAN DEFAULT false NOT NULL,
    is_deprecated BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_by UUID,
    
    -- Versioning
    version INTEGER DEFAULT 1 NOT NULL,
    previous_version UUID REFERENCES config_templates(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_config_templates_entity_type ON config_templates(entity_type);
CREATE INDEX IF NOT EXISTS idx_config_templates_category ON config_templates(category);

-- ============================================================================
-- 3. Configuration Dependencies Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.config_dependencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_id UUID NOT NULL REFERENCES app_config(id) ON DELETE CASCADE,
    depends_on_id UUID NOT NULL REFERENCES app_config(id) ON DELETE RESTRICT,
    dependency_type TEXT DEFAULT 'inherit' CHECK (dependency_type IN ('inherit', 'reference', 'compute')),
    priority INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    CONSTRAINT unique_dependency UNIQUE(config_id, depends_on_id),
    CONSTRAINT no_self_dependency CHECK (config_id != depends_on_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_config_deps_config ON config_dependencies(config_id);
CREATE INDEX IF NOT EXISTS idx_config_deps_depends ON config_dependencies(depends_on_id);

-- ============================================================================
-- 4. Windmill Integration Function
-- ============================================================================

-- Функція для виклику Windmill config_merge
-- ВАЖЛИВО: Замініть WINDMILL_TOKEN на ваш реальний токен!
CREATE OR REPLACE FUNCTION call_windmill_merge(
    deps_data JSONB,
    self_data JSONB,
    override_data JSONB
) RETURNS JSONB AS $$
DECLARE
    result JSONB;
    response record;
BEGIN
    -- Викликаємо Windmill script
    -- Замініть URL та токен на ваші!
    SELECT status, content::jsonb as data INTO response
    FROM http_post(
        'http://dev.dogarray.com:8000/api/w/breedhub/jobs/run/f/common/json_merge',
        jsonb_build_object(
            'deps_data', deps_data,
            'self_data', self_data,
            'override_data', override_data
        )::text,
        'application/json',
        jsonb_build_object(
            'Authorization', 'Bearer YOUR_WINDMILL_TOKEN'
        )::text
    );
    
    IF response.status = 200 THEN
        result := response.data;
    ELSE
        -- Fallback to simple merge if Windmill is unavailable
        result := COALESCE(deps_data, '{}'::jsonb) || 
                 COALESCE(self_data, '{}'::jsonb) || 
                 COALESCE(override_data, '{}'::jsonb);
    END IF;
    
    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        -- При помилці використовуємо простий merge
        RETURN COALESCE(deps_data, '{}'::jsonb) || 
               COALESCE(self_data, '{}'::jsonb) || 
               COALESCE(override_data, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 5. Simple Local Merge Function (без Windmill)
-- ============================================================================

CREATE OR REPLACE FUNCTION simple_merge_configs(
    parent_config JSONB,
    deps_configs JSONB[],
    base_config JSONB,
    override_config JSONB
) RETURNS JSONB AS $$
DECLARE
    result JSONB := '{}';
    dep_config JSONB;
BEGIN
    -- Merge parent
    IF parent_config IS NOT NULL THEN
        result := parent_config;
    END IF;
    
    -- Merge dependencies
    IF deps_configs IS NOT NULL THEN
        FOREACH dep_config IN ARRAY deps_configs
        LOOP
            result := result || dep_config;
        END LOOP;
    END IF;
    
    -- Merge base and overrides
    result := result || COALESCE(base_config, '{}') || COALESCE(override_config, '{}');
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. Compute Merged Config Function
-- ============================================================================

CREATE OR REPLACE FUNCTION compute_merged_config(config_id UUID)
RETURNS JSONB AS $$
DECLARE
    result JSONB := '{}';
    parent_config JSONB;
    dep_configs JSONB[];
    base JSONB;
    override JSONB;
    current_config RECORD;
BEGIN
    -- Get current config
    SELECT * INTO current_config
    FROM app_config
    WHERE id = config_id;
    
    IF NOT FOUND THEN
        RETURN '{}'::JSONB;
    END IF;
    
    -- Get parent config if exists
    IF current_config.parent_id IS NOT NULL THEN
        SELECT computed_config INTO parent_config
        FROM app_config
        WHERE id = current_config.parent_id;
    END IF;
    
    -- Get dependency configs
    SELECT array_agg(ac.computed_config ORDER BY cd.priority)
    INTO dep_configs
    FROM config_dependencies cd
    JOIN app_config ac ON ac.id = cd.depends_on_id
    WHERE cd.config_id = config_id;
    
    -- Use simple merge (або Windmill якщо доступний)
    result := simple_merge_configs(
        parent_config,
        dep_configs,
        current_config.base_config,
        current_config.overrides
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. Triggers
-- ============================================================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_app_config_timestamp
    BEFORE UPDATE ON app_config
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Compute merged config on change
CREATE OR REPLACE FUNCTION update_computed_config()
RETURNS TRIGGER AS $$
BEGIN
    NEW.computed_config := compute_merged_config(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Спочатку видаляємо старий тригер якщо існує
DROP TRIGGER IF EXISTS compute_config_on_change ON app_config;

-- Створюємо новий
CREATE TRIGGER compute_config_on_change
    BEFORE INSERT OR UPDATE ON app_config
    FOR EACH ROW
    EXECUTE FUNCTION update_computed_config();

-- ============================================================================
-- 8. Initial Data
-- ============================================================================

-- Insert global config
INSERT INTO app_config (key, scope, base_config) 
VALUES (
    'global',
    'global',
    jsonb_build_object(
        'app_name', 'BreedHub',
        'version', '1.0.0',
        'features', jsonb_build_object(
            'multistore', true,
            'dynamic_schemas', true,
            'realtime', true,
            'windmill_integration', true
        ),
        'defaults', jsonb_build_object(
            'theme', 'light',
            'language', 'en',
            'timezone', 'UTC'
        ),
        'api', jsonb_build_object(
            'supabase_url', 'http://dev.dogarray.com:8020',
            'windmill_url', 'http://dev.dogarray.com:8000'
        )
    )
) ON CONFLICT (key) DO NOTHING;

-- Insert default templates
INSERT INTO config_templates (name, entity_type, schema, default_config, is_system)
VALUES 
(
    'Workspace Template',
    'workspace',
    jsonb_build_object(
        'type', 'object',
        'properties', jsonb_build_object(
            'name', jsonb_build_object('type', 'string'),
            'settings', jsonb_build_object('type', 'object')
        ),
        'required', jsonb_build_array('name')
    ),
    jsonb_build_object(
        'settings', jsonb_build_object(
            'theme', 'light',
            'notifications', true
        )
    ),
    true
),
(
    'Space Template', 
    'space',
    jsonb_build_object(
        'type', 'object',
        'properties', jsonb_build_object(
            'collection', jsonb_build_object(
                'type', 'string',
                'enum', jsonb_build_array('breeds', 'pets', 'kennels', 'contacts')
            )
        ),
        'required', jsonb_build_array('collection')
    ),
    '{}',
    true
),
(
    'Dynamic Entity Template',
    'dynamic_entity',
    jsonb_build_object(
        'type', 'object',
        'properties', jsonb_build_object(
            'fields', jsonb_build_object('type', 'array'),
            'permissions', jsonb_build_object('type', 'object'),
            'ui', jsonb_build_object('type', 'object')
        )
    ),
    jsonb_build_object(
        'fields', jsonb_build_array(),
        'permissions', jsonb_build_object(
            'create', jsonb_build_array('owner'),
            'read', jsonb_build_array('owner', 'viewer'),
            'update', jsonb_build_array('owner'),
            'delete', jsonb_build_array('owner')
        )
    ),
    true
)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE app_config IS 'Hierarchical configuration storage for BreedHub (Local version with Windmill)';
COMMENT ON FUNCTION call_windmill_merge IS 'Calls Windmill json_merge script (requires token configuration)';
COMMENT ON FUNCTION simple_merge_configs IS 'Local fallback for config merging without external dependencies';