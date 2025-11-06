const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanupTestData() {
  console.log('Cleaning up test data...\n');
  
  // Remove test property from breed_field_account_id
  const { data: currentConfig } = await supabase
    .from('app_config')
    .select('*')
    .eq('id', 'breed_field_account_id')
    .single();
  
  if (!currentConfig) {
    console.error('Field breed_field_account_id not found!');
    return;
  }
  
  // Remove test property and defaultValue from override_data
  const cleanedOverrideData = { ...currentConfig.override_data };
  delete cleanedOverrideData.test;
  delete cleanedOverrideData.defaultValue;
  
  // Keep only original properties
  cleanedOverrideData.placeholder = 'Enter account';
  cleanedOverrideData.sortOrder = 130;
  
  // Update the field
  const { error } = await supabase
    .from('app_config')
    .update({
      override_data: cleanedOverrideData,
      data: { ...currentConfig.self_data, ...cleanedOverrideData }
    })
    .eq('id', 'breed_field_account_id');
  
  if (error) {
    console.error('Error cleaning field:', error);
    return;
  }
  
  console.log('✅ Removed test property from breed_field_account_id');
  console.log('   Final override_data:', cleanedOverrideData);
  
  // Clean up breed_field_name
  const { data: nameConfig } = await supabase
    .from('app_config')
    .select('*')
    .eq('id', 'breed_field_name')
    .single();
  
  if (nameConfig && (nameConfig.override_data?.customIcon || 
                      nameConfig.override_data?.customComponent || 
                      nameConfig.override_data?.customTooltip)) {
    const cleanedNameOverride = { ...nameConfig.override_data };
    delete cleanedNameOverride.customIcon;
    delete cleanedNameOverride.customComponent;
    delete cleanedNameOverride.customTooltip;
    
    await supabase
      .from('app_config')
      .update({
        override_data: cleanedNameOverride,
        data: { ...nameConfig.self_data, ...cleanedNameOverride }
      })
      .eq('id', 'breed_field_name');
    
    console.log('✅ Removed custom properties from breed_field_name');
  }
  
  console.log('\n✨ Test data cleanup complete!');
}

cleanupTestData().catch(console.error);