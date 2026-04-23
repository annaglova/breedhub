/**
 * TabDataService Unit Tests
 *
 * Tests the core data loading orchestration logic.
 * Uses mocked SpaceStore and DictionaryStore.
 *
 * Run: pnpm --filter @breedhub/rxdb-store test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { tabDataService } from '../tab-data.service';
import { spaceStore } from '../../stores/space-store.signal-store';
import { dictionaryStore } from '../../stores/dictionary-store.signal-store';
import type { DataSourceConfig } from '../../types/tab-data.types';
import type { DictionaryDocument } from '../../collections/dictionaries.schema';

// Test fixture helper: DictionaryDocument requires composite_id / table_name /
// cachedAt plus id/name/additional; these tests only care about the latter
// three and lean on defaults for the rest.
function makeDictDoc(
  partial: { id: string; name: string; additional?: Record<string, unknown> },
  table = 'achievement',
): DictionaryDocument {
  return {
    composite_id: `${table}::${partial.id}`,
    table_name: table,
    id: partial.id,
    name: partial.name,
    additional: partial.additional,
    cachedAt: 0,
  };
}

// Paginated dictionary response: getDictionary returns {records, total, hasMore, nextCursor}.
function makeDictResult(
  records: DictionaryDocument[],
): { records: DictionaryDocument[]; total: number; hasMore: boolean; nextCursor: string | null } {
  return {
    records,
    total: records.length,
    hasMore: false,
    nextCursor: null,
  };
}

// Mock stores
vi.mock('../../stores/space-store.signal-store', () => ({
  spaceStore: {
    loadChildRecords: vi.fn(),
    applyChildFilters: vi.fn(),
    applyFilters: vi.fn(),
    loadChildViewDirect: vi.fn(),
  },
}));

vi.mock('../../stores/dictionary-store.signal-store', () => ({
  dictionaryStore: {
    initialized: { value: true },
    initialize: vi.fn(),
    getDictionary: vi.fn(),
  },
}));

vi.mock('../../supabase/client', () => ({
  supabase: {
    rpc: vi.fn(),
  },
}));

describe('TabDataService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // loadTabData - Router tests
  // ─────────────────────────────────────────────────────────────────────────────

  describe('loadTabData', () => {
    it('should return empty array when parentId is missing', async () => {
      const result = await tabDataService.loadTabData('', {
        type: 'child',
        childTable: { table: 'test', parentField: 'parent_id' },
      });

      expect(result).toEqual([]);
      expect(spaceStore.loadChildRecords).not.toHaveBeenCalled();
    });

    it('should return empty array when dataSource is missing', async () => {
      const result = await tabDataService.loadTabData(
        'test-id',
        null as unknown as DataSourceConfig
      );

      expect(result).toEqual([]);
    });

    it('should return empty array for unknown dataSource type', async () => {
      const result = await tabDataService.loadTabData('test-id', {
        type: 'unknown' as any,
      });

      expect(result).toEqual([]);
    });

    it('should route to loadChild for type: child', async () => {
      vi.mocked(spaceStore.loadChildRecords).mockResolvedValue([{ id: '1' }]);

      const result = await tabDataService.loadTabData('parent-id', {
        type: 'child',
        childTable: {
          table: 'achievement_in_breed',
          parentField: 'breed_id',
        },
      });

      expect(spaceStore.loadChildRecords).toHaveBeenCalledWith(
        'parent-id',
        'achievement_in_breed',
        expect.any(Object)
      );
      expect(result).toEqual([{ id: '1' }]);
    });

    it('should handle VIEW tables (with isView: true) via child type', async () => {
      vi.mocked(spaceStore.loadChildRecords).mockResolvedValue([{ id: '1' }]);

      const result = await tabDataService.loadTabData('parent-id', {
        type: 'child',
        childTable: {
          isView: true,
          table: 'top_patron_in_breed_with_contact',
          parentField: 'breed_id',
        },
      });

      // VIEWs use isView config flag, handled by loadChild
      expect(spaceStore.loadChildRecords).toHaveBeenCalledWith(
        'parent-id',
        'top_patron_in_breed_with_contact',
        expect.any(Object)
      );
      expect(result).toEqual([{ id: '1' }]);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // loadChild tests
  // ─────────────────────────────────────────────────────────────────────────────

  describe('loadChild', () => {
    it('should pass limit, orderBy, and select to SpaceStore', async () => {
      vi.mocked(spaceStore.loadChildRecords).mockResolvedValue([]);

      await tabDataService.loadTabData('parent-id', {
        type: 'child',
        childTable: {
          table: 'test_table',
          parentField: 'parent_id',
          limit: 50,
          select: ['position', 'description'],
          orderBy: [{ field: 'position', direction: 'asc' }],
        },
      });

      expect(spaceStore.loadChildRecords).toHaveBeenCalledWith(
        'parent-id',
        'test_table',
        {
          limit: 50,
          orderBy: 'position',
          orderDirection: 'asc',
          parentField: 'parent_id',
          select: ['position', 'description'],
        }
      );
    });

    it('should return empty array when childTable config is missing', async () => {
      const result = await tabDataService.loadTabData('parent-id', {
        type: 'child',
      });

      expect(result).toEqual([]);
      expect(spaceStore.loadChildRecords).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // loadChildWithDictionary tests
  // ─────────────────────────────────────────────────────────────────────────────

  describe('loadChildWithDictionary', () => {
    const baseConfig: DataSourceConfig = {
      type: 'child_with_dictionary',
      childTable: {
        table: 'achievement_in_breed',
        parentField: 'breed_id',
      },
      dictionary: {
        table: 'achievement',
        linkField: 'achievement_id',
        showAll: true,
      },
    };

    it('should merge dictionary with children when showAll: true', async () => {
      // Mock child records (achieved)
      vi.mocked(spaceStore.loadChildRecords).mockResolvedValue([
        { id: 'child-1', additional: { achievement_id: 'ach-2' } },
      ]);

      // Mock dictionary
      vi.mocked(dictionaryStore.getDictionary).mockResolvedValue(
        makeDictResult([
          makeDictDoc({ id: 'ach-1', name: 'Bronze', additional: { position: 1 } }),
          makeDictDoc({ id: 'ach-2', name: 'Silver', additional: { position: 2 } }),
          makeDictDoc({ id: 'ach-3', name: 'Gold', additional: { position: 3 } }),
        ]),
      );

      const result = await tabDataService.loadTabData('parent-id', baseConfig);

      expect(result).toHaveLength(3);

      // Bronze - not achieved
      expect(result[0]).toMatchObject({
        id: 'ach-1',
        name: 'Bronze',
        _achieved: false,
        _achievedRecord: null,
      });

      // Silver - achieved
      expect(result[1]).toMatchObject({
        id: 'ach-2',
        name: 'Silver',
        _achieved: true,
      });
      expect(result[1]._achievedRecord).toBeTruthy();

      // Gold - not achieved
      expect(result[2]).toMatchObject({
        id: 'ach-3',
        name: 'Gold',
        _achieved: false,
      });
    });

    it('should enrich children with dictionary when showAll: false', async () => {
      vi.mocked(spaceStore.loadChildRecords).mockResolvedValue([
        { id: 'child-1', additional: { achievement_id: 'ach-2' } },
      ]);

      vi.mocked(dictionaryStore.getDictionary).mockResolvedValue(
        makeDictResult([
          makeDictDoc({ id: 'ach-1', name: 'Bronze', additional: {} }),
          makeDictDoc({ id: 'ach-2', name: 'Silver', additional: {} }),
        ]),
      );

      const result = await tabDataService.loadTabData('parent-id', {
        ...baseConfig,
        dictionary: {
          ...baseConfig.dictionary!,
          showAll: false,
        },
      });

      // Only child records returned, enriched with dictionary
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'child-1',
        _dictionary: {
          id: 'ach-2',
          name: 'Silver',
        },
      });
    });

    it('should filter dictionary by filter config', async () => {
      vi.mocked(spaceStore.loadChildRecords).mockResolvedValue([]);

      vi.mocked(dictionaryStore.getDictionary).mockResolvedValue(
        makeDictResult([
          makeDictDoc({ id: 'ach-1', name: 'Breed Achievement', additional: { entity: 'breed' } }),
          makeDictDoc({ id: 'ach-2', name: 'Pet Achievement', additional: { entity: 'pet' } }),
        ]),
      );

      const result = await tabDataService.loadTabData('parent-id', {
        ...baseConfig,
        dictionary: {
          ...baseConfig.dictionary!,
          filter: { entity: 'breed' },
        },
      });

      // Only breed achievements returned
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Breed Achievement');
    });

    it('should sort dictionary by orderBy config', async () => {
      vi.mocked(spaceStore.loadChildRecords).mockResolvedValue([]);

      vi.mocked(dictionaryStore.getDictionary).mockResolvedValue(
        makeDictResult([
          makeDictDoc({ id: 'ach-3', name: 'Gold', additional: { position: 3 } }),
          makeDictDoc({ id: 'ach-1', name: 'Bronze', additional: { position: 1 } }),
          makeDictDoc({ id: 'ach-2', name: 'Silver', additional: { position: 2 } }),
        ]),
      );

      const result = await tabDataService.loadTabData('parent-id', {
        ...baseConfig,
        dictionary: {
          ...baseConfig.dictionary!,
          orderBy: [{ field: 'position', direction: 'asc' }],
        },
      });

      expect(result[0].name).toBe('Bronze');
      expect(result[1].name).toBe('Silver');
      expect(result[2].name).toBe('Gold');
    });

    it('should call getDictionary with correct params', async () => {
      vi.mocked(spaceStore.loadChildRecords).mockResolvedValue([]);
      vi.mocked(dictionaryStore.getDictionary).mockResolvedValue(makeDictResult([]));

      await tabDataService.loadTabData('parent-id', {
        ...baseConfig,
        dictionary: {
          ...baseConfig.dictionary!,
          additionalFields: ['description', 'entity'],
        },
      });

      expect(dictionaryStore.getDictionary).toHaveBeenCalledWith(
        'achievement',
        expect.objectContaining({
          additionalFields: ['description', 'entity'],
          limit: 200,
        })
      );
    });

    it('passes childTable.select through to SpaceStore for child_with_dictionary loads', async () => {
      vi.mocked(spaceStore.loadChildRecords).mockResolvedValue([]);
      vi.mocked(dictionaryStore.getDictionary).mockResolvedValue(makeDictResult([]));

      await tabDataService.loadTabData('parent-id', {
        ...baseConfig,
        childTable: {
          ...baseConfig.childTable!,
          select: ['achievement_id', 'date'],
        },
      });

      expect(spaceStore.loadChildRecords).toHaveBeenCalledWith(
        'parent-id',
        'achievement_in_breed',
        {
          limit: 100,
          parentField: 'breed_id',
          select: ['achievement_id', 'date'],
        },
      );
    });
  });

  describe('loadTabDataPaginated', () => {
    it('passes childTable.select through to applyChildFilters for table pagination', async () => {
      vi.mocked(spaceStore.applyChildFilters).mockResolvedValue({
        records: [{ id: 'child-1' }],
        total: 1,
        hasMore: false,
        nextCursor: null,
      });

      const result = await tabDataService.loadTabDataPaginated('parent-id', {
        type: 'child',
        childTable: {
          table: 'contact_language',
          parentField: 'contact_id',
          select: ['language_id', 'is_primary'],
          orderBy: [{ field: 'position', direction: 'asc' }],
        },
      }, {
        limit: 20,
        cursor: 'cursor-1',
      });

      expect(spaceStore.applyChildFilters).toHaveBeenCalledWith(
        'parent-id',
        'contact_language',
        {},
        {
          limit: 20,
          cursor: 'cursor-1',
          select: ['language_id', 'is_primary'],
          orderBy: {
            field: 'position',
            direction: 'asc',
            tieBreaker: { field: 'id', direction: 'asc' },
          },
        },
      );
      expect(result).toEqual({
        records: [{ id: 'child-1' }],
        total: 1,
        hasMore: false,
        nextCursor: null,
      });
    });

    it('passes childTable.select through to loadChildViewDirect for VIEW pagination', async () => {
      vi.mocked(spaceStore.loadChildViewDirect).mockResolvedValue({
        records: [{ id: 'view-1' }],
        total: 1,
        hasMore: true,
        nextCursor: 'cursor-2',
      });

      const result = await tabDataService.loadTabDataPaginated('parent-id', {
        type: 'child',
        childTable: {
          table: 'top_pet_in_breed_with_pet',
          isView: true,
          parentField: 'breed_id',
          select: ['placement', 'pet_name', 'rating'],
          orderBy: [{ field: 'placement', direction: 'asc' }],
        },
      }, {
        limit: 30,
        cursor: 'cursor-1',
      });

      expect(spaceStore.loadChildViewDirect).toHaveBeenCalledWith(
        'parent-id',
        'top_pet_in_breed_with_pet',
        'breed_id',
        {
          limit: 30,
          cursor: 'cursor-1',
          select: ['placement', 'pet_name', 'rating'],
          orderBy: {
            field: 'placement',
            direction: 'asc',
            tieBreaker: { field: 'id', direction: 'asc' },
          },
        },
      );
      expect(result).toEqual({
        records: [{ id: 'view-1' }],
        total: 1,
        hasMore: true,
        nextCursor: 'cursor-2',
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // loadMainFiltered tests
  // ─────────────────────────────────────────────────────────────────────────────

  describe('loadMainFiltered', () => {
    it('should call applyFilters with correct params', async () => {
      vi.mocked(spaceStore.applyFilters).mockResolvedValue({
        records: [{ id: '1' }],
        total: 1,
        hasMore: false,
        nextCursor: null,
      });

      const result = await tabDataService.loadTabData('parent-id', {
        type: 'main_filtered',
        mainEntity: {
          entity: 'kennel',
          filterField: 'breed_id',
          limit: 20,
          orderBy: [{ field: 'rating', direction: 'desc' }],
        },
      });

      expect(spaceStore.applyFilters).toHaveBeenCalledWith(
        'kennel',
        { breed_id: 'parent-id' },
        {
          limit: 20,
          orderBy: { field: 'rating', direction: 'desc' },
        }
      );
      expect(result).toEqual([{ id: '1' }]);
    });

    it('should return empty array when mainEntity config is missing', async () => {
      const result = await tabDataService.loadTabData('parent-id', {
        type: 'main_filtered',
      });

      expect(result).toEqual([]);
      expect(spaceStore.applyFilters).not.toHaveBeenCalled();
    });
  });
});
