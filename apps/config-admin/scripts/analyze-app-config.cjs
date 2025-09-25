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

async function analyzeAppConfig() {
  console.log('Analyzing app and space configs...\n');
  
  // Get app config
  const { data: appConfig, error: appError } = await supabase
    .from('app_config')
    .select('*')
    .eq('id', 'config_app_1757849573544')
    .single();
  
  if (appError) {
    console.error('Error fetching app config:', appError);
    return;
  }
  
  console.log('APP CONFIG (config_app_1757849573544):');
  console.log('Type:', appConfig.type);
  console.log('Data:', JSON.stringify(appConfig.data, null, 2));
  console.log('Deps:', appConfig.deps);
  console.log('\n---\n');
  
  // Get space configs that are deps of app
  if (appConfig.deps && appConfig.deps.length > 0) {
    console.log('WORKSPACE CONFIGS:');
    
    for (const workspaceId of appConfig.deps) {
      const { data: workspace } = await supabase
        .from('app_config')
        .select('*')
        .eq('id', workspaceId)
        .single();
      
      if (workspace) {
        console.log(`\nWorkspace: ${workspaceId}`);
        console.log('Type:', workspace.type);
        console.log('Data:', JSON.stringify(workspace.data, null, 2));
        console.log('Deps:', workspace.deps);
        
        // Get spaces
        if (workspace.deps && workspace.deps.length > 0) {
          console.log('\n  SPACES:');
          
          for (const spaceId of workspace.deps) {
            const { data: space } = await supabase
              .from('app_config')
              .select('*')
              .eq('id', spaceId)
              .single();
            
            if (space) {
              console.log(`\n  Space: ${spaceId}`);
              console.log('  Type:', space.type);
              console.log('  Data:', JSON.stringify(space.data, null, 4));
              
              // Check for entitySchemaName
              if (space.data?.entitySchemaName) {
                console.log('  ✓ entitySchemaName:', space.data.entitySchemaName);
              } else if (space.self_data?.entitySchemaName) {
                console.log('  ✓ entitySchemaName (self_data):', space.self_data.entitySchemaName);
              } else {
                console.log('  ✗ No entitySchemaName found');
              }
              
              // Check deps (pages)
              if (space.deps && space.deps.length > 0) {
                console.log('  Pages:', space.deps);
              }
            }
          }
        }
      }
    }
  }
  
  console.log('\n---\n');
  
  // Specifically check the space config you mentioned
  console.log('SPECIFIC SPACE CONFIG (config_space_1757849573745):');
  const { data: breedSpace } = await supabase
    .from('app_config')
    .select('*')
    .eq('id', 'config_space_1757849573745')
    .single();
  
  if (breedSpace) {
    console.log('Full record:', JSON.stringify(breedSpace, null, 2));
  }
}

analyzeAppConfig().catch(console.error);