-- Add soft delete field for RxDB synchronization
-- Only this field is really needed for basic sync

-- Add deleted flag (RxDB uses _deleted internally)
ALTER TABLE public.property_registry 
ADD COLUMN IF NOT EXISTS deleted BOOLEAN DEFAULT false;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_property_registry_deleted ON public.property_registry(deleted);

-- Update existing records to have deleted flag
UPDATE public.property_registry 
SET deleted = false
WHERE deleted IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.property_registry.deleted IS 'Soft delete flag for RxDB synchronization (maps to _deleted in RxDB)';