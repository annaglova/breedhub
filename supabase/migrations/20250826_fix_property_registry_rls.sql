-- Fix RLS policies to work with anon key

BEGIN;

-- Drop existing policies
DROP POLICY IF EXISTS "Enable read access for all users" ON public.property_registry;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.property_registry;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.property_registry;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.property_registry;

-- Disable RLS for now (for development)
-- In production, you would want proper authentication
ALTER TABLE public.property_registry DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_usage DISABLE ROW LEVEL SECURITY;

-- Alternative: Create permissive policies for development
-- Uncomment these if you want to keep RLS enabled but allow all operations

/*
-- Allow all operations for everyone (development only!)
CREATE POLICY "Allow all for development" ON public.property_registry
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for development" ON public.property_usage
    FOR ALL USING (true) WITH CHECK (true);
*/

-- For production, you would use policies like:
/*
CREATE POLICY "Public read access" ON public.property_registry
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert" ON public.property_registry
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update non-system" ON public.property_registry
    FOR UPDATE USING (auth.role() = 'authenticated' AND is_system = false);

CREATE POLICY "Authenticated users can delete non-system" ON public.property_registry
    FOR DELETE USING (auth.role() = 'authenticated' AND is_system = false);
*/

COMMIT;