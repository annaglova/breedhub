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

async function cleanOldData() {
  console.log('Cleaning old data from app_config...');
  
  // Delete all field_property, field, and entity_field records
  const typesToDelete = ['field_property', 'field', 'entity_field'];
  
  for (const type of typesToDelete) {
    const { data, error } = await supabase
      .from('app_config')
      .delete()
      .eq('type', type);
    
    if (error) {
      console.error(`Error deleting ${type} records:`, error);
    } else {
      console.log(`✅ Deleted ${type} records`);
    }
  }
  
  console.log('Old data cleaned successfully');
}

// Run the cleanup
cleanOldData().catch(console.error);