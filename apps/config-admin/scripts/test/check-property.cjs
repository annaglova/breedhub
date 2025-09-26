// Check property details
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProperty() {
  try {
    // Get the property
    const { data: property, error } = await supabase
      .from('configs')
      .select('*')
      .eq('id', 'property_test')
      .single();
    
    if (error) {
      console.error('Error fetching property:', error);
      return;
    }
    
    console.log('Property test:');
    console.log('ID:', property.id);
    console.log('Type:', property.type);
    console.log('Category:', property.category);
    console.log('Tags:', property.tags);
    console.log('Data:', JSON.stringify(property.data, null, 2));
    
    // Also check workspace config
    const { data: workspace } = await supabase
      .from('configs')
      .select('*')
      .eq('id', 'config_workspace_1757849573673')
      .single();
      
    if (workspace) {
      console.log('\nWorkspace data:');
      console.log('ID:', workspace.id);
      console.log('Type:', workspace.type);
      
      // Check if property is referenced in workspace
      const workspaceData = workspace.data || {};
      const hasPropertyInPages = Object.values(workspaceData.pages || {}).some(page => {
        return Object.values(page.fields || {}).some(field => 
          field.test === 'test'
        );
      });
      
      const hasPropertyInViews = Object.values(workspaceData.views || {}).some(view => {
        return Object.values(view.fields || {}).some(field => 
          field.test === 'test'
        );
      });
      
      console.log('Property used in pages:', hasPropertyInPages);
      console.log('Property used in views:', hasPropertyInViews);
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

checkProperty();