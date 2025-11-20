const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, '../../../.env') });
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function deleteEmptyTags() {
  console.log('🔍 Checking for entity_field configs with empty tags...\n');

  // First, count how many we'll delete
  const { data: checkData, error: checkError } = await supabase
    .from('app_config')
    .select('id, category, tags', { count: 'exact' })
    .eq('type', 'entity_field')
    .or('tags.is.null,tags.eq.{}');

  if (checkError) {
    console.error('Error checking records:', checkError);
    process.exit(1);
  }

  console.log(`Found ${checkData?.length || 0} records with empty tags`);

  if (checkData && checkData.length > 0) {
    // Group by category
    const byCategory = {};
    checkData.forEach(item => {
      const cat = item.category || 'unknown';
      if (!byCategory[cat]) byCategory[cat] = 0;
      byCategory[cat]++;
    });

    console.log('\nBreakdown by category:');
    Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])
      .forEach(([cat, count]) => {
        console.log(`  ${cat}: ${count}`);
      });

    console.log('\n🗑️  Deleting records with empty tags...');

    // Delete them
    const { error: deleteError } = await supabase
      .from('app_config')
      .delete()
      .eq('type', 'entity_field')
      .or('tags.is.null,tags.eq.{}');

    if (deleteError) {
      console.error('Error deleting records:', deleteError);
      process.exit(1);
    }

    console.log('✅ Successfully deleted records with empty tags');
    console.log('\nNext step: Run "echo y | node scripts/generate-sql-inserts.cjs" to re-insert with correct tags');
  } else {
    console.log('✅ No records with empty tags found');
  }
}

deleteEmptyTags().catch(console.error);
