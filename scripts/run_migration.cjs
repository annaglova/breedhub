const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

async function main() {
  console.log('Running migration: Add entity field to achievement...\n');

  // Step 1: Check if column already exists
  const { data: checkData, error: checkError } = await supabase
    .from('achievement')
    .select('entity')
    .limit(1);

  if (!checkError) {
    console.log('Column "entity" already exists. Updating values...');
  } else {
    console.log('Need to add column via Supabase Dashboard SQL Editor.');
    console.log('\nRun this SQL in Supabase Dashboard -> SQL Editor:\n');
    console.log(`
-- Add entity column
ALTER TABLE achievement ADD COLUMN IF NOT EXISTS entity VARCHAR(50);

-- Create index
CREATE INDEX IF NOT EXISTS idx_achievement_entity ON achievement(entity);
    `);
  }

  // Step 2: Update entity values
  const { data: updateData, error: updateError } = await supabase
    .from('achievement')
    .update({ entity: 'breed' })
    .eq('category_id', '2353e82d-2dc7-48e2-a88d-916fa49ce3d1')
    .select();

  if (updateError) {
    console.error('Update error:', updateError);
    return;
  }

  console.log(`Updated ${updateData?.length || 0} records with entity = 'breed'`);

  // Verify
  const { data: verifyData, error: verifyError } = await supabase
    .from('achievement')
    .select('id, name, entity, category_id')
    .order('position');

  if (verifyError) {
    console.error('Verify error:', verifyError);
    return;
  }

  console.log('\nVerification - all achievements:');
  console.log(JSON.stringify(verifyData, null, 2));
}

main();
