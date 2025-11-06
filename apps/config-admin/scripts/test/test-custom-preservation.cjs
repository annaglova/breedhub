const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testCustomPreservation() {
  console.log('Testing custom property preservation...\n');
  
  // 1. Add a custom property to a field
  const testFieldId = 'breed_field_name';
  const customProperty = {
    customIcon: '🎨',
    customComponent: 'SpecialNameInput',
    customTooltip: 'This is a custom tooltip added by user'
  };
  
  console.log(`1. Adding custom properties to ${testFieldId}...`);
  
  // Get current field config
  const { data: currentConfig } = await supabase
    .from('app_config')
    .select('*')
    .eq('id', testFieldId)
    .single();
  
  if (!currentConfig) {
    console.error(`Field ${testFieldId} not found!`);
    return;
  }
  
  // Add custom properties to override_data
  const updatedOverrideData = {
    ...currentConfig.override_data,
    ...customProperty
  };
  
  // Update the field with custom properties
  const { error: updateError } = await supabase
    .from('app_config')
    .update({
      override_data: updatedOverrideData,
      data: { ...currentConfig.self_data, ...updatedOverrideData }
    })
    .eq('id', testFieldId);
  
  if (updateError) {
    console.error('Error updating field:', updateError);
    return;
  }
  
  console.log('   ✅ Custom properties added');
  console.log('   Custom properties:', customProperty);
  
  // 2. Verify custom properties exist
  const { data: updatedConfig } = await supabase
    .from('app_config')
    .select('override_data')
    .eq('id', testFieldId)
    .single();
  
  console.log('\n2. Verifying custom properties in database...');
  const hasCustomProps = 
    updatedConfig?.override_data?.customIcon === customProperty.customIcon &&
    updatedConfig?.override_data?.customComponent === customProperty.customComponent &&
    updatedConfig?.override_data?.customTooltip === customProperty.customTooltip;
  
  if (hasCustomProps) {
    console.log('   ✅ Custom properties verified in database');
  } else {
    console.log('   ❌ Custom properties NOT found in database');
    return;
  }
  
  // 3. Now run the regeneration script
  console.log('\n3. Run regeneration to test preservation...');
  console.log('   Run: node scripts/generate-sql-inserts.cjs --breed-only');
  console.log('   Then answer "y" to update the database');
  console.log('\n4. After regeneration, run this script again with --check flag');
  console.log('   node scripts/test-custom-preservation.cjs --check');
  
  console.log('\n📝 Current override_data keys:', Object.keys(updatedConfig.override_data));
}

async function checkCustomPreservation() {
  console.log('Checking if custom properties were preserved...\n');
  
  const testFieldId = 'breed_field_name';
  const expectedCustomProps = {
    customIcon: '🎨',
    customComponent: 'SpecialNameInput',
    customTooltip: 'This is a custom tooltip added by user'
  };
  
  // Get field config after regeneration
  const { data: config } = await supabase
    .from('app_config')
    .select('override_data, self_data')
    .eq('id', testFieldId)
    .single();
  
  if (!config) {
    console.error(`Field ${testFieldId} not found!`);
    return;
  }
  
  console.log('Checking custom properties...');
  
  // Check each custom property
  let allPreserved = true;
  for (const [key, expectedValue] of Object.entries(expectedCustomProps)) {
    const actualValue = config.override_data?.[key];
    const isPreserved = actualValue === expectedValue;
    
    if (isPreserved) {
      console.log(`   ✅ ${key}: "${actualValue}" - PRESERVED`);
    } else {
      console.log(`   ❌ ${key}: Expected "${expectedValue}", got "${actualValue}" - NOT PRESERVED`);
      allPreserved = false;
    }
  }
  
  // Check that custom props are NOT in self_data (they should only be in override_data)
  console.log('\nVerifying custom properties are only in override_data...');
  for (const key of Object.keys(expectedCustomProps)) {
    if (config.self_data?.[key]) {
      console.log(`   ⚠️ ${key} found in self_data (should only be in override_data)`);
      allPreserved = false;
    } else {
      console.log(`   ✅ ${key} correctly not in self_data`);
    }
  }
  
  // Final result
  console.log('\n' + '='.repeat(50));
  if (allPreserved) {
    console.log('🎉 SUCCESS! All custom properties were preserved during regeneration!');
  } else {
    console.log('❌ FAILURE! Some custom properties were not preserved properly.');
  }
  console.log('='.repeat(50));
  
  // Show all override_data keys
  console.log('\nAll override_data keys:', Object.keys(config.override_data || {}));
}

// Main execution
const isCheck = process.argv.includes('--check');

if (isCheck) {
  checkCustomPreservation().catch(console.error);
} else {
  testCustomPreservation().catch(console.error);
}