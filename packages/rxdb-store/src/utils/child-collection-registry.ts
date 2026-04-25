/**
 * Child Collection Registry
 *
 * Maps entity types to their child collection schemas and migration strategies.
 * Also resolves child table names back to parent entity types.
 *
 * Extracted from SpaceStore to make child collection mapping config-driven.
 */

import type { RxJsonSchema } from 'rxdb';
import { breedChildrenSchema, breedChildrenMigrationStrategies } from '../collections/breed-children.schema';
import { petChildrenSchema, petChildrenMigrationStrategies } from '../collections/pet-children.schema';
import { litterChildrenSchema, litterChildrenMigrationStrategies } from '../collections/litter-children.schema';
import { programChildrenSchema, programChildrenMigrationStrategies } from '../collections/program-children.schema';
import { contactChildrenSchema, contactChildrenMigrationStrategies } from '../collections/contact-children.schema';
import { accountChildrenSchema, accountChildrenMigrationStrategies } from '../collections/account-children.schema';

// ============= Registry =============

interface ChildCollectionEntry {
  schema: RxJsonSchema<any>;
  migrationStrategies: any;
}

const registry: Record<string, ChildCollectionEntry> = {
  breed: { schema: breedChildrenSchema, migrationStrategies: breedChildrenMigrationStrategies },
  pet: { schema: petChildrenSchema, migrationStrategies: petChildrenMigrationStrategies },
  litter: { schema: litterChildrenSchema, migrationStrategies: litterChildrenMigrationStrategies },
  program: { schema: programChildrenSchema, migrationStrategies: programChildrenMigrationStrategies },
  contact: { schema: contactChildrenSchema, migrationStrategies: contactChildrenMigrationStrategies },
  account: { schema: accountChildrenSchema, migrationStrategies: accountChildrenMigrationStrategies },
};

export function getChildCollectionSchema(entityType: string): RxJsonSchema<any> | null {
  return registry[entityType.toLowerCase()]?.schema ?? null;
}

export function getChildCollectionMigrationStrategies(entityType: string): any {
  return registry[entityType.toLowerCase()]?.migrationStrategies ?? {};
}

// ============= Table → Entity Type Resolution =============

const tableEntityMap: Record<string, string> = {
  breed_division: 'breed',
  breed_synonym: 'breed',
  breed_forecast: 'breed',
  related_breed: 'breed',
  litter: 'pet',
  pet_identifier: 'pet',
  pet_in_program: 'pet',
  pet_health_exam_result: 'pet',
  pet_sibling: 'pet',
  pet_child: 'pet',
  pet_child_for_sale: 'pet',
  pet_measurement: 'pet',
  program_result: 'program',
  judge_in_program: 'program',
  contact_communication: 'contact',
  contact_language: 'contact',
  contact_breeder_kennel: 'contact',
  contact_breeder_offspring: 'contact',
  account_communication: 'account',
  kennel_pet: 'account',
  kennel_offspring: 'account',
  kennel_offer: 'account',
};

/**
 * Resolve a child table name to its parent entity type.
 * Uses explicit mapping first, then prefix match, then pattern matching.
 */
export function getEntityTypeFromTableType(tableType: string): string | null {
  // Normalize VIEW name (remove _with_xxx suffix)
  const normalizedTable = tableType.replace(/_with_\w+$/, '');

  // Exact match
  if (tableEntityMap[normalizedTable]) {
    return tableEntityMap[normalizedTable];
  }

  // Prefix match (e.g., 'pet_child_for_sale' starts with 'pet_child')
  for (const [prefix, entityType] of Object.entries(tableEntityMap)) {
    if (normalizedTable.startsWith(prefix)) {
      return entityType;
    }
  }

  // Pattern matching fallback
  if (normalizedTable.includes('_in_breed') || normalizedTable.includes('_breed')) {
    return 'breed';
  }
  if (normalizedTable.includes('_in_litter')) {
    return 'litter';
  }
  if (normalizedTable.includes('_in_pet') || normalizedTable.includes('_pet')) {
    return 'pet';
  }
  if (normalizedTable.includes('_in_kennel') || normalizedTable.includes('_kennel')) {
    return 'kennel';
  }

  return null;
}
