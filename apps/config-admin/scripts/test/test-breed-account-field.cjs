const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBeforeRegeneration() {
  console.log('=== ПЕРЕВІРКА ПЕРЕД РЕГЕНЕРАЦІЄЮ ===\n');
  
  const { data: config } = await supabase
    .from('app_config')
    .select('id, override_data, self_data')
    .eq('id', 'breed_field_account_id')
    .single();
  
  if (!config) {
    console.error('Field breed_field_account_id not found!');
    return;
  }
  
  console.log('breed_field_account_id:');
  console.log('  override_data:', JSON.stringify(config.override_data, null, 2));
  
  // Перевіряємо наявність кастомної властивості
  if (config.override_data?.test === 'test121212') {
    console.log('\n✅ Кастомна властивість "test": "test121212" присутня');
  } else {
    console.log('\n❌ Кастомна властивість "test" НЕ знайдена');
  }
  
  console.log('\n📝 Всі ключі в override_data:', Object.keys(config.override_data || {}));
  console.log('\nТепер запустіть регенерацію:');
  console.log('  echo "y" | node scripts/generate-sql-inserts.cjs --breed-only');
  console.log('\nПісля регенерації запустіть:');
  console.log('  node scripts/test-breed-account-field.cjs --after');
}

async function checkAfterRegeneration() {
  console.log('=== ПЕРЕВІРКА ПІСЛЯ РЕГЕНЕРАЦІЇ ===\n');
  
  const { data: config } = await supabase
    .from('app_config')
    .select('id, override_data, self_data')
    .eq('id', 'breed_field_account_id')
    .single();
  
  if (!config) {
    console.error('Field breed_field_account_id not found!');
    return;
  }
  
  console.log('breed_field_account_id:');
  console.log('  override_data:', JSON.stringify(config.override_data, null, 2));
  
  // Перевіряємо збереження кастомної властивості
  const testValue = config.override_data?.test;
  
  console.log('\n' + '='.repeat(60));
  if (testValue === 'test121212') {
    console.log('🎉 УСПІХ! Кастомна властивість "test": "test121212" ЗБЕРЕЖЕНА!');
  } else if (testValue) {
    console.log(`⚠️ Властивість "test" змінилася: "${testValue}" (очікувалось "test121212")`);
  } else {
    console.log('❌ ПОМИЛКА! Кастомна властивість "test" ВТРАЧЕНА!');
  }
  console.log('='.repeat(60));
  
  // Перевіряємо, що кастомна властивість НЕ в self_data
  if (config.self_data?.test) {
    console.log('\n⚠️ Увага: властивість "test" знайдена в self_data (має бути тільки в override_data)');
  } else {
    console.log('\n✅ Правильно: властивість "test" відсутня в self_data');
  }
  
  console.log('\n📝 Всі ключі в override_data після регенерації:', Object.keys(config.override_data || {}));
}

// Main execution
const isAfter = process.argv.includes('--after');

if (isAfter) {
  checkAfterRegeneration().catch(console.error);
} else {
  checkBeforeRegeneration().catch(console.error);
}