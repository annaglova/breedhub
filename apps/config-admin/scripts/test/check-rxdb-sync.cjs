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

async function checkSync() {
  console.log('📊 Checking synchronization status...\n');
  
  // Get counts from Supabase
  const types = ['property', 'field', 'entity_field'];
  const supabaseCounts = {};
  
  for (const type of types) {
    const { count, error } = await supabase
      .from('app_config')
      .select('*', { count: 'exact', head: true })
      .eq('type', type);
    
    if (error) {
      console.error(`Error counting ${type}:`, error);
    } else {
      supabaseCounts[type] = count || 0;
    }
  }
  
  console.log('Supabase counts:');
  console.log('  properties:', supabaseCounts.property || 0);
  console.log('  fields:', supabaseCounts.field || 0);
  console.log('  entity_fields:', supabaseCounts.entity_field || 0);
  console.log('  Total:', Object.values(supabaseCounts).reduce((a, b) => a + b, 0));
  
  // Check for NULL values that might cause sync issues
  console.log('\n🔍 Checking for potential sync issues...\n');
  
  const fieldsToCheck = ['tags', 'deps', 'self_data', 'override_data', 'data'];
  
  for (const field of fieldsToCheck) {
    const { count, error } = await supabase
      .from('app_config')
      .select('*', { count: 'exact', head: true })
      .is(field, null);
    
    if (error) {
      console.error(`Error checking ${field}:`, error);
    } else if (count > 0) {
      console.log(`⚠️  Found ${count} records with NULL ${field}`);
      
      // Get sample IDs
      const { data: samples } = await supabase
        .from('app_config')
        .select('id, type')
        .is(field, null)
        .limit(3);
      
      if (samples && samples.length > 0) {
        console.log(`    Sample IDs: ${samples.map(s => s.id).join(', ')}`);
      }
    }
  }
  
  // Check specifically properties
  console.log('\n🔍 Checking properties specifically...\n');
  
  const { data: properties, error: propError } = await supabase
    .from('app_config')
    .select('id, tags, deps, self_data')
    .eq('type', 'property')
    .limit(3);
  
  if (propError) {
    console.error('Error fetching properties:', propError);
  } else if (properties) {
    console.log('Sample properties:');
    properties.forEach(p => {
      console.log(`  ${p.id}:`);
      console.log(`    tags: ${JSON.stringify(p.tags)}`);
      console.log(`    deps: ${JSON.stringify(p.deps)}`);
      console.log(`    self_data: ${p.self_data ? 'present' : 'missing'}`);
    });
  }
  
  console.log('\n✅ Check complete');
  console.log('\nTo fix sync issues:');
  console.log('1. Clear browser IndexedDB (F12 -> Application -> Storage -> Clear site data)');
  console.log('2. Refresh the admin page');
  console.log('3. Check browser console for sync errors');
}

checkSync().catch(console.error);