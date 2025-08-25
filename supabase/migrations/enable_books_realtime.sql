-- Enable Realtime for books table
-- This allows WebSocket subscriptions to table changes

-- First, drop the existing publication if it exists
DROP PUBLICATION IF EXISTS supabase_realtime CASCADE;

-- Create publication for realtime
CREATE PUBLICATION supabase_realtime;

-- Add books table to the publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.books;

-- Enable replica identity for the table (required for realtime)
ALTER TABLE public.books REPLICA IDENTITY FULL;

-- Optional: You can also enable realtime through Supabase Dashboard
-- Go to Database > Replication > Select 'books' table