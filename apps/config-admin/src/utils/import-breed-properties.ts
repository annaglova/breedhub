import { propertyRegistryStore, type PropertyDefinition } from '@breedhub/rxdb-store';

// Define breed-related properties based on existing breed entities and schemas
const breedProperties: Partial<PropertyDefinition>[] = [
  // Basic breed properties
  {
    name: 'breed_name',
    type: 'string',
    caption: 'Breed Name',
    component: 10, // TextInput
    category: 'breed',
    is_system: false,
    config: {
      maxLength: 200,
      minLength: 2,
      placeholder: 'Enter breed name',
      isRequired: true,
      validators: [
        { type: 'required', message: 'Breed name is required' },
        { type: 'minLength', value: 2, message: 'Name must be at least 2 characters' }
      ]
    },
    mixins: ['required', 'searchable', 'sortable', 'indexed'],
    tags: ['breed', 'core']
  },
  {
    name: 'authentic_name',
    type: 'string',
    caption: 'Authentic Name',
    component: 10, // TextInput
    category: 'breed',
    is_system: false,
    config: {
      maxLength: 200,
      placeholder: 'Native/original breed name',
      translatable: true
    },
    mixins: ['searchable', 'translatable'],
    tags: ['breed', 'i18n']
  },
  {
    name: 'pet_type_id',
    type: 'string',
    caption: 'Pet Type',
    component: 0, // EntitySelect
    category: 'breed',
    is_system: false,
    config: {
      entitySchemaName: 'pet_types',
      displayField: 'name',
      valueField: 'id',
      options: [
        { value: 'dog', label: 'Dog' },
        { value: 'cat', label: 'Cat' }
      ],
      isRequired: true
    },
    mixins: ['required', 'indexed'],
    tags: ['breed', 'classification']
  },
  {
    name: 'bred_for',
    type: 'string',
    caption: 'Bred For',
    component: 10, // TextInput
    category: 'breed',
    is_system: false,
    config: {
      maxLength: 500,
      placeholder: 'Purpose or role (e.g., Hunting, Companion)',
      multiline: true
    },
    mixins: ['searchable'],
    tags: ['breed', 'characteristics']
  },
  {
    name: 'breed_group',
    type: 'string',
    caption: 'Breed Group',
    component: 0, // EntitySelect
    category: 'breed',
    is_system: false,
    config: {
      entitySchemaName: 'breed_groups',
      displayField: 'name',
      options: [
        { value: 'sporting', label: 'Sporting' },
        { value: 'hound', label: 'Hound' },
        { value: 'working', label: 'Working' },
        { value: 'terrier', label: 'Terrier' },
        { value: 'toy', label: 'Toy' },
        { value: 'non-sporting', label: 'Non-Sporting' },
        { value: 'herding', label: 'Herding' }
      ]
    },
    mixins: ['indexed', 'sortable'],
    tags: ['breed', 'classification']
  },
  {
    name: 'life_span',
    type: 'string',
    caption: 'Life Span',
    component: 10, // TextInput
    category: 'breed',
    is_system: false,
    config: {
      maxLength: 50,
      placeholder: 'e.g., 10-12 years',
      pattern: '^\\d{1,2}-\\d{1,2}\\s+years?$'
    },
    mixins: [],
    tags: ['breed', 'characteristics']
  },
  {
    name: 'temperament',
    type: 'array',
    caption: 'Temperament',
    component: 10, // TextInput with tags
    category: 'breed',
    is_system: false,
    config: {
      inputType: 'tags',
      placeholder: 'Add temperament traits',
      suggestions: ['Friendly', 'Loyal', 'Playful', 'Calm', 'Energetic', 'Protective', 'Intelligent']
    },
    mixins: ['searchable'],
    tags: ['breed', 'characteristics']
  },
  {
    name: 'origin',
    type: 'string',
    caption: 'Origin',
    component: 0, // EntitySelect
    category: 'breed',
    is_system: false,
    config: {
      entitySchemaName: 'countries',
      displayField: 'name',
      placeholder: 'Country of origin'
    },
    mixins: ['indexed'],
    tags: ['breed', 'geography']
  },
  
  // Physical characteristics
  {
    name: 'weight_min',
    type: 'number',
    caption: 'Min Weight (kg)',
    component: 4, // Number
    category: 'breed_physical',
    is_system: false,
    config: {
      min: 0,
      max: 200,
      step: 0.5,
      unit: 'kg',
      placeholder: 'Minimum weight'
    },
    mixins: [],
    tags: ['breed', 'physical']
  },
  {
    name: 'weight_max',
    type: 'number',
    caption: 'Max Weight (kg)',
    component: 4, // Number
    category: 'breed_physical',
    is_system: false,
    config: {
      min: 0,
      max: 200,
      step: 0.5,
      unit: 'kg',
      placeholder: 'Maximum weight'
    },
    mixins: [],
    tags: ['breed', 'physical']
  },
  {
    name: 'height_min',
    type: 'number',
    caption: 'Min Height (cm)',
    component: 4, // Number
    category: 'breed_physical',
    is_system: false,
    config: {
      min: 0,
      max: 150,
      step: 1,
      unit: 'cm',
      placeholder: 'Minimum height'
    },
    mixins: [],
    tags: ['breed', 'physical']
  },
  {
    name: 'height_max',
    type: 'number',
    caption: 'Max Height (cm)',
    component: 4, // Number
    category: 'breed_physical',
    is_system: false,
    config: {
      min: 0,
      max: 150,
      step: 1,
      unit: 'cm',
      placeholder: 'Maximum height'
    },
    mixins: [],
    tags: ['breed', 'physical']
  },
  
  // Statistics
  {
    name: 'registration_count',
    type: 'number',
    caption: 'Registration Count',
    component: 4, // Number
    category: 'breed_stats',
    is_system: false,
    config: {
      min: 0,
      step: 1,
      readOnly: true,
      defaultValue: 0
    },
    mixins: ['readonly', 'indexed', 'sortable'],
    tags: ['breed', 'statistics']
  },
  {
    name: 'kennel_count',
    type: 'number',
    caption: 'Kennel Count',
    component: 4, // Number
    category: 'breed_stats',
    is_system: false,
    config: {
      min: 0,
      step: 1,
      readOnly: true,
      defaultValue: 0
    },
    mixins: ['readonly', 'indexed', 'sortable'],
    tags: ['breed', 'statistics']
  },
  {
    name: 'patron_count',
    type: 'number',
    caption: 'Patron Count',
    component: 4, // Number
    category: 'breed_stats',
    is_system: false,
    config: {
      min: 0,
      step: 1,
      readOnly: true,
      defaultValue: 0
    },
    mixins: ['readonly', 'indexed', 'sortable'],
    tags: ['breed', 'statistics']
  },
  
  // Media
  {
    name: 'photo_url',
    type: 'string',
    caption: 'Photo URL',
    component: 10, // TextInput
    category: 'media',
    is_system: false,
    config: {
      inputType: 'url',
      placeholder: 'https://...',
      pattern: '^https?://',
      preview: true
    },
    mixins: [],
    tags: ['breed', 'media']
  },
  {
    name: 'avatar_url',
    type: 'string',
    caption: 'Avatar URL',
    component: 10, // TextInput
    category: 'media',
    is_system: false,
    config: {
      inputType: 'url',
      placeholder: 'https://...',
      pattern: '^https?://',
      preview: true
    },
    mixins: [],
    tags: ['breed', 'media']
  },
  
  // Metadata
  {
    name: 'has_notes',
    type: 'boolean',
    caption: 'Has Notes',
    component: 5, // Checkbox
    category: 'metadata',
    is_system: false,
    config: {
      defaultValue: false
    },
    mixins: [],
    tags: ['breed', 'metadata']
  },
  {
    name: 'achievement_progress',
    type: 'number',
    caption: 'Achievement Progress',
    component: 4, // Number
    category: 'metadata',
    is_system: false,
    config: {
      min: 0,
      max: 100,
      step: 1,
      unit: '%',
      readOnly: true
    },
    mixins: ['readonly'],
    tags: ['breed', 'progress']
  }
];

// Function to import all breed properties
export async function importBreedProperties(): Promise<{
  success: number;
  failed: number;
  errors: string[];
}> {
  console.log('[ImportBreedProperties] Starting import of breed properties...');
  
  let successCount = 0;
  let failedCount = 0;
  const errors: string[] = [];
  
  for (const propertyData of breedProperties) {
    try {
      console.log(`[ImportBreedProperties] Importing property: ${propertyData.name}`);
      
      // Check if property already exists
      const existingProperties = propertyRegistryStore.propertiesList.value;
      const exists = existingProperties.some(p => p.name === propertyData.name);
      
      if (exists) {
        console.log(`[ImportBreedProperties] Property ${propertyData.name} already exists, skipping...`);
        continue;
      }
      
      await propertyRegistryStore.createProperty(propertyData);
      successCount++;
      console.log(`[ImportBreedProperties] Successfully imported: ${propertyData.name}`);
    } catch (error) {
      failedCount++;
      const errorMsg = `Failed to import ${propertyData.name}: ${error}`;
      console.error(`[ImportBreedProperties] ${errorMsg}`);
      errors.push(errorMsg);
    }
  }
  
  console.log(`[ImportBreedProperties] Import complete. Success: ${successCount}, Failed: ${failedCount}`);
  
  return {
    success: successCount,
    failed: failedCount,
    errors
  };
}

// Function to get a preview of what will be imported
export function getBreedPropertiesPreview(): typeof breedProperties {
  return breedProperties;
}