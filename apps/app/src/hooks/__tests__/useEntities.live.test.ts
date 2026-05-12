import { describe, expect, it } from 'vitest';
import { buildLiveMatcher, buildLiveSorter } from '../useEntities.live';

describe('buildLiveMatcher', () => {
  it('matches all records when filters are undefined', () => {
    const match = buildLiveMatcher(undefined);
    expect(match({ id: 'a' })).toBe(true);
  });

  it('matches a single eq filter', () => {
    const match = buildLiveMatcher(
      { status: 'active' },
      { status: { fieldType: 'string', operator: 'eq' } },
    );

    expect(match({ status: 'active' })).toBe(true);
    expect(match({ status: 'archived' })).toBe(false);
  });

  it('matches mixed eq and contains filters across fields', () => {
    const match = buildLiveMatcher(
      { status: 'active', name: 'rex' },
      {
        status: { fieldType: 'string', operator: 'eq' },
        name: { fieldType: 'string', operator: 'contains' },
      },
    );

    expect(match({ status: 'active', name: 'Rex Junior' })).toBe(true);
    expect(match({ status: 'active', name: 'Max' })).toBe(false);
    expect(match({ status: 'archived', name: 'Rex Junior' })).toBe(false);
  });

  it('skips empty-string filters', () => {
    const match = buildLiveMatcher(
      { name: '' },
      { name: { fieldType: 'string', operator: 'contains' } },
    );

    expect(match({ name: 'anything' })).toBe(true);
    expect(match({})).toBe(true);
  });

  it('does not match when a required field is missing', () => {
    const match = buildLiveMatcher(
      { status: 'active' },
      { status: { fieldType: 'string', operator: 'eq' } },
    );

    expect(match({ name: 'Rex' })).toBe(false);
  });
});

describe('buildLiveSorter', () => {
  it('keeps input order when orderBy is undefined', () => {
    const records = [{ id: 'b' }, { id: 'a' }];

    expect(records.slice().sort(buildLiveSorter()).map((record) => record.id)).toEqual([
      'b',
      'a',
    ]);
  });

  it('sorts ascending and descending by the primary field', () => {
    const records = [
      { id: 'b', name: 'Beta' },
      { id: 'a', name: 'Alpha' },
    ];

    expect(
      records
        .slice()
        .sort(buildLiveSorter({ field: 'name', direction: 'asc' }))
        .map((record) => record.id),
    ).toEqual(['a', 'b']);
    expect(
      records
        .slice()
        .sort(buildLiveSorter({ field: 'name', direction: 'desc' }))
        .map((record) => record.id),
    ).toEqual(['b', 'a']);
  });

  it('sorts with a tieBreaker when primary values match', () => {
    const records = [
      { id: 'a', name: 'Same', created_at: '2024-01-01' },
      { id: 'b', name: 'Same', created_at: '2024-01-03' },
      { id: 'c', name: 'Same', created_at: '2024-01-02' },
    ];

    expect(
      records
        .slice()
        .sort(
          buildLiveSorter({
            field: 'name',
            direction: 'asc',
            tieBreaker: { field: 'created_at', direction: 'desc' },
          }),
        )
        .map((record) => record.id),
    ).toEqual(['b', 'c', 'a']);
  });

  it('places nullish values last', () => {
    const records = [
      { id: 'missing' },
      { id: 'alpha', name: 'Alpha' },
      { id: 'null', name: null },
      { id: 'beta', name: 'Beta' },
    ];

    expect(
      records
        .slice()
        .sort(buildLiveSorter({ field: 'name', direction: 'asc' }))
        .map((record) => record.id),
    ).toEqual(['alpha', 'beta', 'missing', 'null']);
  });

  it('sorts by JSONB parameter values for primary and tieBreaker fields', () => {
    const records = [
      {
        id: 'b',
        metrics: { score: 10 },
        labels: { display: 'Beta' },
      },
      {
        id: 'a',
        metrics: { score: 5 },
        labels: { display: 'Alpha' },
      },
      {
        id: 'c',
        metrics: { score: 5 },
        labels: { display: 'Charlie' },
      },
    ];

    expect(
      records
        .slice()
        .sort(
          buildLiveSorter({
            field: 'metrics',
            parameter: 'score',
            direction: 'asc',
            tieBreaker: {
              field: 'labels',
              parameter: 'display',
              direction: 'desc',
            },
          }),
        )
        .map((record) => record.id),
    ).toEqual(['c', 'a', 'b']);
  });
});
