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

async function cleanAndReinsert() {
  console.log('Cleaning app_config table...');
  
  // Delete all existing property, field, and entity_field records
  const { error: deleteError } = await supabase
    .from('app_config')
    .delete()
    .in('type', ['property', 'field', 'entity_field']);
  
  if (deleteError) {
    console.error('Error deleting old records:', deleteError);
    process.exit(1);
  }
  
  console.log('✅ Old records deleted successfully');
  
  // Now run the generate-sql-inserts script
  console.log('\n🔄 Regenerating and inserting clean data...\n');
  
  const { spawn } = require('child_process');
  const child = spawn('node', [path.join(__dirname, 'generate-sql-inserts.cjs')], {
    stdio: 'pipe'
  });
  
  // Auto-answer 'y' to the prompt
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
    if (code === 0) {
      console.log('\n✅ Clean data successfully inserted!');
    } else {
      console.error('\n❌ Error during insertion, exit code:', code);
    }
  });
}

cleanAndReinsert().catch(console.error);