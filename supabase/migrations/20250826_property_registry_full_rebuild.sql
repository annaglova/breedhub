-- Full rebuild of property_registry with proper UUID type
-- This will drop and recreate all related tables

BEGIN;

-- 1. Drop dependent foreign keys first
ALTER TABLE IF EXISTS public.property_usage 
DROP CONSTRAINT IF EXISTS property_usage_property_uid_fkey;

-- 2. Backup existing property_registry data
CREATE TEMP TABLE property_registry_backup AS 
SELECT * FROM public.property_registry;

-- 3. Drop and recreate property_registry with proper structure
DROP TABLE IF EXISTS public.property_registry CASCADE;

CREATE TABLE public.property_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    data_type VARCHAR(100),
    caption VARCHAR(255) NOT NULL,
    component INTEGER NOT NULL,
    config JSONB DEFAULT '{}',
    mixins TEXT[] DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    category VARCHAR(100),
    version INTEGER DEFAULT 1,
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    deleted BOOLEAN DEFAULT false
);

-- 4. Create indexes for performance
CREATE INDEX idx_property_registry_name ON public.property_registry(name);
CREATE INDEX idx_property_registry_type ON public.property_registry(type);
CREATE INDEX idx_property_registry_category ON public.property_registry(category);
CREATE INDEX idx_property_registry_is_system ON public.property_registry(is_system);
CREATE INDEX idx_property_registry_deleted ON public.property_registry(deleted);

-- 5. Add unique constraint on name for non-deleted records
CREATE UNIQUE INDEX idx_property_registry_name_unique 
ON public.property_registry(name) 
WHERE deleted = false;

-- 6. Restore data with proper UUID conversion
INSERT INTO public.property_registry (
    id,
    name,
    type,
    data_type,
    caption,
    component,
    config,
    mixins,
    tags,
    category,
    version,
    is_system,
    created_at,
    updated_at,
    created_by,
    deleted
)
SELECT 
    CASE 
        WHEN id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
        THEN id::UUID
        ELSE gen_random_uuid()
    END as id,
    name,
    type,
    data_type,
    caption,
    component,
    config,
    mixins,
    tags,
    category,
    version,
    is_system,
    created_at,
    updated_at,
    created_by::UUID,
    deleted
FROM property_registry_backup;

-- 7. Drop and recreate property_usage table with proper foreign key
DROP TABLE IF EXISTS public.property_usage CASCADE;

CREATE TABLE public.property_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.property_registry(id) ON DELETE CASCADE,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    usage_context VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for property_usage
CREATE INDEX idx_property_usage_property_id ON public.property_usage(property_id);
CREATE INDEX idx_property_usage_entity_type ON public.property_usage(entity_type);
CREATE INDEX idx_property_usage_entity_id ON public.property_usage(entity_id);

-- 8. Add RLS policies if needed
ALTER TABLE public.property_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_usage ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies (adjust as needed)
CREATE POLICY "Enable read access for all users" ON public.property_registry
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON public.property_registry
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Enable update for authenticated users" ON public.property_registry
    FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Enable delete for authenticated users" ON public.property_registry
    FOR DELETE USING (auth.uid() IS NOT NULL AND is_system = false);

-- 9. Add comments
COMMENT ON TABLE public.property_registry IS 'Registry of reusable property definitions';
COMMENT ON COLUMN public.property_registry.id IS 'Unique UUID identifier';
COMMENT ON COLUMN public.property_registry.name IS 'Unique property name (code-friendly)';
COMMENT ON COLUMN public.property_registry.caption IS 'Human-readable property label';
COMMENT ON COLUMN public.property_registry.component IS 'UI component type for rendering';
COMMENT ON COLUMN public.property_registry.is_system IS 'Whether this is a system property (protected from deletion)';

-- 10. Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER property_registry_updated_at
    BEFORE UPDATE ON public.property_registry
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER property_usage_updated_at
    BEFORE UPDATE ON public.property_usage
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

COMMIT;

-- After successful migration, the backup can be dropped:
-- DROP TABLE property_registry_backup;