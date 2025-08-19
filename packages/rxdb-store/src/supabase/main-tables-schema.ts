import { RxJsonSchema } from 'rxdb';

/**
 * Main tables configuration
 * These are the primary tables that will have RxDB collections
 * Partitioned data (like pets by breed) will be handled via filtering
 */
export const MAIN_TABLES = {
  // Core breeding entities
  breeds: {
    description: 'Breed definitions and standards',
    hasPartitions: false
  },
  dogs: {
    description: 'Individual dogs registry',
    hasPartitions: false
  },
  pets: {
    description: 'All pets data (partitioned by breed_id in PostgreSQL)',
    hasPartitions: true,
    partitionKey: 'breed_id'
  },
  persons: {
    description: 'People (owners, breeders, handlers)',
    hasPartitions: false
  },
  kennels: {
    description: 'Kennel registry',
    hasPartitions: false
  },
  
  // Breeding operations
  litters: {
    description: 'Litter records',
    hasPartitions: false
  },
  breedings: {
    description: 'Breeding pairs and plans',
    hasPartitions: false
  },
  puppies: {
    description: 'Puppy records',
    hasPartitions: false
  },
  
  // Health & Documentation
  health_tests: {
    description: 'Health test results',
    hasPartitions: false
  },
  pedigrees: {
    description: 'Pedigree information',
    hasPartitions: false
  },
  pet_photos: {
    description: 'Pet photo gallery (partitioned by breed_id)',
    hasPartitions: true,
    partitionKey: 'breed_id'
  },
  pet_documents: {
    description: 'Pet documents (partitioned by breed_id)',
    hasPartitions: true,
    partitionKey: 'breed_id'
  },
  
  // Configuration & Services
  service_item: {
    description: 'Available services',
    hasPartitions: false
  },
  conf_item: {
    description: 'Configuration items',
    hasPartitions: false
  },
  
  // User & System
  users: {
    description: 'User accounts',
    hasPartitions: false
  },
  profiles: {
    description: 'User profiles',
    hasPartitions: false
  },
  subscriptions: {
    description: 'User subscriptions',
    hasPartitions: false
  }
};

/**
 * Base RxDB schema properties common to all collections
 */
const baseProperties = {
  id: {
    type: 'string',
    primary: true,
    maxLength: 36
  },
  created_at: {
    type: 'string',
    format: 'date-time'
  },
  updated_at: {
    type: 'string',
    format: 'date-time'
  }
};

/**
 * Generate RxDB schema for breeds table
 */
export const breedsSchema: RxJsonSchema<any> = {
  version: 0,
  title: 'breeds',
  description: 'Breed definitions and standards',
  primaryKey: 'id',
  type: 'object',
  properties: {
    ...baseProperties,
    name: {
      type: 'string',
      maxLength: 255
    },
    breed_code: {
      type: 'string',
      maxLength: 50
    },
    group: {
      type: 'string',
      maxLength: 100
    },
    origin_country: {
      type: 'string',
      maxLength: 100
    },
    description: {
      type: 'string'
    },
    characteristics: {
      type: 'object'
    }
  },
  required: ['id', 'name'],
  indexes: ['name', 'breed_code', 'updated_at']
};

/**
 * Generate RxDB schema for pets table (main collection for all pet partitions)
 */
export const petsSchema: RxJsonSchema<any> = {
  version: 0,
  title: 'pets',
  description: 'All pets across all breeds',
  primaryKey: 'id',
  type: 'object',
  properties: {
    ...baseProperties,
    breed_id: {
      type: 'string',
      maxLength: 36
    },
    name: {
      type: 'string',
      maxLength: 255
    },
    registration_number: {
      type: 'string',
      maxLength: 100
    },
    microchip: {
      type: 'string',
      maxLength: 50
    },
    gender: {
      type: 'string',
      enum: ['male', 'female']
    },
    birth_date: {
      type: 'string',
      format: 'date'
    },
    color: {
      type: 'string',
      maxLength: 100
    },
    owner_id: {
      type: 'string',
      maxLength: 36
    },
    breeder_id: {
      type: 'string',
      maxLength: 36
    },
    kennel_id: {
      type: 'string',
      maxLength: 36
    },
    status: {
      type: 'string',
      maxLength: 50
    },
    health_status: {
      type: 'object'
    },
    achievements: {
      type: 'array',
      items: {
        type: 'object'
      }
    }
  },
  required: ['id', 'breed_id', 'name'],
  indexes: ['breed_id', 'name', 'owner_id', 'breeder_id', 'updated_at']
};

/**
 * Generate RxDB schema for dogs table
 */
export const dogsSchema: RxJsonSchema<any> = {
  version: 0,
  title: 'dogs',
  description: 'Individual dogs registry',
  primaryKey: 'id',
  type: 'object',
  properties: {
    ...baseProperties,
    name: {
      type: 'string',
      maxLength: 255
    },
    breed_id: {
      type: 'string',
      maxLength: 36
    },
    registration_number: {
      type: 'string',
      maxLength: 100
    },
    microchip: {
      type: 'string',
      maxLength: 50
    },
    gender: {
      type: 'string',
      enum: ['male', 'female']
    },
    birth_date: {
      type: 'string',
      format: 'date'
    },
    color: {
      type: 'string',
      maxLength: 100
    },
    owner_id: {
      type: 'string',
      maxLength: 36
    },
    breeder_id: {
      type: 'string',
      maxLength: 36
    },
    kennel_id: {
      type: 'string',
      maxLength: 36
    },
    sire_id: {
      type: 'string',
      maxLength: 36
    },
    dam_id: {
      type: 'string',
      maxLength: 36
    },
    status: {
      type: 'string',
      maxLength: 50
    }
  },
  required: ['id', 'name', 'breed_id'],
  indexes: ['breed_id', 'name', 'owner_id', 'breeder_id', 'updated_at']
};

/**
 * Generate RxDB schema for persons table
 */
export const personsSchema: RxJsonSchema<any> = {
  version: 0,
  title: 'persons',
  description: 'People involved in breeding',
  primaryKey: 'id',
  type: 'object',
  properties: {
    ...baseProperties,
    first_name: {
      type: 'string',
      maxLength: 100
    },
    last_name: {
      type: 'string',
      maxLength: 100
    },
    email: {
      type: 'string',
      maxLength: 255
    },
    phone: {
      type: 'string',
      maxLength: 50
    },
    address: {
      type: 'object'
    },
    role: {
      type: 'string',
      enum: ['owner', 'breeder', 'handler', 'judge', 'vet']
    },
    license_number: {
      type: 'string',
      maxLength: 100
    }
  },
  required: ['id', 'first_name', 'last_name'],
  indexes: ['email', 'last_name', 'role', 'updated_at']
};

/**
 * Generate RxDB schema for kennels table
 */
export const kennelsSchema: RxJsonSchema<any> = {
  version: 0,
  title: 'kennels',
  description: 'Kennel registry',
  primaryKey: 'id',
  type: 'object',
  properties: {
    ...baseProperties,
    name: {
      type: 'string',
      maxLength: 255
    },
    prefix: {
      type: 'string',
      maxLength: 100
    },
    registration_number: {
      type: 'string',
      maxLength: 100
    },
    owner_id: {
      type: 'string',
      maxLength: 36
    },
    established_date: {
      type: 'string',
      format: 'date'
    },
    address: {
      type: 'object'
    },
    breeds: {
      type: 'array',
      items: {
        type: 'string'
      }
    },
    status: {
      type: 'string',
      maxLength: 50
    }
  },
  required: ['id', 'name', 'owner_id'],
  indexes: ['name', 'prefix', 'owner_id', 'updated_at']
};

/**
 * Map of all main table schemas
 */
export const MAIN_TABLE_SCHEMAS = {
  breeds: breedsSchema,
  pets: petsSchema,
  dogs: dogsSchema,
  persons: personsSchema,
  kennels: kennelsSchema
  // Additional schemas will be added as we discover the actual structure
};

/**
 * Configuration for syncing with partitioned tables
 */
export const PARTITION_SYNC_CONFIG = {
  pets: {
    // Sync only pets for selected breeds
    syncFilter: (doc: any, selectedBreeds: string[]) => {
      return selectedBreeds.includes(doc.breed_id);
    },
    // Query partition in PostgreSQL
    getPartitionTable: (breedId: string) => {
      // Convert breed_id to partition table name
      // This will be determined by actual partition naming convention
      return `pets_p_${breedId}`;
    }
  },
  pet_photos: {
    syncFilter: (doc: any, selectedBreeds: string[]) => {
      return selectedBreeds.includes(doc.breed_id);
    },
    getPartitionTable: (breedId: string) => {
      return `pet_photos_p_${breedId}`;
    }
  },
  pet_documents: {
    syncFilter: (doc: any, selectedBreeds: string[]) => {
      return selectedBreeds.includes(doc.breed_id);
    },
    getPartitionTable: (breedId: string) => {
      return `pet_documents_p_${breedId}`;
    }
  }
};

/**
 * Helper to create RxDB collections for main tables only
 */
export async function createMainCollections(database: any) {
  const collections: any = {};
  
  for (const [tableName, schema] of Object.entries(MAIN_TABLE_SCHEMAS)) {
    try {
      collections[tableName] = await database.addCollections({
        [tableName]: {
          schema
        }
      });
      
      console.log(`✅ Created RxDB collection for ${tableName}`);
    } catch (error) {
      console.error(`❌ Failed to create collection for ${tableName}:`, error);
    }
  }
  
  return collections;
}

/**
 * Get sync configuration for a specific breed
 */
export function getBreedSyncConfig(breedId: string) {
  return {
    collections: ['pets', 'pet_photos', 'pet_documents'],
    filters: {
      pets: { breed_id: breedId },
      pet_photos: { breed_id: breedId },
      pet_documents: { breed_id: breedId }
    },
    // Estimated data volume per breed
    estimatedDocuments: {
      pets: 1000,      // ~1000 pets per breed
      pet_photos: 5000, // ~5 photos per pet
      pet_documents: 2000 // ~2 documents per pet
    }
  };
}

/**
 * Strategy for handling 400+ breed partitions:
 * 
 * 1. Create RxDB collections only for main tables (~20 collections)
 * 2. Use breed_id field for filtering at query time
 * 3. Sync only data for active/selected breeds to manage volume
 * 4. Implement lazy loading for breed-specific data
 * 5. Use indexes on breed_id for efficient filtering
 * 
 * Benefits:
 * - Manageable number of collections
 * - Efficient memory usage
 * - Flexible breed selection
 * - Simpler replication logic
 */
export const PARTITION_STRATEGY = {
  approach: 'single-collection-filtered',
  description: 'One RxDB collection per main table, filter by breed_id',
  advantages: [
    'Only ~20 collections instead of 800+',
    'Simpler replication setup',
    'Lower memory footprint',
    'Easier to manage'
  ],
  implementation: [
    'Create collections for main tables only',
    'Add breed_id index to partitioned collections',
    'Filter queries by breed_id',
    'Sync only selected breeds data'
  ]
};