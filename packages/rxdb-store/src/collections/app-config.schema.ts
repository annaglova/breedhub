import type { RxJsonSchema } from 'rxdb';
import type { AppConfig } from '../stores/app-config.signal-store';

export const appConfigSchema: RxJsonSchema<AppConfig> = {
  version: 0, // Keep at 0 to avoid migration issues
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: {
      type: 'string',
      maxLength: 250
    },
    type: {
      type: 'string',
      enum: ['field', 'entity', 'mixin', 'feature', 'template', 'ui_config', 'property', 'field_property', 'entity_field', 'app', 'workspace', 'space', 'view', 'page', 'sort', 'filter', 'fields', 'tab', 'tabs', 'extension', 'user_config', 'menu_config', 'menu_section', 'menu_item'],
      maxLength: 50
    },
    
    // Configuration data
    self_data: {
      type: 'object'
    },
    override_data: {
      type: 'object'
    },
    data: {
      type: 'object'
    },
    
    // Dependencies
    deps: {
      type: 'array',
      items: {
        type: 'string'
      },
      default: []
    },
    
    // Metadata
    caption: {
      type: ['string', 'null'],
      maxLength: 250
    },
    category: {
      type: ['string', 'null'],
      maxLength: 250
    },
    tags: {
      type: 'array',
      items: {
        type: 'string'
      },
      default: []
    },
    version: {
      type: 'number',
      minimum: 1,
      default: 1
    },
    
    // Audit fields
    created_at: {
      type: ['string', 'null'],
      format: 'date-time',
      maxLength: 250
    },
    updated_at: {
      type: ['string', 'null'],
      format: 'date-time',
      maxLength: 250
    },
    created_by: {
      type: ['string', 'null'],
      maxLength: 250
    },
    updated_by: {
      type: ['string', 'null'],
      maxLength: 250
    },
    
    deleted_at: {
      type: ['string', 'null'],
      format: 'date-time',
      maxLength: 250
    },
    
    // RxDB internal (maps to 'deleted' in Supabase)
    _deleted: {
      type: 'boolean',
      default: false
    }
  },
  required: ['id', 'type', 'self_data', 'override_data', 'data', 'deps', 'version', '_deleted'],
  indexes: [
    'type',
    '_deleted',
    ['type', '_deleted'] // Composite index for filtered queries
  ],
  attachments: {}
};