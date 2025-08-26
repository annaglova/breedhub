-- Keep id as TEXT but enforce UUID format
-- This won't break foreign key constraints

-- Add a CHECK constraint to ensure id is a valid UUID format (if not already exists)
ALTER TABLE public.property_registry 
DROP CONSTRAINT IF EXISTS property_registry_id_uuid_format;

ALTER TABLE public.property_registry 
ADD CONSTRAINT property_registry_id_uuid_format 
CHECK (id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');

-- Update any existing non-UUID ids to UUID format
UPDATE public.property_registry 
SET id = gen_random_uuid()::text
WHERE NOT (id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');

-- Add unique constraint if not exists
ALTER TABLE public.property_registry 
DROP CONSTRAINT IF EXISTS property_registry_id_unique;

ALTER TABLE public.property_registry 
ADD CONSTRAINT property_registry_id_unique UNIQUE (id);

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_property_registry_id ON public.property_registry(id);

-- Add comment
COMMENT ON COLUMN public.property_registry.id IS 'Unique identifier (UUID stored as text for compatibility)';