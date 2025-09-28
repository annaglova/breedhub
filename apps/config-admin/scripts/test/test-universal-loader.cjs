const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, '../../.env') });

// Import the minimal setup needed for testing
async function testUniversalLoader() {
  console.log('🧪 Testing Universal Entity Data Loader\n');

  // Available entity types from MAIN_TABLES
  const entityTypes = [
    'breeds',    // Already tested
    'dogs',      // Individual dogs registry
    'persons',   // People (owners, breeders, handlers)
    'kennels',   // Kennel registry
    'litters',   // Litter records
    'pets'       // All pets data (partitioned by breed_id)
  ];

  // Test with existing entity types
  const testCases = [
    { entityType: 'breed', description: 'Breed definitions (existing table)' },
    { entityType: 'note', description: 'Note records (existing table)' },
    { entityType: 'service_item', description: 'Service items (existing table)' },
    { entityType: 'conf_item', description: 'Configuration items (existing table)' },
    { entityType: 'invalid_table', description: 'Invalid entity type (should fail gracefully)' }
  ];

  console.log('📋 Available entity types in MAIN_TABLES:');
  entityTypes.forEach(type => console.log(`  - ${type}`));
  console.log('');

  // Test each entity type
  for (const testCase of testCases) {
    await testEntityType(testCase.entityType, testCase.description);
    console.log(''); // Add spacing between tests
  }
}

async function testEntityType(entityType, description) {
  console.log(`🔍 Testing: ${entityType} (${description})`);
  console.log('━'.repeat(60));

  try {
    // Import Supabase client
    const { createClient } = require("@supabase/supabase-js");

    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing Supabase environment variables');
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Simulate the universal loadEntityData method behavior
    console.log(`📡 Fetching ${entityType} data from Supabase...`);

    const { data, error } = await supabase
      .from(entityType)
      .select('*')
      .limit(10); // Limit to 10 records for testing

    if (error) {
      console.error(`❌ Supabase error for ${entityType}:`, error.message);

      // Check if it's a table not found error
      if (error.message.includes('relation') && error.message.includes('does not exist')) {
        console.log(`ℹ️  Table "${entityType}" does not exist in database - this is expected for invalid entity types`);
      }
      return;
    }

    if (!data || data.length === 0) {
      console.log(`⚠️  No ${entityType} data found in Supabase`);
      return;
    }

    console.log(`✅ Successfully fetched ${data.length} ${entityType} records`);

    // Analyze the data structure
    if (data.length > 0) {
      const sampleRecord = data[0];
      console.log(`📊 Sample ${entityType} record structure:`);

      // Show field names and types
      Object.keys(sampleRecord).forEach(key => {
        const value = sampleRecord[key];
        const type = value === null ? 'null' : typeof value;
        console.log(`   ${key}: ${type}`);
      });

      // Check for required fields
      const requiredFields = ['id', 'created_at', 'updated_at'];
      const missingFields = requiredFields.filter(field => !(field in sampleRecord));

      if (missingFields.length > 0) {
        console.log(`⚠️  Missing required fields: ${missingFields.join(', ')}`);
      } else {
        console.log(`✅ All required fields present`);
      }

      // Check for 'deleted' field that needs mapping to '_deleted'
      if ('deleted' in sampleRecord) {
        console.log(`🔄 Found 'deleted' field - will be mapped to '_deleted' in RxDB`);
      }

      // Show specific entity-type fields for verification
      console.log(`🎯 Entity-specific fields for ${entityType}:`);
      const commonFields = ['id', 'created_at', 'updated_at', 'deleted'];
      const specificFields = Object.keys(sampleRecord).filter(key => !commonFields.includes(key));
      specificFields.forEach(field => {
        console.log(`   ${field}: ${sampleRecord[field]}`);
      });
    }

  } catch (error) {
    console.error(`💥 Test failed for ${entityType}:`, error.message);
  }
}

// Run the test
testUniversalLoader().catch(console.error);