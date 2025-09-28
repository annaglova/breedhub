const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, '../../.env') });
const { createClient } = require("@supabase/supabase-js");

async function checkExistingTables() {
  console.log('🔍 Checking which tables exist in Supabase...\n');

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase environment variables');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Query information_schema to get all tables
  const { data, error } = await supabase
    .rpc('get_schema_tables'); // This might not work, let's try a different approach

  if (error) {
    console.log('ℹ️  Direct schema query failed, trying individual table checks...\n');

    // Try to check specific tables that might exist
    const potentialTables = [
      'breeds', 'pets', 'dogs', 'persons', 'kennels', 'litters',
      'health_tests', 'pedigrees', 'pet_photos', 'pet_documents',
      'service_item', 'conf_item', 'users', 'profiles', 'subscriptions',
      'app_config', 'breed', 'note', 'property'
    ];

    console.log('📋 Checking individual tables:');
    console.log('━'.repeat(50));

    for (const tableName of potentialTables) {
      try {
        const { data: tableData, error: tableError } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);

        if (tableError) {
          if (tableError.message.includes('does not exist')) {
            console.log(`❌ ${tableName} - does not exist`);
          } else {
            console.log(`⚠️  ${tableName} - error: ${tableError.message}`);
          }
        } else {
          console.log(`✅ ${tableName} - exists ${tableData ? `(${tableData.length} sample records)` : '(empty)'}`);

          // If table exists and has data, show structure
          if (tableData && tableData.length > 0) {
            const sampleRecord = tableData[0];
            const fieldCount = Object.keys(sampleRecord).length;
            console.log(`   📊 Structure: ${fieldCount} fields - ${Object.keys(sampleRecord).slice(0, 5).join(', ')}${fieldCount > 5 ? '...' : ''}`);
          }
        }
      } catch (err) {
        console.log(`💥 ${tableName} - unexpected error: ${err.message}`);
      }
    }
  } else {
    console.log('✅ Schema query successful');
    console.log(data);
  }
}

checkExistingTables().catch(console.error);