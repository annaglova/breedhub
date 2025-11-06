const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, '../../../../.env') });
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchemaProperty() {
  // Check property_breed_supabase_schema
  const { data: schemaProperty, error } = await supabase
    .from('app_config')
    .select('*')
    .eq('id', 'property_breed_supabase_schema')
    .single();
  
  if (schemaProperty) {
    console.log('Schema Property:', JSON.stringify(schemaProperty, null, 2));
  } else {
    console.log('Schema property not found');
  }
  
  // Also check for any entity schema properties
  const { data: schemas } = await supabase
    .from('app_config')
    .select('id, type, self_data, data')
    .like('id', '%supabase_schema%');
  
  console.log('\nAll schema properties:');
  schemas?.forEach(s => {
    console.log(`- ${s.id}: type=${s.type}`);
    if (s.data?.schema || s.self_data?.schema) {
      console.log('  Has schema:', !!(s.data?.schema || s.self_data?.schema));
    }
  });
}

checkSchemaProperty().catch(console.error);