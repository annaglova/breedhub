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

// Mock stores
vi.mock('../../stores/space-store.signal-store', () => ({
  spaceStore: {
    loadChildRecords: vi.fn(),
    applyFilters: vi.fn(),
  },
}));

vi.mock('../../stores/dictionary-store.signal-store', () => ({
  dictionaryStore: {
    initialized: { value: true },
    initialize: vi.fn(),
    getDictionary: vi.fn(),
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

    it('should handle VIEW tables (with _with_ in name) via child type', async () => {
      vi.mocked(spaceStore.loadChildRecords).mockResolvedValue([{ id: '1' }]);

      const result = await tabDataService.loadTabData('parent-id', {
        type: 'child',
        childTable: {
          table: 'top_patron_in_breed_with_contact',
          parentField: 'breed_id',
        },
      });

      // VIEWs are auto-detected by name pattern and handled by loadChild
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
    it('should pass limit and orderBy to SpaceStore', async () => {
      vi.mocked(spaceStore.loadChildRecords).mockResolvedValue([]);

      await tabDataService.loadTabData('parent-id', {
        type: 'child',
        childTable: {
          table: 'test_table',
          parentField: 'parent_id',
          limit: 50,
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
      vi.mocked(dictionaryStore.getDictionary).mockResolvedValue({
        records: [
          { id: 'ach-1', name: 'Bronze', additional: { position: 1 } },
          { id: 'ach-2', name: 'Silver', additional: { position: 2 } },
          { id: 'ach-3', name: 'Gold', additional: { position: 3 } },
        ],
        total: 3,
      });

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

      vi.mocked(dictionaryStore.getDictionary).mockResolvedValue({
        records: [
          { id: 'ach-1', name: 'Bronze', additional: {} },
          { id: 'ach-2', name: 'Silver', additional: {} },
        ],
        total: 2,
      });

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

      vi.mocked(dictionaryStore.getDictionary).mockResolvedValue({
        records: [
          { id: 'ach-1', name: 'Breed Achievement', additional: { entity: 'breed' } },
          { id: 'ach-2', name: 'Pet Achievement', additional: { entity: 'pet' } },
        ],
        total: 2,
      });

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

      vi.mocked(dictionaryStore.getDictionary).mockResolvedValue({
        records: [
          { id: 'ach-3', name: 'Gold', additional: { position: 3 } },
          { id: 'ach-1', name: 'Bronze', additional: { position: 1 } },
          { id: 'ach-2', name: 'Silver', additional: { position: 2 } },
        ],
        total: 3,
      });

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
      vi.mocked(dictionaryStore.getDictionary).mockResolvedValue({ records: [], total: 0 });

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
