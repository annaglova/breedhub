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

async function fixNullFields() {
  console.log('Fixing null fields in app_config...');
  
  // 1. Fix null tags
  console.log('\n1. Fixing null tags...');
  const { data: nullTags, error: tagsError } = await supabase
    .from('app_config')
    .select('id')
    .is('tags', null);
  
  if (tagsError) {
    console.error('Error fetching records with null tags:', tagsError);
  } else if (nullTags && nullTags.length > 0) {
    console.log(`Found ${nullTags.length} records with null tags`);
    
    const { error: updateTagsError } = await supabase
      .from('app_config')
      .update({ tags: [] })
      .is('tags', null);
    
    if (updateTagsError) {
      console.error('Error updating tags:', updateTagsError);
    } else {
      console.log('✅ Fixed null tags');
    }
  } else {
    console.log('No records with null tags found');
  }
  
  // 2. Fix null deps
  console.log('\n2. Fixing null deps...');
  const { data: nullDeps, error: depsError } = await supabase
    .from('app_config')
    .select('id')
    .is('deps', null);
  
  if (depsError) {
    console.error('Error fetching records with null deps:', depsError);
  } else if (nullDeps && nullDeps.length > 0) {
    console.log(`Found ${nullDeps.length} records with null deps`);
    
    const { error: updateDepsError } = await supabase
      .from('app_config')
      .update({ deps: [] })
      .is('deps', null);
    
    if (updateDepsError) {
      console.error('Error updating deps:', updateDepsError);
    } else {
      console.log('✅ Fixed null deps');
    }
  } else {
    console.log('No records with null deps found');
  }
  
  // 3. Fix null self_data
  console.log('\n3. Fixing null self_data...');
  const { data: nullSelfData, error: selfDataError } = await supabase
    .from('app_config')
    .select('id')
    .is('self_data', null);
  
  if (selfDataError) {
    console.error('Error fetching records with null self_data:', selfDataError);
  } else if (nullSelfData && nullSelfData.length > 0) {
    console.log(`Found ${nullSelfData.length} records with null self_data`);
    
    const { error: updateSelfDataError } = await supabase
      .from('app_config')
      .update({ self_data: {} })
      .is('self_data', null);
    
    if (updateSelfDataError) {
      console.error('Error updating self_data:', updateSelfDataError);
    } else {
      console.log('✅ Fixed null self_data');
    }
  } else {
    console.log('No records with null self_data found');
  }
  
  // 4. Fix null override_data
  console.log('\n4. Fixing null override_data...');
  const { data: nullOverrideData, error: overrideDataError } = await supabase
    .from('app_config')
    .select('id')
    .is('override_data', null);
  
  if (overrideDataError) {
    console.error('Error fetching records with null override_data:', overrideDataError);
  } else if (nullOverrideData && nullOverrideData.length > 0) {
    console.log(`Found ${nullOverrideData.length} records with null override_data`);
    
    const { error: updateOverrideDataError } = await supabase
      .from('app_config')
      .update({ override_data: {} })
      .is('override_data', null);
    
    if (updateOverrideDataError) {
      console.error('Error updating override_data:', updateOverrideDataError);
    } else {
      console.log('✅ Fixed null override_data');
    }
  } else {
    console.log('No records with null override_data found');
  }
  
  // 5. Fix null data
  console.log('\n5. Fixing null data...');
  const { data: nullData, error: dataError } = await supabase
    .from('app_config')
    .select('id')
    .is('data', null);
  
  if (dataError) {
    console.error('Error fetching records with null data:', dataError);
  } else if (nullData && nullData.length > 0) {
    console.log(`Found ${nullData.length} records with null data`);
    
    const { error: updateDataError } = await supabase
      .from('app_config')
      .update({ data: {} })
      .is('data', null);
    
    if (updateDataError) {
      console.error('Error updating data:', updateDataError);
    } else {
      console.log('✅ Fixed null data');
    }
  } else {
    console.log('No records with null data found');
  }
  
  // 6. Set default version
  console.log('\n6. Fixing null version...');
  const { data: nullVersion, error: versionError } = await supabase
    .from('app_config')
    .select('id')
    .is('version', null);
  
  if (versionError) {
    console.error('Error fetching records with null version:', versionError);
  } else if (nullVersion && nullVersion.length > 0) {
    console.log(`Found ${nullVersion.length} records with null version`);
    
    const { error: updateVersionError } = await supabase
      .from('app_config')
      .update({ version: 1 })
      .is('version', null);
    
    if (updateVersionError) {
      console.error('Error updating version:', updateVersionError);
    } else {
      console.log('✅ Fixed null version');
    }
  } else {
    console.log('No records with null version found');
  }
  
  // 7. Set deleted to false where null
  console.log('\n7. Fixing null deleted...');
  const { data: nullDeleted, error: deletedError } = await supabase
    .from('app_config')
    .select('id')
    .is('deleted', null);
  
  if (deletedError) {
    console.error('Error fetching records with null deleted:', deletedError);
  } else if (nullDeleted && nullDeleted.length > 0) {
    console.log(`Found ${nullDeleted.length} records with null deleted`);
    
    const { error: updateDeletedError } = await supabase
      .from('app_config')
      .update({ deleted: false })
      .is('deleted', null);
    
    if (updateDeletedError) {
      console.error('Error updating deleted:', updateDeletedError);
    } else {
      console.log('✅ Fixed null deleted');
    }
  } else {
    console.log('No records with null deleted found');
  }
  
  console.log('\n✅ All null fields fixed successfully');
  
  // Verify the fix
  console.log('\n=== Verification ===');
  const { count: totalCount } = await supabase
    .from('app_config')
    .select('*', { count: 'exact', head: true });
  
  console.log(`Total records in app_config: ${totalCount}`);
  
  // Check for any remaining nulls
  const checks = [
    { field: 'tags', expected: [] },
    { field: 'deps', expected: [] },
    { field: 'self_data', expected: {} },
    { field: 'override_data', expected: {} },
    { field: 'data', expected: {} },
    { field: 'version', expected: 1 },
    { field: 'deleted', expected: false }
  ];
  
  for (const check of checks) {
    const { count } = await supabase
      .from('app_config')
      .select('*', { count: 'exact', head: true })
      .is(check.field, null);
    
    if (count > 0) {
      console.log(`⚠️  Still have ${count} records with null ${check.field}`);
    } else {
      console.log(`✅ No null ${check.field} remaining`);
    }
  }
}

// Run the fix
fixNullFields().catch(console.error);