import { describe, expect, it, vi } from 'vitest';
import {
  buildSupabaseSelectFromRxDBSchema,
  findDocumentById,
  findDocumentByPrimaryKey,
  findDocumentDataById,
  mapSupabaseToRxDBDoc,
} from '../rxdb-document.helpers';

describe('rxdb-document.helpers', () => {
  it('returns an RxDocument by primary key when it exists', async () => {
    const doc = {
      slug: 'akita',
      toJSON: vi.fn(() => ({ slug: 'akita' })),
    };
    const exec = vi.fn().mockResolvedValue(doc);
    const findOne = vi.fn().mockReturnValue({ exec });
    const collection = { findOne } as any;

    await expect(findDocumentByPrimaryKey(collection, 'akita')).resolves.toBe(doc);
    expect(findOne).toHaveBeenCalledWith('akita');
    expect(exec).toHaveBeenCalledTimes(1);
  });

  it('returns an RxDocument when it exists', async () => {
    const doc = {
      id: 'pet-1',
      toJSON: vi.fn(() => ({ id: 'pet-1', name: 'Alpha' })),
    };
    const exec = vi.fn().mockResolvedValue(doc);
    const findOne = vi.fn().mockReturnValue({ exec });
    const collection = { findOne } as any;

    await expect(findDocumentById(collection, 'pet-1')).resolves.toBe(doc);
    expect(findOne).toHaveBeenCalledWith('pet-1');
    expect(exec).toHaveBeenCalledTimes(1);
  });

  it('returns null when a document is missing', async () => {
    const exec = vi.fn().mockResolvedValue(null);
    const collection = {
      findOne: vi.fn().mockReturnValue({ exec }),
    } as any;

    await expect(findDocumentById(collection, 'missing')).resolves.toBeNull();
  });

  it('returns document JSON through findDocumentDataById', async () => {
    const doc = {
      toJSON: vi.fn(() => ({ id: 'pet-1', name: 'Alpha' })),
    };
    const collection = {
      findOne: vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValue(doc),
      }),
    } as any;

    await expect(findDocumentDataById(collection, 'pet-1')).resolves.toEqual({
      id: 'pet-1',
      name: 'Alpha',
    });
    expect(doc.toJSON).toHaveBeenCalledTimes(1);
  });

  it('returns null JSON when a document is missing', async () => {
    const collection = {
      findOne: vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValue(null),
      }),
    } as any;

    await expect(findDocumentDataById(collection, 'missing')).resolves.toBeNull();
  });

  it('builds a Supabase select list from schema fields and remaps _deleted to deleted', () => {
    expect(
      buildSupabaseSelectFromRxDBSchema({
        properties: {
          id: { type: 'string' },
          breed_id: { type: 'string' },
          name: { type: 'string' },
          _deleted: { type: 'boolean' },
          cachedAt: { type: 'number' },
        },
      }),
    ).toBe('id, breed_id, name, deleted');
  });

  it('filters RxDB service fields out of the Supabase select list', () => {
    expect(
      buildSupabaseSelectFromRxDBSchema({
        properties: {
          id: { type: 'string' },
          _meta: { type: 'object' },
          _attachments: { type: 'object' },
          _rev: { type: 'string' },
        },
      }),
    ).toBe('id');
  });

  it('falls back to wildcard select when schema properties are unavailable', () => {
    expect(buildSupabaseSelectFromRxDBSchema(undefined)).toBe('*');
    expect(buildSupabaseSelectFromRxDBSchema({ properties: {} })).toBe('*');
  });

  it('skips null schema fields when the schema does not allow null', () => {
    expect(
      mapSupabaseToRxDBDoc(
        {
          id: 'pet-1',
          nickname: null,
        },
        {
          properties: {
            id: { type: 'string' },
            nickname: { type: 'string' },
          },
        },
        123,
      ),
    ).toEqual({
      id: 'pet-1',
      cachedAt: 123,
      created_at: undefined,
      updated_at: undefined,
    });
  });

  it('keeps null schema fields when the schema allows null', () => {
    expect(
      mapSupabaseToRxDBDoc(
        {
          id: 'pet-1',
          nickname: null,
        },
        {
          properties: {
            id: { type: 'string' },
            nickname: { type: ['string', 'null'] },
          },
        },
        123,
      ),
    ).toEqual({
      id: 'pet-1',
      nickname: null,
      cachedAt: 123,
      created_at: undefined,
      updated_at: undefined,
    });
  });

  it('maps schema _deleted using Boolean coercion from deleted values', () => {
    expect(
      mapSupabaseToRxDBDoc(
        { id: 'pet-1', deleted: true },
        {
          properties: {
            id: { type: 'string' },
            _deleted: { type: 'boolean' },
          },
        },
        123,
      )._deleted,
    ).toBe(true);

    expect(
      mapSupabaseToRxDBDoc(
        { id: 'pet-1', deleted: undefined },
        {
          properties: {
            id: { type: 'string' },
            _deleted: { type: 'boolean' },
          },
        },
        123,
      )._deleted,
    ).toBe(false);
  });

  it('does not add schema fields that are absent from the Supabase row', () => {
    const result = mapSupabaseToRxDBDoc(
      { id: 'pet-1' },
      {
        properties: {
          id: { type: 'string' },
          nickname: { type: 'string' },
        },
      },
      123,
    );

    expect('nickname' in result).toBe(false);
  });

  it('copies fallback fields except null values and RxDB service fields', () => {
    expect(
      mapSupabaseToRxDBDoc(
        {
          id: 'pet-1',
          name: 'Alpha',
          age: 3,
          note: null,
          _meta: { foo: 'bar' },
          _attachments: { file: true },
          _rev: '1-abc',
        },
        null,
        123,
      ),
    ).toEqual({
      id: 'pet-1',
      name: 'Alpha',
      age: 3,
      cachedAt: 123,
      created_at: undefined,
      updated_at: undefined,
    });
  });

  it('renames fallback deleted to _deleted with Boolean coercion', () => {
    expect(
      mapSupabaseToRxDBDoc(
        {
          id: 'pet-1',
          deleted: false,
        },
        undefined,
        123,
      ),
    ).toEqual({
      id: 'pet-1',
      _deleted: false,
      cachedAt: 123,
      created_at: undefined,
      updated_at: undefined,
    });
  });

  it('fills in required fields from the Supabase row when missing from the mapped doc', () => {
    expect(
      mapSupabaseToRxDBDoc(
        {
          id: 'pet-1',
          created_at: '2024-01-01',
          updated_at: '2024-01-02',
        },
        {
          properties: {},
        },
        123,
      ),
    ).toEqual({
      id: 'pet-1',
      created_at: '2024-01-01',
      updated_at: '2024-01-02',
      cachedAt: 123,
    });
  });

  it('does not overwrite schema-mapped id when it is already present', () => {
    expect(
      mapSupabaseToRxDBDoc(
        {
          id: 'mapped-id',
        },
        {
          properties: {
            id: { type: 'string' },
          },
        },
        123,
      ),
    ).toEqual({
      id: 'mapped-id',
      cachedAt: 123,
      created_at: undefined,
      updated_at: undefined,
    });
  });

  it('sets cachedAt from the provided now parameter', () => {
    expect(
      mapSupabaseToRxDBDoc(
        { id: 'pet-1' },
        null,
        456,
      ).cachedAt,
    ).toBe(456);
  });

  it('defensively strips RxDB service fields even when schema mapping would copy them', () => {
    expect(
      mapSupabaseToRxDBDoc(
        {
          id: 'pet-1',
          _meta: { foo: 'bar' },
          _attachments: { file: true },
          _rev: '1-abc',
        },
        {
          properties: {
            id: { type: 'string' },
            _meta: { type: 'object' },
            _attachments: { type: 'object' },
            _rev: { type: 'string' },
          },
        },
        123,
      ),
    ).toEqual({
      id: 'pet-1',
      cachedAt: 123,
      created_at: undefined,
      updated_at: undefined,
    });
  });
});
