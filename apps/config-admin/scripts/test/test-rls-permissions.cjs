const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Приклад як будуть виглядати permissions після включення RLS

async function testRlsPermissions() {
  console.log('=== Testing RLS Permissions Extraction ===\n');
  
  // Test tables
  const testTables = ['breed', 'pet', 'contact', 'account'];
  
  for (const table of testTables) {
    console.log(`\nTable: ${table}`);
    console.log('─'.repeat(40));
    
    const { data, error } = await supabase.rpc('get_table_policies', {
      tablename: table
    });
    
    if (error) {
      console.error(`  Error: ${error.message}`);
      continue;
    }
    
    console.log(`  RLS Enabled: ${data?.rls_enabled ? '✅' : '❌'}`);
    
    if (data?.policies && data.policies.length > 0) {
      console.log(`  Policies (${data.policies.length}):`);
      
      // Group by command
      const byCommand = {};
      data.policies.forEach(p => {
        const cmd = p.cmd || 'ALL';
        if (!byCommand[cmd]) byCommand[cmd] = [];
        byCommand[cmd].push(p);
      });
      
      // Show grouped policies
      Object.entries(byCommand).forEach(([cmd, policies]) => {
        console.log(`\n    ${cmd}:`);
        policies.forEach(p => {
          console.log(`      - ${p.policyname}`);
          if (p.roles?.length > 0) {
            console.log(`        Roles: ${p.roles.join(', ')}`);
          }
          if (p.qual) {
            console.log(`        Condition: ${p.qual.substring(0, 50)}...`);
          }
        });
      });
      
      // Derive permissions
      console.log('\n  Derived Permissions:');
      const permissions = derivePermissions(data.policies);
      console.log(`    Read: [${permissions.read.join(', ')}]`);
      console.log(`    Write: [${permissions.write.join(', ')}]`);
    } else {
      console.log('  No policies defined');
      console.log('\n  Default Permissions:');
      console.log('    Read: ["*"]');
      console.log('    Write: ["admin", "editor"]');
    }
  }
}

function derivePermissions(policies) {
  const permissions = {
    read: [],
    write: []
  };
  
  // Analyze read policies
  const readPolicies = policies.filter(p => 
    p.cmd === 'SELECT' || p.cmd === 'ALL' || p.cmd === '*'
  );
  
  if (readPolicies.length === 0) {
    permissions.read = ['*']; // No policy = public
  } else {
    readPolicies.forEach(p => {
      if (!p.qual || p.qual === 'true') {
        permissions.read.push('*');
      } else if (p.qual.includes('auth.uid()')) {
        if (p.qual.includes('IS NOT NULL')) {
          permissions.read.push('authenticated');
        } else {
          permissions.read.push('owner');
        }
      } else if (p.qual.includes('role')) {
        permissions.read.push('role-based');
      }
    });
  }
  
  // Analyze write policies
  const writePolicies = policies.filter(p => 
    p.cmd === 'INSERT' || p.cmd === 'UPDATE' || p.cmd === 'DELETE' || 
    p.cmd === 'ALL' || p.cmd === '*'
  );
  
  if (writePolicies.length === 0) {
    permissions.write = ['admin', 'editor'];
  } else {
    writePolicies.forEach(p => {
      if (p.qual && p.qual.includes('auth.uid()')) {
        permissions.write.push('owner');
      } else if (p.qual && p.qual.includes('admin')) {
        permissions.write.push('admin');
      } else if (p.qual && p.qual.includes('editor')) {
        permissions.write.push('editor');
      }
    });
  }
  
  // Remove duplicates
  permissions.read = [...new Set(permissions.read)];
  permissions.write = [...new Set(permissions.write)];
  
  if (permissions.read.length === 0) permissions.read = ['*'];
  if (permissions.write.length === 0) permissions.write = ['admin', 'editor'];
  
  return permissions;
}

// Example SQL to enable RLS and add policies
function printExampleSql() {
  console.log('\n\n=== Example SQL to Enable RLS ===\n');
  console.log(`
-- Enable RLS for breed table
ALTER TABLE breed ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "breed_public_read" ON breed
  FOR SELECT
  USING (true);

-- Authenticated users can insert
CREATE POLICY "breed_auth_insert" ON breed
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Admins and editors can update
CREATE POLICY "breed_admin_update" ON breed
  FOR UPDATE
  USING (
    auth.jwt() ->> 'role' IN ('admin', 'editor')
  );

-- Only admins can delete
CREATE POLICY "breed_admin_delete" ON breed
  FOR DELETE
  USING (
    auth.jwt() ->> 'role' = 'admin'
  );

-- Check policies
SELECT * FROM get_table_policies('breed');
  `);
}

// Run tests
testRlsPermissions()
  .then(() => {
    printExampleSql();
  })
  .catch(console.error);