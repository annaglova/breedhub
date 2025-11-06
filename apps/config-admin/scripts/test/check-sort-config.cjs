const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, '../../../../.env') });
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  console.log('URL:', supabaseUrl ? 'Found' : 'Missing');
  console.log('Key:', supabaseKey ? 'Found' : 'Missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkConfig(configId) {
  console.log(`\nChecking config: ${configId}\n`);

  const { data: config, error } = await supabase
    .from('app_config')
    .select('id, type, self_data, override_data, data, deps')
    .eq('id', configId)
    .single();

  if (error) {
    console.error('Error:', error);
    return;
  }

  if (!config) {
    console.log('Config not found');
    return;
  }

  console.log('Type:', config.type);
  console.log('\nDeps:', JSON.stringify(config.deps, null, 2));
  console.log('\nOverride data:', JSON.stringify(config.override_data, null, 2));
  console.log('\nSelf data:', JSON.stringify(config.self_data, null, 2));
  console.log('\nData:', JSON.stringify(config.data, null, 2));

  // If has deps, fetch them too
  if (config.deps && config.deps.length > 0) {
    console.log(`\n\n=== Fetching ${config.deps.length} dependencies ===\n`);

    for (const depId of config.deps) {
      const { data: dep } = await supabase
        .from('app_config')
        .select('id, type, data')
        .eq('id', depId)
        .single();

      if (dep) {
        console.log(`\n${depId} (type: ${dep.type}):`);
        console.log(JSON.stringify(dep.data, null, 2));
      }
    }
  }
}

const configId = process.argv[2] || 'config_sort_1759737147242';
checkConfig(configId).catch(console.error);
