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

async function deleteDefaults() {
  console.log('Deleting field_property_defaults...');
  
  const { data, error } = await supabase
    .from('app_config')
    .delete()
    .eq('id', 'field_property_defaults');
  
  if (error) {
    console.error('Error deleting:', error);
  } else {
    console.log('✅ Deleted field_property_defaults');
  }
  
  // Count remaining records
  const { count } = await supabase
    .from('app_config')
    .select('*', { count: 'exact', head: true });
  
  console.log(`Total records in app_config: ${count}`);
}

deleteDefaults().catch(console.error);