const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, '../../../../.env') });
const { createClient } = require("@supabase/supabase-js");

// Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanupAllData() {
  console.log('⚠️  WARNING: Cleaning up TEST data from app_config...');
  console.log('   Preserving: app, workspace, space, page, view, sort, template configs');
  
  // Delete ONLY generated test data, preserve app structure
  const { data, error } = await supabase
    .from('app_config')
    .delete()
    .in('type', ['property', 'field', 'entity_field']); // Only delete test data types
  
  if (error) {
    console.error('Error deleting all data:', error);
    return false;
  }
  
  // Verify deletion
  const { count, error: countError } = await supabase
    .from('app_config')
    .select('*', { count: 'exact', head: true });
  
  if (countError) {
    console.error('Error counting records:', countError);
  } else {
    console.log(`✅ All data cleaned. Records remaining: ${count || 0}`);
  }
  
  return true;
}

async function main() {
  // First cleanup ALL data
  const cleaned = await cleanupAllData();
  
  if (cleaned) {
    console.log('\nRegenerating analyzer for breed only...\n');
    
    // Run analyzer to generate breed-only data
    require('child_process').execSync('node scripts/analyze-fields.cjs', {
      stdio: 'inherit',
      cwd: path.resolve(__dirname, '..')
    });
    
    console.log('\nInserting test data (properties + base fields + breed fields)...\n');
    
    // Run insert script with breed-only flag and auto-yes
    require('child_process').execSync('echo "y" | node scripts/generate-sql-inserts.cjs --breed-only', {
      stdio: 'inherit',
      cwd: path.resolve(__dirname, '..')
    });
  }
}

main().catch(console.error);