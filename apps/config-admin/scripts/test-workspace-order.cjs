require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env['VITE_SUPABASE_URL'];
const supabaseAnonKey = process.env['VITE_SUPABASE_ANON_KEY'];

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testWorkspaceOrder() {
  console.log('\n=== Testing workspace order ===\n');

  // Find app config
  const { data: apps } = await supabase
    .from('app_config')
    .select('*')
    .eq('type', 'app')
    .eq('deleted', false)
    .limit(1);

  if (!apps || apps.length === 0) {
    console.log('No app found');
    return;
  }

  const app = apps[0];
  console.log(`App: ${app.id}`);
  console.log(`Deps (workspace IDs in deps array):`);
  console.log(JSON.stringify(app.deps, null, 2));

  console.log(`\nApp data.workspaces (from rebuilt structure):`);
  if (app.data && app.data.workspaces) {
    console.log('Keys order:', Object.keys(app.data.workspaces));
    Object.entries(app.data.workspaces).forEach(([id, data]) => {
      console.log(`  ${id}: ${data.label || data.caption || 'no label'}`);
    });
  }

  // Query workspaces using deps order
  const { data: workspaces } = await supabase
    .from('app_config')
    .select('id, caption, data')
    .in('id', app.deps)
    .eq('type', 'workspace');

  console.log(`\nWorkspaces from Supabase .in() query:`);
  workspaces.forEach(w => {
    console.log(`  ${w.id}: ${w.caption || w.data?.label || 'no caption'}`);
  });

  // Check if order matches
  const depsWorkspaces = app.deps.filter(d => d.startsWith('workspace_'));
  const dataWorkspacesKeys = app.data?.workspaces ? Object.keys(app.data.workspaces) : [];

  console.log('\n=== Comparison ===');
  console.log('Deps order matches data keys order?',
    JSON.stringify(depsWorkspaces) === JSON.stringify(dataWorkspacesKeys));
}

testWorkspaceOrder().catch(console.error);
