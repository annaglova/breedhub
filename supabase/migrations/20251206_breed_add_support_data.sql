-- Migration: Add support_data JSONB field to breed table
-- Purpose: Separate support level info from achievements JSONB
-- Date: 2025-12-06

-- Step 1: Add support_data JSONB column
ALTER TABLE breed ADD COLUMN IF NOT EXISTS support_data JSONB;

-- Step 2: Populate support_data from existing achievements.support_level
-- Structure: { "label": "Zero support level", "progress_percent": 0 }
UPDATE breed
SET support_data = jsonb_build_object(
  'label', COALESCE(achievements->>'support_level', 'Zero support level'),
  'progress_percent', COALESCE((measurements->>'achievement_progress')::int, 0)
)
WHERE support_data IS NULL;

-- Step 3: Remove support_level from achievements JSONB
UPDATE breed
SET achievements = achievements - 'support_level'
WHERE achievements ? 'support_level';

-- Step 4: Add comment for documentation
COMMENT ON COLUMN breed.support_data IS 'Support level data: { label: string, progress_percent: number }';

-- Note: existing support_level (numeric) column is kept for sorting
