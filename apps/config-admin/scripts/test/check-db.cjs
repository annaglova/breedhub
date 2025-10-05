const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, '../../.env') });
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabase() {
  console.log('Checking app_config table...\n');
  
  // Count by type
  const { data: types, error: typeError } = await supabase
    .from('app_config')
    .select('type')
    .order('type');
  
  if (typeError) {
    console.error('Error:', typeError);
    return;
  }
  
  const typeCounts = types.reduce((acc, row) => {
    acc[row.type] = (acc[row.type] || 0) + 1;
    return acc;
  }, {});
  
  console.log('Records by type:');
  Object.entries(typeCounts).forEach(([type, count]) => {
    console.log(`  ${type}: ${count}`);
  });
  
  console.log(`\nTotal records: ${types.length}`);
  
  // Check a specific record if provided as argument
  const configId = process.argv[2] || 'config_view_1757849574399';
  const { data: sample } = await supabase
    .from('app_config')
    .select('id, type, self_data, override_data, data, deps')
    .eq('id', configId)
    .single();
  
  if (sample) {
    console.log(`\nRecord (${configId}):`);
    console.log('  type:', sample.type);
    console.log('  deps:', sample.deps);
    console.log('  override_data:', JSON.stringify(sample.override_data, null, 2));
    console.log('  self_data:', JSON.stringify(sample.self_data, null, 2));
    console.log('  data:', JSON.stringify(sample.data, null, 2));
  }
}

checkDatabase().catch(console.error);