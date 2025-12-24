/**
 * Field Normalization Utilities
 *
 * Handles conversion between config-level field names and DB-level field names.
 *
 * Config level uses prefixed names for disambiguation:
 *   breed_field_pet_type_id, breed_field_measurements
 *
 * DB level uses clean snake_case names:
 *   pet_type_id, measurements
 */

/**
 * Remove entity field prefix from field name
 *
 * Used for converting config field names to DB field names.
 *
 * @example
 * removeFieldPrefix('breed_field_measurements', 'breed') // => 'measurements'
 * removeFieldPrefix('pet_field_owner_id', 'pet') // => 'owner_id'
 * removeFieldPrefix('already_clean', 'breed') // => 'already_clean'
 */
export function removeFieldPrefix(fieldName: string, entityType: string): string {
  return fieldName.replace(new RegExp(`^${entityType}_field_`), '');
}

/**
 * Add entity field prefix to field name
 *
 * Used for converting DB field names to config field names.
 *
 * @example
 * addFieldPrefix('measurements', 'breed') // => 'breed_field_measurements'
 * addFieldPrefix('owner_id', 'pet') // => 'pet_field_owner_id'
 */
export function addFieldPrefix(fieldName: string, entityType: string): string {
  // Don't double-prefix
  if (fieldName.startsWith(`${entityType}_field_`)) {
    return fieldName;
  }
  return `${entityType}_field_${fieldName}`;
}

/**
 * Check if field name has entity prefix
 *
 * @example
 * hasFieldPrefix('breed_field_measurements', 'breed') // => true
 * hasFieldPrefix('measurements', 'breed') // => false
 */
export function hasFieldPrefix(fieldName: string, entityType: string): boolean {
  return fieldName.startsWith(`${entityType}_field_`);
}

/**
 * Extract field name from prefixed ID without knowing entityType
 *
 * Useful when you have field ID like "breed_field_pet_type_id" but don't
 * know the entity type. Splits on "_field_" and returns the last part.
 *
 * @example
 * extractFieldName('breed_field_measurements') // => 'measurements'
 * extractFieldName('pet_field_owner_id') // => 'owner_id'
 * extractFieldName('already_clean') // => 'already_clean'
 * extractFieldName('field_name') // => 'name' (handles "field_" prefix too)
 */
export function extractFieldName(fieldId: string): string {
  // Handle "field_" prefix (without entity)
  if (fieldId.startsWith('field_')) {
    return fieldId.substring(6);
  }
  // Handle "{entity}_field_{name}" pattern
  const parts = fieldId.split('_field_');
  return parts.length > 1 ? parts[1] : fieldId;
}

/**
 * Normalize field name to DB format (snake_case, no prefix)
 *
 * This is an alias for removeFieldPrefix for clearer intent.
 */
export const normalizeToDbField = removeFieldPrefix;

/**
 * Normalize field name to config format (with entity prefix)
 *
 * This is an alias for addFieldPrefix for clearer intent.
 */
export const normalizeToConfigField = addFieldPrefix;
