import {
  normalizePartitionedEntityRefs,
  type PartitionedEntityRef,
} from './space-partition.helpers';

export interface PedigreeEntry {
  id: string;
  bid: string;
}

export type PedigreeJsonb = Record<string, PedigreeEntry>;

export interface PedigreePet {
  id: string;
  name: string;
  slug?: string;
  breedId?: string;
  dateOfBirth?: string;
  titles?: string;
  avatarUrl?: string;
  sex?: {
    code?: string;
    name?: string;
  };
  countryOfBirth?: {
    code?: string;
  };
  father?: PedigreePet;
  mother?: PedigreePet;
}

export interface PedigreeAncestorRecord extends Record<string, any> {
  id: string;
  name?: string | null;
  slug?: string | null;
  breed_id?: string | null;
  date_of_birth?: string | null;
  titles?: string | null;
  avatar_url?: string | null;
  sex_id?: string | null;
  country_of_birth_id?: string | null;
}

export interface PedigreeResult<
  TRecord extends PedigreeAncestorRecord = PedigreeAncestorRecord,
> {
  father?: PedigreePet;
  mother?: PedigreePet;
  ancestors: TRecord[];
}

export interface PedigreeCodeMaps {
  sexCodeMap?: Map<string, string>;
  countryCodeMap?: Map<string, string>;
}

export function buildPedigreeRefKey(
  id: string,
  breedId?: string | null,
): string {
  return `${breedId ?? ''}:${id}`;
}

export function getPedigreeAncestorRefs(
  pedigree: PedigreeJsonb,
): PartitionedEntityRef[] {
  if (!pedigree || Object.keys(pedigree).length === 0) {
    return [];
  }

  return normalizePartitionedEntityRefs(
    Object.values(pedigree).map(({ id, bid }) => ({
      id,
      partitionId: bid ?? null,
    })),
  );
}

export function collectPedigreeLookupIds<
  TRecord extends PedigreeAncestorRecord,
>(ancestors: TRecord[]): {
  sexIds: string[];
  countryIds: string[];
} {
  const sexIds = new Set<string>();
  const countryIds = new Set<string>();

  for (const ancestor of ancestors) {
    if (ancestor.sex_id) {
      sexIds.add(ancestor.sex_id);
    }

    if (ancestor.country_of_birth_id) {
      countryIds.add(ancestor.country_of_birth_id);
    }
  }

  return {
    sexIds: [...sexIds],
    countryIds: [...countryIds],
  };
}

export function buildPedigreeAncestorMap<
  TRecord extends PedigreeAncestorRecord,
>(ancestors: TRecord[]): Map<string, TRecord> {
  const ancestorMap = new Map<string, TRecord>();

  for (const ancestor of ancestors) {
    ancestorMap.set(
      buildPedigreeRefKey(ancestor.id, ancestor.breed_id),
      ancestor,
    );
  }

  return ancestorMap;
}

export function buildPedigreeResult<
  TRecord extends PedigreeAncestorRecord,
>(
  pedigree: PedigreeJsonb,
  ancestors: TRecord[],
  { sexCodeMap, countryCodeMap }: PedigreeCodeMaps = {},
): PedigreeResult<TRecord> {
  const ancestorMap = buildPedigreeAncestorMap(ancestors);

  const buildNode = (key: string): PedigreePet | undefined => {
    const entry = pedigree[key];
    if (!entry) {
      return undefined;
    }

    const ancestor = ancestorMap.get(buildPedigreeRefKey(entry.id, entry.bid));
    if (!ancestor) {
      return undefined;
    }

    const countryCode = ancestor.country_of_birth_id
      ? countryCodeMap?.get(ancestor.country_of_birth_id)
      : undefined;

    return {
      id: ancestor.id,
      name: ancestor.name || '',
      slug: ancestor.slug || undefined,
      breedId: ancestor.breed_id || undefined,
      dateOfBirth: ancestor.date_of_birth || undefined,
      titles: ancestor.titles || undefined,
      avatarUrl: ancestor.avatar_url || undefined,
      sex: ancestor.sex_id
        ? {
            code: sexCodeMap?.get(ancestor.sex_id),
          }
        : undefined,
      countryOfBirth: countryCode
        ? {
            code: countryCode,
          }
        : undefined,
      father: buildNode(key + 'f'),
      mother: buildNode(key + 'm'),
    };
  };

  return {
    father: buildNode('f'),
    mother: buildNode('m'),
    ancestors,
  };
}
