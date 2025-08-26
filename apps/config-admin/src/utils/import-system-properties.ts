import { propertyRegistryStore, type PropertyDefinition } from '@breedhub/rxdb-store';

// Define SYSTEM properties that can be reused across ALL configurations
const systemProperties: Partial<PropertyDefinition>[] = [
  // === Common Identifiers ===
  {
    name: 'id',
    type: 'string',
    caption: 'ID',
    component: 10, // TextInput
    category: 'identifiers',
    is_system: true,
    config: {
      maxLength: 100,
      pattern: '^[a-zA-Z0-9_-]+$',
      placeholder: 'Unique identifier',
      isRequired: true
    },
    mixins: ['required', 'indexed', 'readonly'],
    tags: ['system', 'core']
  },
  {
    name: 'uid',
    type: 'string',
    caption: 'UUID',
    component: 10, // TextInput
    category: 'identifiers',
    is_system: true,
    config: {
      maxLength: 36,
      pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
      isRequired: true,
      readOnly: true
    },
    mixins: ['required', 'indexed', 'readonly'],
    tags: ['system', 'core']
  },
  {
    name: 'external_id',
    type: 'string',
    caption: 'External ID',
    component: 10, // TextInput
    category: 'identifiers',
    is_system: true,
    config: {
      maxLength: 255,
      placeholder: 'ID from external system'
    },
    mixins: ['indexed'],
    tags: ['system', 'integration']
  },

  // === Common Text Fields ===
  {
    name: 'name',
    type: 'string',
    caption: 'Name',
    component: 10, // TextInput
    category: 'text',
    is_system: true,
    config: {
      maxLength: 255,
      minLength: 1,
      isRequired: true,
      placeholder: 'Enter name'
    },
    mixins: ['required', 'searchable', 'sortable', 'indexed'],
    tags: ['system', 'core']
  },
  {
    name: 'title',
    type: 'string',
    caption: 'Title',
    component: 10, // TextInput
    category: 'text',
    is_system: true,
    config: {
      maxLength: 255,
      placeholder: 'Enter title'
    },
    mixins: ['searchable', 'sortable'],
    tags: ['system', 'content']
  },
  {
    name: 'description',
    type: 'string',
    caption: 'Description',
    component: 10, // TextInput
    category: 'text',
    is_system: true,
    config: {
      maxLength: 1000,
      multiline: true,
      rows: 4,
      placeholder: 'Enter description'
    },
    mixins: ['searchable'],
    tags: ['system', 'content']
  },
  {
    name: 'short_description',
    type: 'string',
    caption: 'Short Description',
    component: 10, // TextInput
    category: 'text',
    is_system: true,
    config: {
      maxLength: 255,
      placeholder: 'Brief description'
    },
    mixins: [],
    tags: ['system', 'content']
  },
  {
    name: 'slug',
    type: 'string',
    caption: 'Slug',
    component: 10, // TextInput
    category: 'text',
    is_system: true,
    config: {
      maxLength: 255,
      pattern: '^[a-z0-9-]+$',
      placeholder: 'url-friendly-name'
    },
    mixins: ['indexed'],
    tags: ['system', 'seo']
  },

  // === Common Dates ===
  {
    name: 'created_at',
    type: 'datetime',
    caption: 'Created At',
    component: 3, // DatePicker
    category: 'dates',
    is_system: true,
    config: {
      format: 'YYYY-MM-DD HH:mm:ss',
      readOnly: true,
      defaultValue: 'now'
    },
    mixins: ['sortable', 'indexed', 'readonly'],
    tags: ['system', 'audit']
  },
  {
    name: 'updated_at',
    type: 'datetime',
    caption: 'Updated At',
    component: 3, // DatePicker
    category: 'dates',
    is_system: true,
    config: {
      format: 'YYYY-MM-DD HH:mm:ss',
      readOnly: true,
      defaultValue: 'now'
    },
    mixins: ['sortable', 'indexed', 'readonly'],
    tags: ['system', 'audit']
  },
  {
    name: 'deleted_at',
    type: 'datetime',
    caption: 'Deleted At',
    component: 3, // DatePicker
    category: 'dates',
    is_system: true,
    config: {
      format: 'YYYY-MM-DD HH:mm:ss',
      readOnly: true
    },
    mixins: ['indexed', 'readonly'],
    tags: ['system', 'audit']
  },
  {
    name: 'published_at',
    type: 'datetime',
    caption: 'Published At',
    component: 3, // DatePicker
    category: 'dates',
    is_system: true,
    config: {
      format: 'YYYY-MM-DD HH:mm:ss'
    },
    mixins: ['sortable', 'indexed'],
    tags: ['system', 'publishing']
  },

  // === Common Status Fields ===
  {
    name: 'is_active',
    type: 'boolean',
    caption: 'Is Active',
    component: 5, // Checkbox
    category: 'status',
    is_system: true,
    config: {
      defaultValue: true
    },
    mixins: ['indexed'],
    tags: ['system', 'status']
  },
  {
    name: 'is_deleted',
    type: 'boolean',
    caption: 'Is Deleted',
    component: 5, // Checkbox
    category: 'status',
    is_system: true,
    config: {
      defaultValue: false
    },
    mixins: ['indexed', 'hidden'],
    tags: ['system', 'status']
  },
  {
    name: 'is_published',
    type: 'boolean',
    caption: 'Is Published',
    component: 5, // Checkbox
    category: 'status',
    is_system: true,
    config: {
      defaultValue: false
    },
    mixins: ['indexed'],
    tags: ['system', 'publishing']
  },
  {
    name: 'is_featured',
    type: 'boolean',
    caption: 'Is Featured',
    component: 5, // Checkbox
    category: 'status',
    is_system: true,
    config: {
      defaultValue: false
    },
    mixins: ['indexed'],
    tags: ['system', 'content']
  },
  {
    name: 'status',
    type: 'string',
    caption: 'Status',
    component: 0, // EntitySelect
    category: 'status',
    is_system: true,
    config: {
      options: [
        { value: 'draft', label: 'Draft' },
        { value: 'pending', label: 'Pending' },
        { value: 'approved', label: 'Approved' },
        { value: 'published', label: 'Published' },
        { value: 'archived', label: 'Archived' }
      ],
      defaultValue: 'draft'
    },
    mixins: ['indexed', 'sortable'],
    tags: ['system', 'workflow']
  },

  // === Common References ===
  {
    name: 'created_by',
    type: 'reference',
    caption: 'Created By',
    component: 0, // EntitySelect
    category: 'references',
    is_system: true,
    config: {
      entitySchemaName: 'users',
      displayField: 'name',
      readOnly: true
    },
    mixins: ['readonly', 'indexed'],
    tags: ['system', 'audit']
  },
  {
    name: 'updated_by',
    type: 'reference',
    caption: 'Updated By',
    component: 0, // EntitySelect
    category: 'references',
    is_system: true,
    config: {
      entitySchemaName: 'users',
      displayField: 'name',
      readOnly: true
    },
    mixins: ['readonly', 'indexed'],
    tags: ['system', 'audit']
  },
  {
    name: 'owner_id',
    type: 'reference',
    caption: 'Owner',
    component: 0, // EntitySelect
    category: 'references',
    is_system: true,
    config: {
      entitySchemaName: 'users',
      displayField: 'name'
    },
    mixins: ['indexed'],
    tags: ['system', 'ownership']
  },
  {
    name: 'parent_id',
    type: 'reference',
    caption: 'Parent',
    component: 0, // EntitySelect
    category: 'references',
    is_system: true,
    config: {
      entitySchemaName: 'self',
      displayField: 'name'
    },
    mixins: ['indexed'],
    tags: ['system', 'hierarchy']
  },

  // === Common Numbers ===
  {
    name: 'sort_order',
    type: 'number',
    caption: 'Sort Order',
    component: 4, // Number
    category: 'numbers',
    is_system: true,
    config: {
      min: 0,
      step: 1,
      defaultValue: 0
    },
    mixins: ['sortable', 'indexed'],
    tags: ['system', 'ordering']
  },
  {
    name: 'version',
    type: 'number',
    caption: 'Version',
    component: 4, // Number
    category: 'numbers',
    is_system: true,
    config: {
      min: 1,
      step: 1,
      defaultValue: 1,
      readOnly: true
    },
    mixins: ['readonly'],
    tags: ['system', 'versioning']
  },
  {
    name: 'view_count',
    type: 'number',
    caption: 'View Count',
    component: 4, // Number
    category: 'numbers',
    is_system: true,
    config: {
      min: 0,
      step: 1,
      defaultValue: 0,
      readOnly: true
    },
    mixins: ['readonly', 'sortable'],
    tags: ['system', 'analytics']
  },

  // === Common JSON Fields ===
  {
    name: 'metadata',
    type: 'json',
    caption: 'Metadata',
    component: 10, // TextInput (JSON editor)
    category: 'json',
    is_system: true,
    config: {
      jsonEditor: true,
      defaultValue: {}
    },
    mixins: [],
    tags: ['system', 'flexible']
  },
  {
    name: 'settings',
    type: 'json',
    caption: 'Settings',
    component: 10, // TextInput (JSON editor)
    category: 'json',
    is_system: true,
    config: {
      jsonEditor: true,
      defaultValue: {}
    },
    mixins: [],
    tags: ['system', 'configuration']
  },

  // === Common Arrays ===
  {
    name: 'tags',
    type: 'array',
    caption: 'Tags',
    component: 10, // TextInput with tags
    category: 'arrays',
    is_system: true,
    config: {
      inputType: 'tags',
      placeholder: 'Add tags...'
    },
    mixins: ['searchable'],
    tags: ['system', 'taxonomy']
  },
  {
    name: 'categories',
    type: 'array',
    caption: 'Categories',
    component: 0, // EntitySelect (multi)
    category: 'arrays',
    is_system: true,
    config: {
      entitySchemaName: 'categories',
      displayField: 'name',
      multiple: true
    },
    mixins: ['indexed'],
    tags: ['system', 'taxonomy']
  },

  // === Common URLs/Media ===
  {
    name: 'url',
    type: 'string',
    caption: 'URL',
    component: 10, // TextInput
    category: 'media',
    is_system: true,
    config: {
      inputType: 'url',
      pattern: '^https?://',
      placeholder: 'https://...'
    },
    mixins: [],
    tags: ['system', 'links']
  },
  {
    name: 'image_url',
    type: 'string',
    caption: 'Image URL',
    component: 10, // TextInput
    category: 'media',
    is_system: true,
    config: {
      inputType: 'url',
      pattern: '^https?://',
      placeholder: 'https://...',
      preview: true
    },
    mixins: [],
    tags: ['system', 'media']
  },
  {
    name: 'thumbnail_url',
    type: 'string',
    caption: 'Thumbnail URL',
    component: 10, // TextInput
    category: 'media',
    is_system: true,
    config: {
      inputType: 'url',
      pattern: '^https?://',
      placeholder: 'https://...',
      preview: true
    },
    mixins: [],
    tags: ['system', 'media']
  }
];

// Function to import all system properties
export async function importSystemProperties(): Promise<{
  success: number;
  failed: number;
  errors: string[];
}> {
  console.log('[ImportSystemProperties] Starting import of system properties...');
  
  let successCount = 0;
  let failedCount = 0;
  const errors: string[] = [];
  
  for (const propertyData of systemProperties) {
    try {
      console.log(`[ImportSystemProperties] Importing property: ${propertyData.name}`);
      
      // Check if property already exists
      const existingProperties = propertyRegistryStore.propertiesList.value;
      const exists = existingProperties.some(p => p.name === propertyData.name);
      
      if (exists) {
        console.log(`[ImportSystemProperties] Property ${propertyData.name} already exists, skipping...`);
        continue;
      }
      
      await propertyRegistryStore.createProperty(propertyData);
      successCount++;
      console.log(`[ImportSystemProperties] Successfully imported: ${propertyData.name}`);
    } catch (error) {
      failedCount++;
      const errorMsg = `Failed to import ${propertyData.name}: ${error}`;
      console.error(`[ImportSystemProperties] ${errorMsg}`);
      errors.push(errorMsg);
    }
  }
  
  console.log(`[ImportSystemProperties] Import complete. Success: ${successCount}, Failed: ${failedCount}`);
  
  return {
    success: successCount,
    failed: failedCount,
    errors
  };
}

// Function to get a preview of what will be imported
export function getSystemPropertiesPreview(): typeof systemProperties {
  return systemProperties;
}