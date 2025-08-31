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

async function updateSystemToBase() {
  console.log('Updating category from "system" to "base"...');
  
  // First, check how many records have 'system' category
  const { data: systemRecords, error: checkError } = await supabase
    .from('app_config')
    .select('id')
    .eq('category', 'system');
  
  if (checkError) {
    console.error('Error checking system records:', checkError);
    return;
  }
  
  console.log(`Found ${systemRecords.length} records with category="system"`);
  
  if (systemRecords.length > 0) {
    // Update all records with category='system' to category='base'
    const { error: updateError } = await supabase
      .from('app_config')
      .update({ 
        category: 'base',
        updated_at: new Date().toISOString()
      })
      .eq('category', 'system');
    
    if (updateError) {
      console.error('Error updating category:', updateError);
      return;
    }
    
    console.log('✅ Successfully updated all "system" categories to "base"');
  } else {
    console.log('No records with category="system" found');
  }
  
  // Verify the update
  console.log('\n=== Verification ===');
  
  const { data: baseRecords } = await supabase
    .from('app_config')
    .select('id')
    .eq('category', 'base');
  
  const { data: systemCheck } = await supabase
    .from('app_config')
    .select('id')
    .eq('category', 'system');
  
  console.log(`Records with category="base": ${baseRecords?.length || 0}`);
  console.log(`Records with category="system": ${systemCheck?.length || 0}`);
  
  // Show sample of base fields
  const { data: sampleBase } = await supabase
    .from('app_config')
    .select('id, type, category')
    .eq('category', 'base')
    .limit(5);
  
  console.log('\nSample base fields:');
  sampleBase?.forEach(f => {
    console.log(`  ${f.id} (${f.type}) -> ${f.category}`);
  });
}

// Run the update
updateSystemToBase().catch(console.error);