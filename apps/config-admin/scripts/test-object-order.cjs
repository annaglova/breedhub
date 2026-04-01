require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env['VITE_SUPABASE_URL'];
const supabaseAnonKey = process.env['VITE_SUPABASE_ANON_KEY'];

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testObjectBuildOrder() {
  console.log('\n=== Testing how object keys order is built ===\n');

  // Get the app
  const { data: app } = await supabase
    .from('app_config')
    .select('*')
    .eq('type', 'app')
    .eq('deleted', false)
    .limit(1)
    .single();

  console.log('App deps order:', app.deps);

  // Query children
  const { data: allChildren } = await supabase
    .from('app_config')
    .select('id, type, caption')
    .in('id', app.deps);

  console.log('\nSupabase returned allChildren in this order:');
  allChildren.forEach((c, i) => {
    console.log(`  ${i}. ${c.id} (${c.type}) - ${c.caption || 'no caption'}`);
  });

  // Filter workspaces
  const workspaces = allChildren.filter(c => c.type === 'workspace');
  console.log('\nAfter .filter() workspaces are:');
  workspaces.forEach((w, i) => {
    console.log(`  ${i}. ${w.id} - ${w.caption || 'no caption'}`);
  });

  // Build object like in rebuild script
  const workspacesData = {};
  for (const workspace of workspaces) {
    workspacesData[workspace.id] = { label: workspace.caption };
  }

  console.log('\nBuilt object keys order:', Object.keys(workspacesData));

  // Check if it matches deps
  const depsWorkspaceIds = app.deps.filter(d => d.startsWith('workspace_'));
  console.log('Deps workspace order:', depsWorkspaceIds);

  console.log('\n=== Result ===');
  console.log('Object keys match deps order?',
    JSON.stringify(Object.keys(workspacesData)) === JSON.stringify(depsWorkspaceIds));
}

testObjectBuildOrder().catch(console.error);
