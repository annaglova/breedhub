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

export type PedigreeLookupType = 'sex' | 'country';
export type PedigreeLookupRecord = Record<string, unknown> | null;
export type PedigreeLookupResult = [
  PedigreeLookupType,
  string,
  PedigreeLookupRecord,
];
export type PedigreeLookupFn = (
  type: PedigreeLookupType,
  id: string,
) => Promise<PedigreeLookupRecord>;

export interface BuildPedigreeLeafPetOptions extends PedigreeCodeMaps {
  father?: PedigreePet;
  mother?: PedigreePet;
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

export function buildPedigreeCodeMaps(
  lookupResults: PedigreeLookupResult[],
): Required<PedigreeCodeMaps> {
  const sexCodeMap = new Map<string, string>();
  const countryCodeMap = new Map<string, string>();

  for (const [type, id, record] of lookupResults) {
    if (!record) {
      continue;
    }

    if (type === 'sex' && record.code) {
      sexCodeMap.set(id, String(record.code));
    }

    if (type === 'country' && record.code) {
      countryCodeMap.set(id, String(record.code));
    }
  }

  return {
    sexCodeMap,
    countryCodeMap,
  };
}

export async function resolvePedigreeCodeMaps<
  TRecord extends PedigreeAncestorRecord,
>(
  ancestors: TRecord[],
  lookupRecordById: PedigreeLookupFn,
): Promise<Required<PedigreeCodeMaps>> {
  const { sexIds, countryIds } = collectPedigreeLookupIds(ancestors);
  const lookupPromises: Promise<PedigreeLookupResult>[] = [];

  for (const id of sexIds) {
    lookupPromises.push(
      lookupRecordById('sex', id).then((record) => ['sex', id, record]),
    );
  }

  for (const id of countryIds) {
    lookupPromises.push(
      lookupRecordById('country', id).then((record) => ['country', id, record]),
    );
  }

  return buildPedigreeCodeMaps(await Promise.all(lookupPromises));
}

export function buildPedigreeLeafPet<
  TRecord extends PedigreeAncestorRecord,
>(
  pet: TRecord,
  {
    sexCodeMap,
    countryCodeMap,
    father,
    mother,
  }: BuildPedigreeLeafPetOptions = {},
): PedigreePet {
  const countryCode = pet.country_of_birth_id
    ? countryCodeMap?.get(pet.country_of_birth_id)
    : undefined;

  return {
    id: pet.id,
    name: pet.name || '',
    slug: pet.slug || undefined,
    breedId: pet.breed_id || undefined,
    dateOfBirth: pet.date_of_birth || undefined,
    titles: pet.titles || undefined,
    avatarUrl: pet.avatar_url || undefined,
    sex: pet.sex_id
      ? {
          code: sexCodeMap?.get(pet.sex_id),
        }
      : undefined,
    countryOfBirth: countryCode
      ? {
          code: countryCode,
        }
      : undefined,
    father,
    mother,
  };
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

    return buildPedigreeLeafPet(ancestor, {
      sexCodeMap,
      countryCodeMap,
      father: buildNode(key + 'f'),
      mother: buildNode(key + 'm'),
    });
  };

  return {
    father: buildNode('f'),
    mother: buildNode('m'),
    ancestors,
  };
}
