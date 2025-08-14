/**
 * MultiStore Validators
 * 
 * CRITICAL FOR AI: This file contains ALL validation logic for MultiStore entities.
 * These validators ensure data integrity and prevent invalid states.
 * ALWAYS use these validators before any entity operations.
 */

import type {
  BaseEntity,
  EntityType,
  WorkspaceEntity,
  SpaceEntity,
  ViewEntity,
  FilterEntity,
  SortEntity,
  BreedEntity,
  PetEntity,
  KennelEntity,
  ContactEntity,
  AnyEntity
} from './types';

// ============================================================================
// VALIDATION ERRORS
// ============================================================================

export class ValidationError extends Error {
  constructor(
    message: string,
    public entityType: EntityType,
    public field?: string,
    public value?: any
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

// ============================================================================
// PARENT-CHILD RULES
// ============================================================================

/**
 * Defines which entity types can be children of other entity types
 * This enforces the hierarchy structure
 */
export const PARENT_CHILD_RULES: Record<EntityType, EntityType[]> = {
  workspace: ['space'],
  space: ['view', 'breed', 'pet', 'kennel', 'contact'],
  view: ['filter', 'sort'],
  filter: [],
  sort: [],
  breed: [],
  pet: [],
  kennel: [],
  contact: []
};

/**
 * Defines which entity types MUST have a parent
 * Workspace is the only entity that doesn't require a parent
 */
export const REQUIRES_PARENT: EntityType[] = [
  'space', 'view', 'filter', 'sort',
  'breed', 'pet', 'kennel', 'contact'
];

// ============================================================================
// BASE VALIDATORS
// ============================================================================

/**
 * Validates base entity fields that all entities must have
 */
export function validateBaseEntity(entity: Partial<BaseEntity>): void {
  if (!entity.id) {
    throw new ValidationError('Entity must have an id', entity._type || 'unknown');
  }

  if (!entity._type) {
    throw new ValidationError('Entity must have a _type', 'unknown', '_type');
  }

  const validTypes: EntityType[] = [
    'workspace', 'space', 'view', 'filter', 'sort',
    'breed', 'pet', 'kennel', 'contact'
  ];

  if (!validTypes.includes(entity._type)) {
    throw new ValidationError(
      `Invalid entity type: ${entity._type}`,
      entity._type,
      '_type',
      entity._type
    );
  }

  // Check parent requirement
  if (REQUIRES_PARENT.includes(entity._type) && !entity._parentId) {
    throw new ValidationError(
      `Entity type ${entity._type} requires a parent`,
      entity._type,
      '_parentId'
    );
  }

  // Workspace should not have a parent
  if (entity._type === 'workspace' && entity._parentId) {
    throw new ValidationError(
      'Workspace cannot have a parent',
      'workspace',
      '_parentId',
      entity._parentId
    );
  }

  // Validate metadata if present
  if (entity._metadata) {
    if (!entity._metadata.createdAt) {
      throw new ValidationError(
        'Metadata must have createdAt',
        entity._type,
        '_metadata.createdAt'
      );
    }
    if (!entity._metadata.updatedAt) {
      throw new ValidationError(
        'Metadata must have updatedAt',
        entity._type,
        '_metadata.updatedAt'
      );
    }
    if (typeof entity._metadata.version !== 'number') {
      throw new ValidationError(
        'Metadata must have version number',
        entity._type,
        '_metadata.version'
      );
    }
  }
}

/**
 * Validates parent-child relationship
 */
export function validateParentChild(
  parentType: EntityType,
  childType: EntityType
): void {
  const allowedChildren = PARENT_CHILD_RULES[parentType];
  
  if (!allowedChildren.includes(childType)) {
    throw new ValidationError(
      `${parentType} cannot have ${childType} as child. Allowed: ${allowedChildren.join(', ')}`,
      childType,
      '_parentId'
    );
  }
}

// ============================================================================
// ENTITY-SPECIFIC VALIDATORS
// ============================================================================

/**
 * Validates workspace entity
 */
export function validateWorkspace(entity: Partial<WorkspaceEntity>): void {
  validateBaseEntity(entity);

  if (!entity.name || entity.name.trim().length === 0) {
    throw new ValidationError('Workspace must have a name', 'workspace', 'name');
  }

  if (!['public', 'private'].includes(entity.visibility || '')) {
    throw new ValidationError(
      'Workspace visibility must be public or private',
      'workspace',
      'visibility',
      entity.visibility
    );
  }

  if (entity.permissions) {
    if (!Array.isArray(entity.permissions.read)) {
      throw new ValidationError(
        'Permissions.read must be an array',
        'workspace',
        'permissions.read'
      );
    }
    if (!Array.isArray(entity.permissions.write)) {
      throw new ValidationError(
        'Permissions.write must be an array',
        'workspace',
        'permissions.write'
      );
    }
    if (!Array.isArray(entity.permissions.admin)) {
      throw new ValidationError(
        'Permissions.admin must be an array',
        'workspace',
        'permissions.admin'
      );
    }
  }

  if (entity.settings?.theme && 
      !['light', 'dark', 'auto'].includes(entity.settings.theme)) {
    throw new ValidationError(
      'Invalid theme',
      'workspace',
      'settings.theme',
      entity.settings.theme
    );
  }
}

/**
 * Validates space entity
 */
export function validateSpace(entity: Partial<SpaceEntity>): void {
  validateBaseEntity(entity);

  if (!entity.name || entity.name.trim().length === 0) {
    throw new ValidationError('Space must have a name', 'space', 'name');
  }

  const validCollections = ['breeds', 'pets', 'kennels', 'contacts'];
  if (!validCollections.includes(entity.collection || '')) {
    throw new ValidationError(
      `Invalid collection: ${entity.collection}. Must be one of: ${validCollections.join(', ')}`,
      'space',
      'collection',
      entity.collection
    );
  }

  if (entity.color && !/^#[0-9A-F]{6}$/i.test(entity.color)) {
    throw new ValidationError(
      'Color must be a valid hex code',
      'space',
      'color',
      entity.color
    );
  }
}

/**
 * Validates view entity
 */
export function validateView(entity: Partial<ViewEntity>): void {
  validateBaseEntity(entity);

  if (!entity.name || entity.name.trim().length === 0) {
    throw new ValidationError('View must have a name', 'view', 'name');
  }

  const validViewTypes = ['list', 'grid', 'table', 'map', 'calendar'];
  if (!validViewTypes.includes(entity.viewType || '')) {
    throw new ValidationError(
      `Invalid viewType: ${entity.viewType}`,
      'view',
      'viewType',
      entity.viewType
    );
  }

  const validViewModes = ['fullscreen', 'drawer', 'modal', 'embedded'];
  if (!validViewModes.includes(entity.viewMode || '')) {
    throw new ValidationError(
      `Invalid viewMode: ${entity.viewMode}`,
      'view',
      'viewMode',
      entity.viewMode
    );
  }

  // Validate configuration based on viewType
  if (entity.configuration) {
    if (entity.viewType === 'grid' && entity.configuration.columns) {
      if (entity.configuration.columns < 1 || entity.configuration.columns > 12) {
        throw new ValidationError(
          'Grid columns must be between 1 and 12',
          'view',
          'configuration.columns',
          entity.configuration.columns
        );
      }
    }

    if (entity.viewType === 'map' && entity.configuration.defaultZoom) {
      if (entity.configuration.defaultZoom < 1 || entity.configuration.defaultZoom > 20) {
        throw new ValidationError(
          'Map zoom must be between 1 and 20',
          'view',
          'configuration.defaultZoom',
          entity.configuration.defaultZoom
        );
      }
    }
  }
}

/**
 * Validates filter entity
 */
export function validateFilter(entity: Partial<FilterEntity>): void {
  validateBaseEntity(entity);

  if (!entity.name || entity.name.trim().length === 0) {
    throw new ValidationError('Filter must have a name', 'filter', 'name');
  }

  if (!entity.field || entity.field.trim().length === 0) {
    throw new ValidationError('Filter must have a field', 'filter', 'field');
  }

  const validOperators = [
    'equals', 'notEquals', 'contains', 'notContains',
    'startsWith', 'endsWith', 'gt', 'gte', 'lt', 'lte',
    'between', 'in', 'notIn', 'isNull', 'isNotNull',
    'isEmpty', 'isNotEmpty'
  ];

  if (!validOperators.includes(entity.operator || '')) {
    throw new ValidationError(
      `Invalid operator: ${entity.operator}`,
      'filter',
      'operator',
      entity.operator
    );
  }

  // Validate value based on operator
  if (['isNull', 'isNotNull', 'isEmpty', 'isNotEmpty'].includes(entity.operator || '')) {
    if (entity.value !== undefined && entity.value !== null) {
      throw new ValidationError(
        `Operator ${entity.operator} should not have a value`,
        'filter',
        'value',
        entity.value
      );
    }
  } else if (entity.operator === 'between') {
    if (!Array.isArray(entity.value) || entity.value.length !== 2) {
      throw new ValidationError(
        'Between operator requires array with 2 values',
        'filter',
        'value',
        entity.value
      );
    }
  } else if (['in', 'notIn'].includes(entity.operator || '')) {
    if (!Array.isArray(entity.value)) {
      throw new ValidationError(
        `Operator ${entity.operator} requires array value`,
        'filter',
        'value',
        entity.value
      );
    }
  }
}

/**
 * Validates breed entity
 */
export function validateBreed(entity: Partial<BreedEntity>): void {
  validateBaseEntity(entity);

  if (!entity.name || entity.name.trim().length === 0) {
    throw new ValidationError('Breed must have a name', 'breed', 'name');
  }

  if (!entity.origin || entity.origin.trim().length === 0) {
    throw new ValidationError('Breed must have an origin', 'breed', 'origin');
  }

  const validSizes = ['toy', 'small', 'medium', 'large', 'giant'];
  if (!validSizes.includes(entity.size || '')) {
    throw new ValidationError(
      `Invalid size: ${entity.size}`,
      'breed',
      'size',
      entity.size
    );
  }

  if (entity.weight) {
    if (typeof entity.weight.min !== 'number' || entity.weight.min < 0) {
      throw new ValidationError(
        'Weight min must be a positive number',
        'breed',
        'weight.min',
        entity.weight.min
      );
    }
    if (typeof entity.weight.max !== 'number' || entity.weight.max < entity.weight.min) {
      throw new ValidationError(
        'Weight max must be greater than min',
        'breed',
        'weight.max',
        entity.weight.max
      );
    }
  }

  const validExerciseNeeds = ['low', 'moderate', 'high', 'very-high'];
  if (!validExerciseNeeds.includes(entity.exerciseNeeds || '')) {
    throw new ValidationError(
      `Invalid exerciseNeeds: ${entity.exerciseNeeds}`,
      'breed',
      'exerciseNeeds',
      entity.exerciseNeeds
    );
  }
}

/**
 * Validates pet entity
 */
export function validatePet(entity: Partial<PetEntity>): void {
  validateBaseEntity(entity);

  if (!entity.name || entity.name.trim().length === 0) {
    throw new ValidationError('Pet must have a name', 'pet', 'name');
  }

  if (!entity.breedId) {
    throw new ValidationError('Pet must have a breedId', 'pet', 'breedId');
  }

  if (!entity.birthDate) {
    throw new ValidationError('Pet must have a birthDate', 'pet', 'birthDate');
  }

  if (!['male', 'female'].includes(entity.gender || '')) {
    throw new ValidationError(
      `Invalid gender: ${entity.gender}`,
      'pet',
      'gender',
      entity.gender
    );
  }

  const validStatuses = ['available', 'reserved', 'sold', 'retired', 'deceased'];
  if (!validStatuses.includes(entity.status || '')) {
    throw new ValidationError(
      `Invalid status: ${entity.status}`,
      'pet',
      'status',
      entity.status
    );
  }

  if (entity.price !== undefined && entity.price < 0) {
    throw new ValidationError(
      'Price cannot be negative',
      'pet',
      'price',
      entity.price
    );
  }
}

/**
 * Validates kennel entity
 */
export function validateKennel(entity: Partial<KennelEntity>): void {
  validateBaseEntity(entity);

  if (!entity.name || entity.name.trim().length === 0) {
    throw new ValidationError('Kennel must have a name', 'kennel', 'name');
  }

  if (!entity.location?.address) {
    throw new ValidationError(
      'Kennel must have an address',
      'kennel',
      'location.address'
    );
  }

  if (!entity.contactEmail || !isValidEmail(entity.contactEmail)) {
    throw new ValidationError(
      'Kennel must have a valid email',
      'kennel',
      'contactEmail',
      entity.contactEmail
    );
  }

  if (entity.rating !== undefined) {
    if (entity.rating < 0 || entity.rating > 5) {
      throw new ValidationError(
        'Rating must be between 0 and 5',
        'kennel',
        'rating',
        entity.rating
      );
    }
  }
}

/**
 * Validates contact entity
 */
export function validateContact(entity: Partial<ContactEntity>): void {
  validateBaseEntity(entity);

  if (!entity.firstName || entity.firstName.trim().length === 0) {
    throw new ValidationError(
      'Contact must have a firstName',
      'contact',
      'firstName'
    );
  }

  if (!entity.lastName || entity.lastName.trim().length === 0) {
    throw new ValidationError(
      'Contact must have a lastName',
      'contact',
      'lastName'
    );
  }

  if (!entity.email || !isValidEmail(entity.email)) {
    throw new ValidationError(
      'Contact must have a valid email',
      'contact',
      'email',
      entity.email
    );
  }

  const validTypes = ['owner', 'breeder', 'vet', 'trainer', 'judge', 'other'];
  if (!validTypes.includes(entity.contactType || '')) {
    throw new ValidationError(
      `Invalid contactType: ${entity.contactType}`,
      'contact',
      'contactType',
      entity.contactType
    );
  }

  const validStatuses = ['active', 'inactive', 'blocked'];
  if (!validStatuses.includes(entity.status || '')) {
    throw new ValidationError(
      `Invalid status: ${entity.status}`,
      'contact',
      'status',
      entity.status
    );
  }
}

// ============================================================================
// MAIN VALIDATOR
// ============================================================================

/**
 * Main validation function that routes to specific validators
 */
export function validateEntity(entity: Partial<AnyEntity>): void {
  // First validate base requirements
  validateBaseEntity(entity);

  // Then validate specific entity type
  switch (entity._type) {
    case 'workspace':
      validateWorkspace(entity as Partial<WorkspaceEntity>);
      break;
    case 'space':
      validateSpace(entity as Partial<SpaceEntity>);
      break;
    case 'view':
      validateView(entity as Partial<ViewEntity>);
      break;
    case 'filter':
      validateFilter(entity as Partial<FilterEntity>);
      break;
    case 'sort':
      validateSort(entity as Partial<SortEntity>);
      break;
    case 'breed':
      validateBreed(entity as Partial<BreedEntity>);
      break;
    case 'pet':
      validatePet(entity as Partial<PetEntity>);
      break;
    case 'kennel':
      validateKennel(entity as Partial<KennelEntity>);
      break;
    case 'contact':
      validateContact(entity as Partial<ContactEntity>);
      break;
    default:
      throw new ValidationError(
        `No validator for entity type: ${(entity as any)._type}`,
        (entity as any)._type
      );
  }
}

/**
 * Validates sort entity
 */
export function validateSort(entity: Partial<SortEntity>): void {
  validateBaseEntity(entity);

  if (!entity.field || entity.field.trim().length === 0) {
    throw new ValidationError('Sort must have a field', 'sort', 'field');
  }

  if (!['asc', 'desc'].includes(entity.direction || '')) {
    throw new ValidationError(
      `Invalid direction: ${entity.direction}`,
      'sort',
      'direction',
      entity.direction
    );
  }

  if (typeof entity.priority !== 'number' || entity.priority < 0) {
    throw new ValidationError(
      'Priority must be a non-negative number',
      'sort',
      'priority',
      entity.priority
    );
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Validates email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates that all required fields are present
 */
export function validateRequiredFields<T extends BaseEntity>(
  entity: Partial<T>,
  requiredFields: (keyof T)[]
): void {
  for (const field of requiredFields) {
    if (entity[field] === undefined || entity[field] === null) {
      throw new ValidationError(
        `Missing required field: ${String(field)}`,
        entity._type!,
        String(field)
      );
    }
  }
}

/**
 * Validates entity before parent change
 */
export function validateParentChange(
  entity: BaseEntity,
  newParentId: string,
  allEntities: Map<string, BaseEntity>
): void {
  // Check new parent exists
  const newParent = allEntities.get(newParentId);
  if (!newParent) {
    throw new ValidationError(
      `Parent entity ${newParentId} not found`,
      entity._type,
      '_parentId',
      newParentId
    );
  }

  // Validate parent-child relationship
  validateParentChild(newParent._type, entity._type);

  // Check for circular reference
  let current = newParent;
  while (current._parentId) {
    if (current._parentId === entity.id) {
      throw new ValidationError(
        'Circular reference detected',
        entity._type,
        '_parentId',
        newParentId
      );
    }
    const parent = allEntities.get(current._parentId);
    if (!parent) break;
    current = parent;
  }
}

/**
 * Batch validation for multiple entities
 */
export function validateEntities(entities: Partial<AnyEntity>[]): {
  valid: Partial<AnyEntity>[];
  invalid: { entity: Partial<AnyEntity>; error: ValidationError }[];
} {
  const valid: Partial<AnyEntity>[] = [];
  const invalid: { entity: Partial<AnyEntity>; error: ValidationError }[] = [];

  for (const entity of entities) {
    try {
      validateEntity(entity);
      valid.push(entity);
    } catch (error) {
      if (error instanceof ValidationError) {
        invalid.push({ entity, error });
      } else {
        throw error;
      }
    }
  }

  return { valid, invalid };
}