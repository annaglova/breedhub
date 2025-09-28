const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, '../../.env') });
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateViewRows() {
  console.log('Updating view rows configurations...\n');

  // Get all view configs
  const { data: views, error } = await supabase
    .from('app_config')
    .select('id, data, override_data')
    .eq('type', 'view');

  if (error) {
    console.error('Error fetching views:', error);
    return;
  }

  console.log(`Found ${views.length} view configs\n`);

  // Update different rows for different viewTypes
  const rowsMapping = {
    'list': 60,    // List view - more rows for scrolling
    'grid': 30,    // Grid view - less rows as they take more space
    'table': 100,  // Table view - many rows for data-dense view
    'tabs': 20     // Tabs view - fewer rows
  };

  for (const view of views) {
    const currentData = view.data || {};
    const viewType = currentData.viewType;

    if (viewType && rowsMapping[viewType]) {
      const newRows = rowsMapping[viewType];

      // Update override_data to set rows
      const updatedOverrideData = {
        ...view.override_data,
        rows: newRows
      };

      console.log(`Updating ${view.id}:`);
      console.log(`  ViewType: ${viewType}`);
      console.log(`  Current rows: ${currentData.rows || 'not set'}`);
      console.log(`  New rows: ${newRows}`);

      const { error: updateError } = await supabase
        .from('app_config')
        .update({
          override_data: updatedOverrideData,
          updated_at: new Date().toISOString()
        })
        .eq('id', view.id);

      if (updateError) {
        console.error(`  Error updating: ${updateError.message}`);
      } else {
        console.log(`  ✅ Updated successfully`);
      }
    } else {
      console.log(`Skipping ${view.id} - no viewType or mapping`);
    }
  }

  console.log('\n✅ Update complete!');
  console.log('Run "node scripts/rebuild-hierarchy.cjs full" to propagate changes');
}

// Add option to check current values
async function checkCurrentRows() {
  const { data: spaces, error } = await supabase
    .from('app_config')
    .select('id, data')
    .eq('type', 'space');

  if (error) {
    console.error('Error fetching spaces:', error);
    return;
  }

  // Find breed space
  const breedSpace = spaces.find(s => s.id.includes('breed') || s.data?.entitySchemaName === 'breed');

  if (breedSpace) {
    console.log('\nBreed space:', breedSpace.id);
    if (breedSpace.data?.views) {
      console.log('Views:');
      Object.entries(breedSpace.data.views).forEach(([viewId, viewData]) => {
        console.log(`  ${viewId}:`);
        console.log(`    viewType: ${viewData.viewType}`);
        console.log(`    rows: ${viewData.rows || 'not set'}`);
      });
    } else {
      console.log('No views found in breed space');
    }
  } else {
    console.log('Breed space not found');
  }
}

// Run based on command line argument
const command = process.argv[2];

if (command === 'check') {
  checkCurrentRows().catch(console.error);
} else {
  updateViewRows()
    .then(() => checkCurrentRows())
    .catch(console.error);
}