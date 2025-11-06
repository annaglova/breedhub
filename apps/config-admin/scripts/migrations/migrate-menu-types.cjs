const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, '../../../../.env') });
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Migration script to rename menu-related config types
 *
 * Changes:
 * - user_menu_config → menu_config
 * - user_menu_section → menu_section
 * - user_menu_item → menu_item
 *
 * Also updates:
 * - id field (config_user_menu_config_xxx → config_menu_config_xxx)
 * - deps arrays in all configs that reference old ids
 */

const TYPE_MAPPING = {
  'user_menu_config': 'menu_config',
  'user_menu_section': 'menu_section',
  'user_menu_item': 'menu_item'
};

async function migrateMenuTypes() {
  console.log('Starting menu types migration...\n');

  try {
    // Step 1: Find all records with old types
    console.log('Step 1: Finding records with old menu types...');
    const oldTypes = Object.keys(TYPE_MAPPING);

    const { data: recordsToMigrate, error: fetchError } = await supabase
      .from('app_config')
      .select('id, type')
      .in('type', oldTypes);

    if (fetchError) {
      throw fetchError;
    }

    console.log(`Found ${recordsToMigrate.length} records to migrate:`);
    recordsToMigrate.forEach(r => console.log(`  - ${r.id} (${r.type})`));

    if (recordsToMigrate.length === 0) {
      console.log('\nNo records to migrate. Exiting.');
      return;
    }

    // Step 2: Create mapping of old ID → new ID
    console.log('\nStep 2: Creating ID mappings...');
    const idMappings = {};
    recordsToMigrate.forEach(record => {
      const oldType = record.type;
      const newType = TYPE_MAPPING[oldType];
      const oldId = record.id;
      const newId = oldId.replace(`_${oldType}_`, `_${newType}_`);
      idMappings[oldId] = newId;
      console.log(`  ${oldId} → ${newId}`);
    });

    // Step 3: Update type and id fields
    console.log('\nStep 3: Updating type and id fields...');
    for (const record of recordsToMigrate) {
      const oldId = record.id;
      const newId = idMappings[oldId];
      const newType = TYPE_MAPPING[record.type];

      // Fetch full record data
      const { data: fullRecord, error: fetchFullError } = await supabase
        .from('app_config')
        .select('*')
        .eq('id', oldId)
        .single();

      if (fetchFullError) {
        console.error(`  Error fetching ${oldId}:`, fetchFullError);
        continue;
      }

      // Delete old record
      const { error: deleteError } = await supabase
        .from('app_config')
        .delete()
        .eq('id', oldId);

      if (deleteError) {
        console.error(`  Error deleting ${oldId}:`, deleteError);
        continue;
      }

      // Insert with new id and type
      const newRecord = {
        ...fullRecord,
        id: newId,
        type: newType
      };

      const { error: insertError } = await supabase
        .from('app_config')
        .insert(newRecord);

      if (insertError) {
        console.error(`  Error inserting ${newId}:`, insertError);
        // Try to restore old record
        await supabase.from('app_config').insert(fullRecord);
        continue;
      }

      console.log(`  ✓ Migrated: ${oldId} → ${newId}`);
    }

    // Step 4: Update deps references in ALL records
    console.log('\nStep 4: Updating deps references in all records...');

    const { data: allRecords, error: allRecordsError } = await supabase
      .from('app_config')
      .select('id, deps');

    if (allRecordsError) {
      throw allRecordsError;
    }

    let updatedCount = 0;
    for (const record of allRecords) {
      if (!record.deps || record.deps.length === 0) continue;

      // Check if any deps need updating
      let depsUpdated = false;
      const newDeps = record.deps.map(depId => {
        if (idMappings[depId]) {
          depsUpdated = true;
          return idMappings[depId];
        }
        return depId;
      });

      if (depsUpdated) {
        const { error: updateError } = await supabase
          .from('app_config')
          .update({ deps: newDeps })
          .eq('id', record.id);

        if (updateError) {
          console.error(`  Error updating deps for ${record.id}:`, updateError);
          continue;
        }

        console.log(`  ✓ Updated deps in: ${record.id}`);
        updatedCount++;
      }
    }

    console.log(`\nUpdated deps in ${updatedCount} records.`);

    // Step 5: Verify migration
    console.log('\nStep 5: Verifying migration...');
    const { data: remainingOldTypes } = await supabase
      .from('app_config')
      .select('id, type')
      .in('type', oldTypes);

    if (remainingOldTypes && remainingOldTypes.length > 0) {
      console.error('⚠️  Warning: Some old types still exist:');
      remainingOldTypes.forEach(r => console.error(`  - ${r.id} (${r.type})`));
    } else {
      console.log('✓ No old menu types found');
    }

    const { data: newTypeRecords } = await supabase
      .from('app_config')
      .select('id, type')
      .in('type', Object.values(TYPE_MAPPING));

    console.log(`✓ Found ${newTypeRecords.length} records with new menu types`);

    console.log('\n✅ Migration completed successfully!');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

migrateMenuTypes().catch(console.error);
