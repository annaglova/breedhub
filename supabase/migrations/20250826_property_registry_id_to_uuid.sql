-- Migration: Change property_registry.id from text to UUID
-- Date: 2025-08-26

-- First, create a temporary column for UUID
ALTER TABLE public.property_registry 
ADD COLUMN id_uuid UUID;

-- Generate UUIDs for existing records (if they don't already have valid UUIDs)
UPDATE public.property_registry 
SET id_uuid = 
  CASE 
    WHEN id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
    THEN id::UUID
    ELSE gen_random_uuid()
  END;

-- Drop the old primary key constraint
ALTER TABLE public.property_registry 
DROP CONSTRAINT IF EXISTS property_registry_pkey;

-- Drop the old id column
ALTER TABLE public.property_registry 
DROP COLUMN id;

-- Rename the new column to id
ALTER TABLE public.property_registry 
RENAME COLUMN id_uuid TO id;

-- Add NOT NULL constraint
ALTER TABLE public.property_registry 
ALTER COLUMN id SET NOT NULL;

-- Set id as primary key
ALTER TABLE public.property_registry 
ADD PRIMARY KEY (id);

-- Add unique constraint to ensure id uniqueness
ALTER TABLE public.property_registry 
ADD CONSTRAINT property_registry_id_unique UNIQUE (id);

-- Add comment to document the field
COMMENT ON COLUMN public.property_registry.id IS 'Unique identifier for the property (UUID v4)';

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_property_registry_id ON public.property_registry(id);

-- Update RLS policies if needed (assuming you have RLS enabled)
-- If you have any foreign keys referencing this table, you'll need to update them too