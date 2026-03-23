-- Add deleted column to all tables that don't have it
-- Ensures consistent soft-delete across all entities and child tables
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT t.table_name
    FROM information_schema.tables t
    WHERE t.table_schema = 'public'
      AND t.table_type = 'BASE TABLE'
      AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns c
        WHERE c.table_name = t.table_name
          AND c.table_schema = 'public'
          AND c.column_name = 'deleted'
      )
  LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN deleted boolean DEFAULT false', tbl);
  END LOOP;
END $$;
