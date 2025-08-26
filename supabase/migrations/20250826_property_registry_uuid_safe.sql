-- Safe migration to convert property_registry.id to UUID
-- This version preserves existing data

BEGIN;

-- 1. Create backup of current data
CREATE TABLE IF NOT EXISTS property_registry_backup AS 
SELECT * FROM public.property_registry;

-- 2. Delete all records from property_registry
DELETE FROM public.property_registry;

-- 3. Alter the id column type to UUID
ALTER TABLE public.property_registry 
ALTER COLUMN id TYPE UUID USING (
  CASE 
    WHEN id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
    THEN id::UUID
    ELSE gen_random_uuid()
  END
);

-- 4. Ensure id is NOT NULL and PRIMARY KEY
ALTER TABLE public.property_registry 
ALTER COLUMN id SET NOT NULL;

-- Check if primary key exists and drop if needed
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'property_registry_pkey' 
    AND conrelid = 'public.property_registry'::regclass
  ) THEN
    ALTER TABLE public.property_registry DROP CONSTRAINT property_registry_pkey;
  END IF;
END $$;

-- Add primary key
ALTER TABLE public.property_registry 
ADD CONSTRAINT property_registry_pkey PRIMARY KEY (id);

-- 5. Re-insert data from backup with proper UUIDs
INSERT INTO public.property_registry 
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
  created_by,
  deleted
FROM property_registry_backup;

-- 6. Add index for performance
CREATE INDEX IF NOT EXISTS idx_property_registry_id ON public.property_registry(id);
CREATE INDEX IF NOT EXISTS idx_property_registry_name ON public.property_registry(name);
CREATE INDEX IF NOT EXISTS idx_property_registry_type ON public.property_registry(type);

-- 7. Add comment
COMMENT ON COLUMN public.property_registry.id IS 'Unique UUID identifier for the property';

COMMIT;

-- Note: You can drop the backup table later if everything is working:
-- DROP TABLE property_registry_backup;