const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function main() {
  // Get achievement table data
  const { data, error } = await supabase
    .from('achievement')
    .select('*')
    .order('position');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Achievement records:');
  console.log(JSON.stringify(data, null, 2));
}

main();
