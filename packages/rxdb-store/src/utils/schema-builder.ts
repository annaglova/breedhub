/**
 * Schema Builder - Generates RxDB schemas from space configuration.
 *
 * Pure function: takes config, returns schema. No store state needed.
 * Extracted from SpaceStore.
 */
import type { RxJsonSchema } from 'rxdb';

/**
 * VIEW sources for entities that use database VIEWs instead of base tables.
 * Currently empty — all entities use base tables with client-side enrichment.
 */
export const ENTITY_VIEW_SOURCES: Record<string, {
  viewName: string;
  extraFields: Record<string, { type: string; maxLength?: number }>;
}> = {};

/**
 * Generate RxDB schema from space configuration fields.
 */
export function generateSchemaForEntity(
  entityType: string,
  spaceConfig: { fields?: Record<string, any> }
): RxJsonSchema<any> | null {
  if (!spaceConfig) {
    console.error(`[SchemaBuilder] No space configuration found for ${entityType}`);
    return null;
  }

  console.log(`[SchemaBuilder] Generating schema for ${entityType}:`);
  console.log('  - Fields:', Object.keys(spaceConfig.fields || {}));

  const properties: any = {};
  const required: string[] = [];

  const addFieldToSchema = (fieldKey: string, fieldConfig: any) => {
    if (properties[fieldKey]) return;

    let schemaType = 'string';
    const fieldType = fieldConfig?.fieldType || fieldConfig?.type || 'string';

    switch (fieldType) {
      case 'uuid':
      case 'string':
      case 'text':
        schemaType = 'string';
        break;
      case 'number':
      case 'integer':
        schemaType = 'number';
        break;
      case 'boolean':
        schemaType = 'boolean';
        break;
      case 'json':
        properties[fieldKey] = {};
        return;
      case 'object':
        schemaType = 'object';
        break;
      case 'array':
        schemaType = 'array';
        break;
    }

    properties[fieldKey] = { type: schemaType };

    if (schemaType === 'string') {
      const maxLength = fieldConfig?.maxLength;
      if (maxLength) {
        properties[fieldKey].maxLength = maxLength;
      } else if (fieldType === 'uuid') {
        properties[fieldKey].maxLength = 36;
      }
    }

    if (fieldConfig?.required || fieldConfig?.isPrimaryKey) {
      required.push(fieldKey);
    }
  };

  // Process fields from config
  if (spaceConfig.fields) {
    Object.entries(spaceConfig.fields).forEach(([fieldKey, fieldConfig]) => {
      addFieldToSchema(fieldKey, fieldConfig);
    });
  }

  // Ensure system fields
  if (!properties.id) {
    properties.id = { type: 'string', maxLength: 36 };
    required.push('id');
  } else if (!properties.id.maxLength && properties.id.type === 'string') {
    properties.id.maxLength = 36;
  }
  if (!properties.created_at) properties.created_at = { type: 'string' };
  if (!properties.updated_at) properties.updated_at = { type: 'string' };
  if (!properties.created_by) properties.created_by = { type: 'string' };
  if (!properties.updated_by) properties.updated_by = { type: 'string' };
  if (!properties._deleted) properties._deleted = { type: 'boolean' };
  if (!properties.cachedAt) {
    properties.cachedAt = {
      type: 'number',
      multipleOf: 1,
      minimum: 0,
      maximum: 9999999999999,
    };
  }

  // Add VIEW-specific extra fields
  const viewConfig = ENTITY_VIEW_SOURCES[entityType];
  if (viewConfig?.extraFields) {
    for (const [fieldName, fieldSchema] of Object.entries(viewConfig.extraFields)) {
      if (!properties[fieldName]) {
        properties[fieldName] = { ...fieldSchema };
      }
    }
  }

  const schema: RxJsonSchema<any> = {
    version: 2,
    primaryKey: 'id',
    type: 'object',
    properties,
    required: required.length > 0 ? required : ['id'],
  };

  console.log(`[SchemaBuilder] Generated schema for ${entityType} with ${Object.keys(properties).length} properties`);
  return schema;
}
