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

// Load semantic tree
const semanticTree = require('../src/data/semantic-tree/semantic-tree.json');

async function updateTags() {
  console.log('Updating tags for entity fields...');
  
  let updatedCount = 0;
  let errorCount = 0;
  
  // Process entity fields in batches
  const batchSize = 50;
  const entityFields = semanticTree.entityFields || [];
  
  for (let i = 0; i < entityFields.length; i += batchSize) {
    const batch = entityFields.slice(i, i + batchSize);
    
    for (const field of batch) {
      if (field.tags && field.tags.length > 0) {
        try {
          const { error } = await supabase
            .from('app_config')
            .update({ 
              tags: field.tags,
              updated_at: new Date().toISOString()
            })
            .eq('id', field.id);
          
          if (error) {
            console.error(`Error updating ${field.id}:`, error);
            errorCount++;
          } else {
            updatedCount++;
          }
        } catch (err) {
          console.error(`Failed to update ${field.id}:`, err);
          errorCount++;
        }
      }
    }
    
    console.log(`Processed ${Math.min(i + batchSize, entityFields.length)} / ${entityFields.length} fields...`);
  }
  
  console.log(`\n✅ Updated ${updatedCount} records`);
  if (errorCount > 0) {
    console.log(`❌ Failed to update ${errorCount} records`);
  }
  
  // Verify some samples
  console.log('\n=== Verification ===');
  
  const { data: samples } = await supabase
    .from('app_config')
    .select('id, tags')
    .in('id', ['account_field_name', 'breed_standard_field_id', 'country_field_name'])
    .limit(3);
  
  console.log('Sample records with tags:');
  samples?.forEach(s => {
    console.log(`  ${s.id} -> tags: ${s.tags?.join(', ') || 'none'}`);
  });
}

// Run the update
updateTags().catch(console.error);