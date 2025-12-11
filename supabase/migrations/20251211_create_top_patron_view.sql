-- Migration: Create view for top_patron_in_breed with contact data
-- Purpose: PostgREST doesn't support embedded resources (JOINs) for partitioned tables.
--          This view pre-joins contact data so we can query it as a regular table.
-- Date: 2025-12-11

-- Drop view if exists (for re-running migration)
DROP VIEW IF EXISTS top_patron_in_breed_with_contact;

-- Create view with embedded contact data as JSONB
CREATE VIEW top_patron_in_breed_with_contact AS
SELECT
  p.id,
  p.breed_id,
  p.contact_id,
  p.placement,
  p.rating,
  p.period_start,
  p.period_end,
  p.created_at,
  p.updated_at,
  -- Embed contact data as JSONB object (matches PostgREST embedded resource format)
  CASE
    WHEN c.id IS NOT NULL THEN
      jsonb_build_object(
        'id', c.id,
        'name', c.name,
        'slug', c.slug,
        'avatar_url', c.avatar_url
      )
    ELSE NULL
  END as contact
FROM top_patron_in_breed p
LEFT JOIN contact c ON c.id = p.contact_id;

-- Add comment for documentation
COMMENT ON VIEW top_patron_in_breed_with_contact IS
  'View that joins top_patron_in_breed with contact data. Required because PostgREST cannot do embedded resources on partitioned tables.';

-- Grant access (same as base table)
GRANT SELECT ON top_patron_in_breed_with_contact TO anon;
GRANT SELECT ON top_patron_in_breed_with_contact TO authenticated;
