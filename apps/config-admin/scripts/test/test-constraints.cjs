const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, '../.env') });
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConstraints() {
  // Test for account table
  const tableName = 'account';
  
  console.log(`\nTesting constraints for ${tableName} table:\n`);
  
  // Get columns
  const { data: columns, error: columnsError } = await supabase.rpc("execute_sql_select", {
    sql: `
      SELECT 
        column_name,
        data_type,
        is_nullable,
        character_maximum_length,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' 
        AND table_name = '${tableName}'
      ORDER BY ordinal_position
    `
  });
  
  if (columnsError) {
    console.error('Error fetching columns:', columnsError);
    return;
  }
  
  console.log(`Found ${columns.length} columns`);
  
  // Get constraints
  const { data: constraints, error: constraintsError } = await supabase.rpc("execute_sql_select", {
    sql: `
      SELECT 
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name
      FROM information_schema.table_constraints tc
      LEFT JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      WHERE tc.table_schema = 'public' 
        AND tc.table_name = '${tableName}'
        AND tc.constraint_type IN ('PRIMARY KEY', 'UNIQUE', 'NOT NULL', 'CHECK')
    `
  });
  
  if (constraintsError) {
    console.error('Error fetching constraints:', constraintsError);
    return;
  }
  
  console.log(`\nFound ${constraints ? constraints.length : 0} constraints:`);
  if (constraints) {
    constraints.forEach(c => {
      console.log(`  - ${c.constraint_type}: ${c.column_name} (${c.constraint_name})`);
    });
  }
  
  // Check specific fields
  console.log('\n=== Field Analysis ===\n');
  
  const fieldsToCheck = ['id', 'code', 'name', 'email', 'phone'];
  
  for (const fieldName of fieldsToCheck) {
    const col = columns.find(c => c.column_name === fieldName);
    if (!col) {
      console.log(`${fieldName}: NOT FOUND`);
      continue;
    }
    
    const fieldConstraints = constraints ? constraints.filter(c => c.column_name === fieldName) : [];
    
    console.log(`${fieldName}:`);
    console.log(`  Type: ${col.data_type}`);
    console.log(`  Nullable: ${col.is_nullable}`);
    console.log(`  Max Length: ${col.character_maximum_length || 'N/A'}`);
    console.log(`  Constraints: ${fieldConstraints.map(c => c.constraint_type).join(', ') || 'NONE'}`);
    console.log(`  Is Primary Key: ${fieldConstraints.some(c => c.constraint_type === 'PRIMARY KEY')}`);
    console.log(`  Is Unique: ${fieldConstraints.some(c => c.constraint_type === 'UNIQUE')}`);
    console.log('');
  }
}

testConstraints().catch(console.error);