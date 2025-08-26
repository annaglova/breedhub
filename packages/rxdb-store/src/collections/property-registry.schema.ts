export const propertyRegistrySchema = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: {
      type: 'string',
      maxLength: 100
    },
    name: {
      type: 'string',
      maxLength: 255
    },
    type: {
      type: 'string',
      maxLength: 50
    },
    data_type: {
      type: 'string',
      default: ''
    },
    caption: {
      type: 'string',
      maxLength: 255
    },
    component: {
      type: 'number'
    },
    config: {
      type: 'object'
    },
    mixins: {
      type: 'array',
      items: {
        type: 'string'
      }
    },
    tags: {
      type: 'array',
      items: {
        type: 'string'
      }
    },
    category: {
      type: 'string',
      default: ''
    },
    version: {
      type: 'number'
    },
    is_system: {
      type: 'boolean'
    },
    created_at: {
      type: 'string'
    },
    updated_at: {
      type: 'string'
    },
    created_by: {
      type: 'string',
      default: ''
    },
    _deleted: {
      type: 'boolean',
      default: false
    }
  },
  required: ['id', 'name', 'type', 'caption', 'component']
};