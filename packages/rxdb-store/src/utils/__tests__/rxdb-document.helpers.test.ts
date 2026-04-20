import { describe, expect, it, vi } from 'vitest';
import {
  findDocumentById,
  findDocumentByPrimaryKey,
  findDocumentDataById,
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
});
