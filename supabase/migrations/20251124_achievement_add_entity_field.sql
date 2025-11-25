-- Migration: Add entity field to achievement table
-- Purpose: Replace category_id FK with simple text field for entity type filtering
-- Date: 2024-11-24

-- Step 1: Add entity column
ALTER TABLE achievement ADD COLUMN IF NOT EXISTS entity VARCHAR(50);

-- Step 2: Populate entity based on existing category_id values
-- category_id = '2353e82d-2dc7-48e2-a88d-916fa49ce3d1' -> breed support levels
-- category_id = 'f0d04e2e-2559-4366-a757-0f38e8d73b14' -> unknown (keeping as NULL for now)
UPDATE achievement
SET entity = 'breed'
WHERE category_id = '2353e82d-2dc7-48e2-a88d-916fa49ce3d1';

-- Step 3: Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_achievement_entity ON achievement(entity);

-- Step 4: Add comment for documentation
COMMENT ON COLUMN achievement.entity IS 'Entity type this achievement belongs to (breed, kennel, pet, etc.)';

-- Note: category_id column is kept for now, can be dropped later after verification
-- To drop: ALTER TABLE achievement DROP COLUMN category_id;
