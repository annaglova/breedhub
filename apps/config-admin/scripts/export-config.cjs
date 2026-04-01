/**
 * Export app config as static JSON.
 * Takes the `data` field from ONE record — it's already merged.
 *
 * Usage: node scripts/export-config.cjs
 * Output: ../app/public/app-config.json
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const APP_CONFIG_ID = 'config_app_1757849573544';

async function exportConfig() {
  console.log('📦 Exporting app config...');

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  const { data, error } = await supabase
    .from('app_config')
    .select('data')
    .eq('id', APP_CONFIG_ID)
    .single();

  if (error || !data?.data) {
    console.error('❌ Failed:', error?.message || 'No data field');
    process.exit(1);
  }

  const exported = {
    version: Date.now(),
    data: data.data,
  };

  const outputPath = path.resolve(__dirname, '../../app/public/app-config.json');
  fs.writeFileSync(outputPath, JSON.stringify(exported), 'utf-8');

  const sizeKB = (Buffer.byteLength(JSON.stringify(exported)) / 1024).toFixed(1);
  console.log(`✅ ${outputPath} (${sizeKB} KB)`);
  console.log(`   Keys: ${Object.keys(data.data).join(', ')}`);
}

exportConfig().catch(err => {
  console.error('❌', err);
  process.exit(1);
});
