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

async function testValidation() {
  // Get properties from database
  const { data: properties, error } = await supabase
    .from('app_config')
    .select('*')
    .eq('type', 'property')
    .order('id');
    
  if (error) {
    console.error('Error fetching properties:', error);
    return;
  }
  
  console.log(`\nChecking ${properties.length} properties for RxDB validation:\n`);
  
  // RxDB typically requires:
  // - deps: either null or non-empty array (not empty array)
  // - tags: either null or non-empty array (not empty array)
  // - all required fields must be present
  
  for (const prop of properties) {
    const issues = [];
    
    // Check deps
    if (Array.isArray(prop.deps) && prop.deps.length === 0) {
      issues.push('❌ deps is empty array (should be null or non-empty)');
    } else if (prop.deps === null) {
      issues.push('✅ deps is null');
    } else if (Array.isArray(prop.deps) && prop.deps.length > 0) {
      issues.push('✅ deps has items');
    }
    
    // Check tags
    if (Array.isArray(prop.tags) && prop.tags.length === 0) {
      issues.push('❌ tags is empty array (should be null or non-empty)');
    } else if (prop.tags === null) {
      issues.push('✅ tags is null');
    } else if (Array.isArray(prop.tags) && prop.tags.length > 0) {
      issues.push('✅ tags has items');
    }
    
    // Check other required fields
    if (!prop.id) issues.push('❌ missing id');
    if (!prop.type) issues.push('❌ missing type');
    if (!prop.self_data || Object.keys(prop.self_data).length === 0) {
      issues.push('⚠️ self_data is empty or missing');
    }
    if (!prop.data || Object.keys(prop.data).length === 0) {
      issues.push('⚠️ data is empty or missing');
    }
    
    console.log(`${prop.id}:`);
    issues.forEach(issue => console.log(`  ${issue}`));
    console.log('');
  }
  
  // Try to simulate RxDB validation
  console.log('\n=== Simulated RxDB Validation ===\n');
  
  let failCount = 0;
  for (const prop of properties) {
    // Common RxDB validation rules
    const isValid = 
      prop.id && 
      prop.type && 
      (prop.deps === null || (Array.isArray(prop.deps) && prop.deps.length > 0)) &&
      (prop.tags === null || (Array.isArray(prop.tags) && prop.tags.length > 0)) &&
      prop.self_data && Object.keys(prop.self_data).length > 0 &&
      prop.data && Object.keys(prop.data).length > 0;
    
    if (!isValid) {
      console.log(`❌ ${prop.id} - WOULD FAIL VALIDATION`);
      failCount++;
    } else {
      console.log(`✅ ${prop.id} - would pass`);
    }
  }
  
  console.log(`\nResult: ${failCount} properties would fail validation`);
}

testValidation().catch(console.error);