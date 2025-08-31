const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, '../.env') });
const { createClient } = require("@supabase/supabase-js");

// Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanupOldData() {
  console.log('Cleaning up old semantic tree data...');
  
  const { data, error } = await supabase
    .from('app_config')
    .delete()
    .in('type', ['field_property', 'field', 'entity_field']);
  
  if (error) {
    console.error('Error deleting old data:', error);
    return false;
  }
  
  console.log('✅ Old data cleaned up');
  return true;
}

async function main() {
  // First cleanup
  const cleaned = await cleanupOldData();
  
  if (cleaned) {
    console.log('\nNow running the insert script...\n');
    // Run the generate script with auto-yes
    require('child_process').execSync('echo "y" | node scripts/generate-sql-inserts.cjs', {
      stdio: 'inherit',
      cwd: path.resolve(__dirname, '..')
    });
  }
}

main().catch(console.error);