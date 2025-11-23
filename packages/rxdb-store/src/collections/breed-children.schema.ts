import type { RxJsonSchema } from 'rxdb';

/**
 * Breed Children Document Type
 *
 * Union schema for all child tables belonging to breed entity:
 * - achievement_in_breed
 * - breed_division
 * - breed_in_kennel
 * - coat_color_in_breed
 * - coat_type_in_breed
 * - pet_size_in_breed
 * - body_feature_in_breed
 * - health_exam_object_in_breed
 * - measurement_type_in_breed
 * - payment_in_breed
 * - top_patron_in_breed
 * - top_pet_in_breed
 * - related_breed
 * - breed_synonym
 * - breed_forecast
 * - breed_in_contact
 * - breed_in_account
 */
export interface BreedChildrenDocument {
  // Meta fields for table identification
  id: string;
  tableType: 'achievement_in_breed' | 'breed_division' | 'breed_in_kennel' | 'coat_color_in_breed' | 'coat_type_in_breed' | 'pet_size_in_breed' | 'body_feature_in_breed' | 'health_exam_object_in_breed' | 'measurement_type_in_breed' | 'payment_in_breed' | 'top_patron_in_breed' | 'top_pet_in_breed' | 'related_breed' | 'breed_synonym' | 'breed_forecast' | 'breed_in_contact' | 'breed_in_account';
  parentId: string;  // breed_id reference

  // System fields (common for all tables)
  created_at?: string;
  created_by?: string;
  updated_at?: string;
  updated_by?: string;

  // achievement_in_breed specific fields
  achievement_id?: string;
  date?: string;  // achievement date

  // breed_division specific fields
  division_id?: string;
  division_name?: string;
  description?: string;

  // breed_in_kennel specific fields
  kennel_id?: string;
  kennel_name?: string;
  pet_count?: number;

  // coat_color_in_breed specific fields
  coat_color_id?: string;

  // coat_type_in_breed specific fields
  coat_type_id?: string;

  // pet_size_in_breed specific fields
  pet_size_id?: string;

  // body_feature_in_breed specific fields
  body_feature_id?: string;

  // health_exam_object_in_breed specific fields
  health_exam_object_id?: string;

  // measurement_type_in_breed specific fields
  measurement_type_id?: string;

  // payment_in_breed specific fields
  payment_id?: string;
  amount?: number;
  currency?: string;
  payment_date?: string;

  // top_patron_in_breed specific fields
  patron_id?: string;
  rank?: number;

  // top_pet_in_breed specific fields
  pet_id?: string;

  // related_breed specific fields
  related_breed_id?: string;
  relation_type?: string;

  // breed_synonym specific fields
  synonym?: string;
  language?: string;

  // breed_forecast specific fields
  forecast_date?: string;
  metric?: string;
  value?: number;

  // breed_in_contact specific fields
  contact_id?: string;
  role?: string;

  // breed_in_account specific fields
  account_id?: string;

  // Common optional fields
  notes?: string;
  status?: string;
  order?: number;
}

/**
 * RxDB Schema for breed_children collection
 *
 * Uses union schema approach to store all child table types in one collection.
 * Indexed by [_table_type, _parent_id] for efficient queries.
 */
export const breedChildrenSchema: RxJsonSchema<BreedChildrenDocument> = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    // Primary key
    id: {
      type: 'string',
      maxLength: 36
    },

    // Meta fields (camelCase required by RxDB - no leading underscores)
    tableType: {
      type: 'string',
      enum: [
        'achievement_in_breed',
        'breed_division',
        'breed_in_kennel',
        'coat_color_in_breed',
        'coat_type_in_breed',
        'pet_size_in_breed',
        'body_feature_in_breed',
        'health_exam_object_in_breed',
        'measurement_type_in_breed',
        'payment_in_breed',
        'top_patron_in_breed',
        'top_pet_in_breed',
        'related_breed',
        'breed_synonym',
        'breed_forecast',
        'breed_in_contact',
        'breed_in_account'
      ],
      maxLength: 50
    },
    parentId: {
      type: 'string',
      maxLength: 36
    },

    // System fields
    created_at: { type: 'string' },
    created_by: { type: 'string', maxLength: 36 },
    updated_at: { type: 'string' },
    updated_by: { type: 'string', maxLength: 36 },

    // achievement_in_breed
    achievement_id: { type: 'string', maxLength: 36 },
    date: { type: 'string' },

    // breed_division
    division_id: { type: 'string', maxLength: 36 },
    division_name: { type: 'string', maxLength: 250 },
    description: { type: 'string', maxLength: 1000 },

    // breed_in_kennel
    kennel_id: { type: 'string', maxLength: 36 },
    kennel_name: { type: 'string', maxLength: 250 },
    pet_count: { type: 'number' },

    // Foreign keys for various child tables
    coat_color_id: { type: 'string', maxLength: 36 },
    coat_type_id: { type: 'string', maxLength: 36 },
    pet_size_id: { type: 'string', maxLength: 36 },
    body_feature_id: { type: 'string', maxLength: 36 },
    health_exam_object_id: { type: 'string', maxLength: 36 },
    measurement_type_id: { type: 'string', maxLength: 36 },
    payment_id: { type: 'string', maxLength: 36 },
    patron_id: { type: 'string', maxLength: 36 },
    pet_id: { type: 'string', maxLength: 36 },
    related_breed_id: { type: 'string', maxLength: 36 },
    contact_id: { type: 'string', maxLength: 36 },
    account_id: { type: 'string', maxLength: 36 },

    // Specific fields
    rank: { type: 'number' },
    relation_type: { type: 'string', maxLength: 100 },
    synonym: { type: 'string', maxLength: 250 },
    language: { type: 'string', maxLength: 10 },
    forecast_date: { type: 'string' },
    metric: { type: 'string', maxLength: 100 },
    value: { type: 'number' },
    amount: { type: 'number' },
    currency: { type: 'string', maxLength: 10 },
    payment_date: { type: 'string' },
    role: { type: 'string', maxLength: 100 },

    // Common fields
    notes: { type: 'string', maxLength: 1000 },
    status: { type: 'string', maxLength: 50 },
    order: { type: 'number' }
  },
  required: ['id', 'tableType', 'parentId'],
  indexes: [
    // Composite index for querying child records by parent and table type
    ['parentId', 'tableType']
  ]
};
