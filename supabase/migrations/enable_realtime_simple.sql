-- Simple way to enable Realtime for books table
-- This is the modern Supabase way

-- Enable Realtime for the books table
ALTER TABLE public.books REPLICA IDENTITY FULL;

-- Note: You also need to enable Realtime in Supabase Dashboard:
-- 1. Go to Database → Tables
-- 2. Click on 'books' table
-- 3. Toggle "Enable Realtime" switch
-- 
-- OR use Supabase SQL Editor:
-- ALTER PUBLICATION supabase_realtime ADD TABLE books;

-- Check if realtime is enabled (run this query to verify):
-- SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';