const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkField() {
  const { data: field } = await supabase
    .from('app_config')
    .select('id, self_data, data')
    .eq('id', 'breed_field_account_id')
    .single();
    
  console.log('Field breed_field_account_id:');
  console.log('  self_data icon:', field?.self_data?.icon);
  console.log('  data icon:', field?.data?.icon);
  
  const { data: prop } = await supabase
    .from('app_config')
    .select('id, data')
    .eq('id', 'property_test')
    .single();
    
  console.log('\nProperty property_test:');
  console.log('  data icon:', prop?.data?.icon);
  
  if (field?.self_data?.icon === prop?.data?.icon) {
    console.log('\n✅ CASCADE UPDATE WORKED! Icons match.');
  } else {
    console.log('\n❌ CASCADE UPDATE FAILED! Icons do not match.');
    console.log('  Expected:', prop?.data?.icon);
    console.log('  Got:', field?.self_data?.icon);
  }
}

checkField();