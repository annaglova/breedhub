-- Simplify property_registry table to match books structure
-- Remove auth dependencies and RLS

BEGIN;

-- 1. Drop the foreign key constraint on created_by
ALTER TABLE public.property_registry 
DROP CONSTRAINT IF EXISTS property_registry_created_by_fkey;

-- 2. Change created_by to simple TEXT field (like books table)
ALTER TABLE public.property_registry 
ALTER COLUMN created_by TYPE TEXT;

-- 3. Disable RLS completely (like books table)
ALTER TABLE public.property_registry DISABLE ROW LEVEL SECURITY;

-- 4. Drop all policies
DROP POLICY IF EXISTS "Enable read access for all users" ON public.property_registry;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.property_registry;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.property_registry;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.property_registry;
DROP POLICY IF EXISTS "Allow all for development" ON public.property_registry;
DROP POLICY IF EXISTS "Public read access" ON public.property_registry;
DROP POLICY IF EXISTS "Authenticated users can insert" ON public.property_registry;
DROP POLICY IF EXISTS "Authenticated users can update non-system" ON public.property_registry;
DROP POLICY IF EXISTS "Authenticated users can delete non-system" ON public.property_registry;

-- 5. Also disable RLS for property_usage if exists
ALTER TABLE IF EXISTS public.property_usage DISABLE ROW LEVEL SECURITY;

-- Now property_registry is as simple as books table!

COMMIT;