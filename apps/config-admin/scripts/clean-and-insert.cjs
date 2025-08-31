const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, '../.env') });
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanAndInsert() {
  console.log('Cleaning app_config table...');
  
  // Delete all test data
  const { error: deleteError } = await supabase
    .from('app_config')
    .delete()
    .in('type', ['field_property', 'field', 'entity_field']);
  
  if (deleteError) {
    console.error('Error deleting:', deleteError);
    return;
  }
  
  console.log('✅ Table cleaned');
  
  // Now run the insert script
  console.log('\nInserting fresh data...');
  const { spawn } = require('child_process');
  const child = spawn('node', ['scripts/generate-sql-inserts.cjs'], {
    stdio: 'pipe'
  });
  
  // Auto-answer 'y'
  setTimeout(() => {
    child.stdin.write('y\n');
  }, 1000);
  
  child.stdout.on('data', (data) => {
    process.stdout.write(data);
  });
  
  child.stderr.on('data', (data) => {
    process.stderr.write(data);
  });
  
  child.on('close', (code) => {
    console.log(`\nProcess exited with code ${code}`);
  });
}

cleanAndInsert().catch(console.error);