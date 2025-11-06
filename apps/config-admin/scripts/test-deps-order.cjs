require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env['VITE_SUPABASE_URL'];
const supabaseAnonKey = process.env['VITE_SUPABASE_ANON_KEY'];

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testDepsOrder() {
  console.log('\n=== Testing if Supabase .in() preserves deps array order ===\n');

  // Find a config with multiple deps to test
  const { data: configs } = await supabase
    .from('app_config')
    .select('id, type, deps')
    .not('deps', 'is', null)
    .eq('deleted', false)
    .limit(5);

  if (!configs || configs.length === 0) {
    console.log('No configs with deps found');
    return;
  }

  // Find one with at least 3 deps
  const testConfig = configs.find(c => c.deps && c.deps.length >= 3);

  if (!testConfig) {
    console.log('No config with 3+ deps found');
    console.log('Available configs:', configs.map(c => ({ id: c.id, depsCount: c.deps?.length })));
    return;
  }

  console.log(`Testing with config: ${testConfig.id}`);
  console.log(`Type: ${testConfig.type}`);
  console.log(`Original deps order: [${testConfig.deps.join(', ')}]`);

  // Query with original deps order
  const { data: result1 } = await supabase
    .from('app_config')
    .select('id')
    .in('id', testConfig.deps);

  console.log(`\nResult with original order: [${result1?.map(r => r.id).join(', ')}]`);

  // Query with reversed deps order
  const reversedDeps = [...testConfig.deps].reverse();
  console.log(`\nReversed deps order: [${reversedDeps.join(', ')}]`);

  const { data: result2 } = await supabase
    .from('app_config')
    .select('id')
    .in('id', reversedDeps);

  console.log(`Result with reversed order: [${result2?.map(r => r.id).join(', ')}]`);

  // Check if order is preserved
  const preservesOrder = result1?.every((item, i) => item.id === testConfig.deps[i]);
  const preservesReversedOrder = result2?.every((item, i) => item.id === reversedDeps[i]);

  console.log('\n=== Analysis ===');
  console.log(`Does .in() preserve original deps order? ${preservesOrder ? 'YES' : 'NO'}`);
  console.log(`Does .in() preserve reversed deps order? ${preservesReversedOrder ? 'YES' : 'NO'}`);

  if (!preservesOrder && !preservesReversedOrder) {
    console.log('\n⚠️  Supabase .in() does NOT preserve array order!');
    console.log('This means we need to manually sort results by deps array order.');
  } else {
    console.log('\n✅ Supabase .in() preserves the input array order!');
    console.log('This means deps array order directly controls element order.');
  }
}

testDepsOrder().catch(console.error);
