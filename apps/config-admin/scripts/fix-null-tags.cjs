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

async function fixNullTags() {
  console.log('Fixing null tags in app_config...');
  
  // Find all records with null tags
  const { data: records, error: fetchError } = await supabase
    .from('app_config')
    .select('id')
    .is('tags', null);
  
  if (fetchError) {
    console.error('Error fetching records:', fetchError);
    return;
  }
  
  console.log(`Found ${records.length} records with null tags`);
  
  if (records.length === 0) {
    console.log('No records to fix');
    return;
  }
  
  // Update all records to have empty array for tags
  const { error: updateError } = await supabase
    .from('app_config')
    .update({ tags: [] })
    .is('tags', null);
  
  if (updateError) {
    console.error('Error updating records:', updateError);
    return;
  }
  
  console.log('✅ Successfully fixed all null tags');
  
  // Verify the fix
  const { data: remaining, error: verifyError } = await supabase
    .from('app_config')
    .select('id')
    .is('tags', null);
  
  if (verifyError) {
    console.error('Error verifying fix:', verifyError);
    return;
  }
  
  console.log(`Remaining records with null tags: ${remaining.length}`);
}

// Run the fix
fixNullTags().catch(console.error);