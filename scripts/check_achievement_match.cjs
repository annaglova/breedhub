const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

const BREED_ID = '490d146e-7584-4ce2-97dc-eeceb7278921';

async function main() {
  // Get achievement dictionary (breed only)
  const { data: dictData, error: dictError } = await supabase
    .from('achievement')
    .select('id, name, int_value, position, entity')
    .eq('entity', 'breed')
    .order('position');

  console.log('=== Achievement Dictionary (entity=breed) ===');
  console.log(JSON.stringify(dictData, null, 2));

  // Get achievement_in_breed for this breed
  const { data: breedData, error: breedError } = await supabase
    .from('achievement_in_breed')
    .select('*')
    .eq('breed_id', BREED_ID);

  console.log('\n=== Achievement_in_breed for breed', BREED_ID, '===');
  console.log(JSON.stringify(breedData, null, 2));

  // Check matches
  console.log('\n=== Matching check ===');
  const dictIds = new Set(dictData?.map(d => d.id) || []);
  const breedAchIds = breedData?.map(b => b.achievement_id) || [];

  breedAchIds.forEach(achId => {
    const match = dictIds.has(achId);
    console.log(`achievement_id ${achId}: ${match ? 'MATCH' : 'NO MATCH in dictionary'}`);
  });
}

main();
