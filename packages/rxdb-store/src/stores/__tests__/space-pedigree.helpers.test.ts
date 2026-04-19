import { describe, expect, it } from 'vitest';
import {
  buildPedigreeLeafPet,
  buildPedigreeResult,
  collectPedigreeLookupIds,
  getPedigreeAncestorRefs,
  resolvePedigreeCodeMaps,
} from '../space-pedigree.helpers';

describe('space-pedigree.helpers', () => {
  it('deduplicates pedigree refs by composite id and partition', () => {
    expect(
      getPedigreeAncestorRefs({
        f: { id: 'pet-1', bid: 'breed-1' },
        ff: { id: 'pet-1', bid: 'breed-1' },
        m: { id: 'pet-1', bid: 'breed-2' },
        mf: { id: 'pet-2', bid: 'breed-2' },
      }),
    ).toEqual([
      { id: 'pet-1', partitionId: 'breed-1' },
      { id: 'pet-1', partitionId: 'breed-2' },
      { id: 'pet-2', partitionId: 'breed-2' },
    ]);
  });

  it('collects unique dictionary lookup ids from ancestor records', () => {
    expect(
      collectPedigreeLookupIds([
        {
          id: 'pet-1',
          name: 'Alpha',
          sex_id: 'sex-m',
          country_of_birth_id: 'country-us',
        },
        {
          id: 'pet-2',
          name: 'Beta',
          sex_id: 'sex-f',
          country_of_birth_id: 'country-us',
        },
        {
          id: 'pet-3',
          name: 'Gamma',
          sex_id: 'sex-m',
        },
      ]),
    ).toEqual({
      sexIds: ['sex-m', 'sex-f'],
      countryIds: ['country-us'],
    });
  });

  it('builds a pedigree leaf pet with code maps and nested parents', () => {
    const father = { id: 'father-1', name: 'Father' };
    const mother = { id: 'mother-1', name: 'Mother' };

    expect(
      buildPedigreeLeafPet(
        {
          id: 'pet-1',
          name: 'Alpha',
          breed_id: 'breed-1',
          sex_id: 'sex-f',
          country_of_birth_id: 'country-ua',
          avatar_url: 'alpha.png',
        },
        {
          sexCodeMap: new Map([['sex-f', 'F']]),
          countryCodeMap: new Map([['country-ua', 'UA']]),
          father,
          mother,
        },
      ),
    ).toMatchObject({
      id: 'pet-1',
      name: 'Alpha',
      breedId: 'breed-1',
      avatarUrl: 'alpha.png',
      sex: { code: 'F' },
      countryOfBirth: { code: 'UA' },
      father,
      mother,
    });
  });

  it('resolves pedigree code maps with deduplicated dictionary lookups', async () => {
    const lookupCalls: Array<[string, string]> = [];

    const codeMaps = await resolvePedigreeCodeMaps(
      [
        {
          id: 'pet-1',
          name: 'Alpha',
          sex_id: 'sex-m',
          country_of_birth_id: 'country-ua',
        },
        {
          id: 'pet-2',
          name: 'Beta',
          sex_id: 'sex-f',
          country_of_birth_id: 'country-ua',
        },
      ],
      async (type, id) => {
        lookupCalls.push([type, id]);

        if (type === 'sex') {
          return { code: id === 'sex-m' ? 'M' : 'F' };
        }

        return { code: 'UA' };
      },
    );

    expect(lookupCalls).toEqual([
      ['sex', 'sex-m'],
      ['sex', 'sex-f'],
      ['country', 'country-ua'],
    ]);
    expect([...codeMaps.sexCodeMap.entries()]).toEqual([
      ['sex-m', 'M'],
      ['sex-f', 'F'],
    ]);
    expect([...codeMaps.countryCodeMap.entries()]).toEqual([
      ['country-ua', 'UA'],
    ]);
  });

  it('builds pedigree tree using composite ref lookups', () => {
    const result = buildPedigreeResult(
      {
        f: { id: 'pet-1', bid: 'breed-1' },
        ff: { id: 'pet-2', bid: 'breed-1' },
        m: { id: 'pet-1', bid: 'breed-2' },
      },
      [
        {
          id: 'pet-1',
          breed_id: 'breed-2',
          name: 'Mother With Shared Id',
          sex_id: 'sex-f',
        },
        {
          id: 'pet-1',
          breed_id: 'breed-1',
          name: 'Father With Shared Id',
          sex_id: 'sex-m',
          country_of_birth_id: 'country-ua',
          avatar_url: 'father.png',
        },
        {
          id: 'pet-2',
          breed_id: 'breed-1',
          name: 'Grandfather',
          titles: 'CH UA',
        },
      ],
      {
        sexCodeMap: new Map([
          ['sex-m', 'M'],
          ['sex-f', 'F'],
        ]),
        countryCodeMap: new Map([['country-ua', 'UA']]),
      },
    );

    expect(result.ancestors).toHaveLength(3);
    expect(result.father?.name).toBe('Father With Shared Id');
    expect(result.father?.sex?.code).toBe('M');
    expect(result.father?.countryOfBirth?.code).toBe('UA');
    expect(result.father?.avatarUrl).toBe('father.png');
    expect(result.father?.father?.name).toBe('Grandfather');
    expect(result.mother?.name).toBe('Mother With Shared Id');
    expect(result.mother?.sex?.code).toBe('F');
  });

  it('skips missing ancestor records without breaking the rest of the tree', () => {
    const result = buildPedigreeResult(
      {
        f: { id: 'pet-1', bid: 'breed-1' },
        ff: { id: 'pet-2', bid: 'breed-1' },
        m: { id: 'pet-3', bid: 'breed-1' },
      },
      [
        {
          id: 'pet-1',
          breed_id: 'breed-1',
          name: 'Father',
        },
      ],
    );

    expect(result.father?.name).toBe('Father');
    expect(result.father?.father).toBeUndefined();
    expect(result.mother).toBeUndefined();
  });
});
