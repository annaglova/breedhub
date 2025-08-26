-- Rename uid column to id in property_registry table
-- This makes it consistent with other tables that use 'id' as primary key

-- First check if uid column exists and id doesn't
DO $$
BEGIN
  -- Check if we need to rename uid to id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'property_registry' 
    AND column_name = 'uid'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'property_registry' 
    AND column_name = 'id'
  ) THEN
    -- Rename the column
    ALTER TABLE public.property_registry 
    RENAME COLUMN uid TO id;
    
    RAISE NOTICE 'Column renamed from uid to id';
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'property_registry' 
    AND column_name = 'id'
  ) THEN
    RAISE NOTICE 'Column id already exists, no changes needed';
  ELSE
    RAISE NOTICE 'Neither uid nor id column exists, check table structure';
  END IF;
END $$;

-- Update any policies that might reference uid to use id instead
-- This is safe to run even if policies don't exist
DO $$
BEGIN
  -- Update RLS policies if they exist
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'property_registry'
  ) THEN
    -- Drop and recreate policies with correct column name
    DROP POLICY IF EXISTS "Enable read access for all users" ON public.property_registry;
    CREATE POLICY "Enable read access for all users" 
    ON public.property_registry FOR SELECT 
    USING (true);
    
    DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.property_registry;
    CREATE POLICY "Enable insert for authenticated users only" 
    ON public.property_registry FOR INSERT 
    WITH CHECK (true);
    
    DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.property_registry;
    CREATE POLICY "Enable update for authenticated users only" 
    ON public.property_registry FOR UPDATE 
    USING (true)
    WITH CHECK (true);
    
    DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.property_registry;
    CREATE POLICY "Enable delete for authenticated users only" 
    ON public.property_registry FOR DELETE 
    USING (true);
  END IF;
END $$;

-- Add comment documenting the change
COMMENT ON COLUMN public.property_registry.id IS 'Primary key - renamed from uid for consistency with other tables';