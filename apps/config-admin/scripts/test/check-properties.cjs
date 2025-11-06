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

async function checkProperties() {
  console.log('Fetching properties from database...\n');
  
  // Get all properties
  const { data: properties, error } = await supabase
    .from('app_config')
    .select('*')
    .eq('type', 'property')
    .order('id');
  
  if (error) {
    console.error('Error fetching properties:', error);
    return;
  }
  
  console.log(`Found ${properties.length} properties:\n`);
  
  for (const prop of properties) {
    console.log(`ID: ${prop.id}`);
    console.log(`  deps: ${JSON.stringify(prop.deps)}`);
    console.log(`  self_data: ${JSON.stringify(prop.self_data)}`);
    console.log(`  data: ${JSON.stringify(prop.data)}`);
    console.log(`  override_data: ${JSON.stringify(prop.override_data)}`);
    console.log(`  caption: ${prop.caption}`);
    console.log(`  category: ${prop.category}`);
    console.log(`  tags: ${JSON.stringify(prop.tags)}`);
    console.log('---');
  }
  
  // Check validation rules
  console.log('\n=== Checking for potential issues ===\n');
  
  for (const prop of properties) {
    const issues = [];
    
    // Check if deps is null vs empty array
    if (prop.deps !== null && prop.deps !== undefined) {
      issues.push(`deps is not null: ${JSON.stringify(prop.deps)}`);
    }
    
    // Check if required fields exist
    if (!prop.self_data || Object.keys(prop.self_data).length === 0) {
      issues.push('self_data is empty or missing');
    }
    
    if (!prop.data || Object.keys(prop.data).length === 0) {
      issues.push('data is empty or missing');
    }
    
    if (issues.length > 0) {
      console.log(`❌ ${prop.id}:`);
      issues.forEach(issue => console.log(`   - ${issue}`));
    } else {
      console.log(`✅ ${prop.id}: OK`);
    }
  }
}

checkProperties().catch(console.error);