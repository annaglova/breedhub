/**
 * EntityStore Unit Tests
 *
 * Tests the base EntityStore class that provides entity management
 * for all business entities in the app.
 *
 * Run: pnpm --filter @breedhub/rxdb-store test
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EntityStore } from '../entity-store';

// Test entity type
interface TestEntity {
  id: string;
  name: string;
  value?: number;
}

describe('EntityStore', () => {
  let store: EntityStore<TestEntity>;

  beforeEach(() => {
    store = new EntityStore<TestEntity>();
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Initial state tests
  // ─────────────────────────────────────────────────────────────────────────────

  describe('initial state', () => {
    it('should have empty entities on creation', () => {
      expect(store.entityList.value).toEqual([]);
      expect(store.total.value).toBe(0);
      expect(store.isEmpty.value).toBe(true);
    });

    it('should have no selection initially', () => {
      expect(store.selectedEntity.value).toBeNull();
      expect(store.hasSelection.value).toBe(false);
      expect(store.getSelectedId()).toBeNull();
    });

    it('should not be loading initially', () => {
      expect(store.loading.value).toBe(false);
    });

    it('should have no error initially', () => {
      expect(store.error.value).toBeNull();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // setAll tests
  // ─────────────────────────────────────────────────────────────────────────────

  describe('setAll', () => {
    it('should set all entities', () => {
      const entities = [
        { id: '1', name: 'First' },
        { id: '2', name: 'Second' },
      ];

      store.setAll(entities);

      expect(store.total.value).toBe(2);
      expect(store.entityList.value).toEqual(entities);
      expect(store.isEmpty.value).toBe(false);
    });

    it('should replace existing entities', () => {
      store.setAll([{ id: '1', name: 'Old' }]);
      store.setAll([{ id: '2', name: 'New' }]);

      expect(store.total.value).toBe(1);
      expect(store.selectById('1')).toBeUndefined();
      expect(store.selectById('2')).toEqual({ id: '2', name: 'New' });
    });

    it('should auto-select first when autoSelectFirst is true', () => {
      store.setAll([{ id: '1', name: 'First' }, { id: '2', name: 'Second' }], true);

      expect(store.getSelectedId()).toBe('1');
      expect(store.selectedEntity.value).toEqual({ id: '1', name: 'First' });
    });

    it('should not auto-select when autoSelectFirst is false', () => {
      store.setAll([{ id: '1', name: 'First' }], false);

      expect(store.getSelectedId()).toBeNull();
    });

    it('should clear selection if selected entity was removed', () => {
      store.setAll([{ id: '1', name: 'First' }]);
      store.selectEntity('1');
      store.setAll([{ id: '2', name: 'Second' }]);

      expect(store.getSelectedId()).toBeNull();
    });

    it('should preserve selection if entity still exists', () => {
      store.setAll([{ id: '1', name: 'First' }, { id: '2', name: 'Second' }]);
      store.selectEntity('2');
      store.setAll([{ id: '2', name: 'Updated' }, { id: '3', name: 'Third' }]);

      expect(store.getSelectedId()).toBe('2');
    });

    it('should skip entities without id', () => {
      store.setAll([
        { id: '1', name: 'Valid' },
        { id: '', name: 'Empty ID' } as any,
        null as any,
        undefined as any,
      ]);

      expect(store.total.value).toBe(1);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // addOne tests
  // ─────────────────────────────────────────────────────────────────────────────

  describe('addOne', () => {
    it('should add a single entity', () => {
      store.addOne({ id: '1', name: 'First' });

      expect(store.total.value).toBe(1);
      expect(store.selectById('1')).toEqual({ id: '1', name: 'First' });
    });

    it('should not duplicate existing entity', () => {
      store.addOne({ id: '1', name: 'First' });
      store.addOne({ id: '1', name: 'Duplicate' });

      expect(store.total.value).toBe(1);
      expect(store.selectById('1')?.name).toBe('First'); // Original preserved
    });

    it('should ignore null/undefined entity', () => {
      store.addOne(null as any);
      store.addOne(undefined as any);

      expect(store.total.value).toBe(0);
    });

    it('should ignore entity without id', () => {
      store.addOne({ id: '', name: 'No ID' } as any);

      expect(store.total.value).toBe(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // addMany tests
  // ─────────────────────────────────────────────────────────────────────────────

  describe('addMany', () => {
    it('should add multiple entities', () => {
      store.addMany([
        { id: '1', name: 'First' },
        { id: '2', name: 'Second' },
      ]);

      expect(store.total.value).toBe(2);
    });

    it('should skip duplicates when adding many', () => {
      store.addOne({ id: '1', name: 'Existing' });
      store.addMany([
        { id: '1', name: 'Duplicate' },
        { id: '2', name: 'New' },
      ]);

      expect(store.total.value).toBe(2);
      expect(store.selectById('1')?.name).toBe('Existing');
    });

    it('should handle empty array', () => {
      store.addMany([]);

      expect(store.total.value).toBe(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // updateOne tests
  // ─────────────────────────────────────────────────────────────────────────────

  describe('updateOne', () => {
    it('should update existing entity', () => {
      store.addOne({ id: '1', name: 'Original', value: 10 });
      store.updateOne('1', { name: 'Updated' });

      const entity = store.selectById('1');
      expect(entity?.name).toBe('Updated');
      expect(entity?.value).toBe(10); // Other fields preserved
    });

    it('should do nothing if entity not found', () => {
      store.addOne({ id: '1', name: 'First' });
      store.updateOne('999', { name: 'Updated' });

      expect(store.total.value).toBe(1);
      expect(store.selectById('1')?.name).toBe('First');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // updateMany tests
  // ─────────────────────────────────────────────────────────────────────────────

  describe('updateMany', () => {
    it('should update multiple entities', () => {
      store.setAll([
        { id: '1', name: 'First' },
        { id: '2', name: 'Second' },
      ]);

      store.updateMany([
        { id: '1', changes: { name: 'Updated First' } },
        { id: '2', changes: { name: 'Updated Second' } },
      ]);

      expect(store.selectById('1')?.name).toBe('Updated First');
      expect(store.selectById('2')?.name).toBe('Updated Second');
    });

    it('should skip non-existent entities', () => {
      store.addOne({ id: '1', name: 'First' });

      store.updateMany([
        { id: '1', changes: { name: 'Updated' } },
        { id: '999', changes: { name: 'Not Found' } },
      ]);

      expect(store.total.value).toBe(1);
      expect(store.selectById('1')?.name).toBe('Updated');
    });

    it('should handle empty array', () => {
      store.addOne({ id: '1', name: 'First' });
      store.updateMany([]);

      expect(store.selectById('1')?.name).toBe('First');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // upsertOne tests
  // ─────────────────────────────────────────────────────────────────────────────

  describe('upsertOne', () => {
    it('should insert new entity', () => {
      store.upsertOne({ id: '1', name: 'New' });

      expect(store.total.value).toBe(1);
      expect(store.selectById('1')?.name).toBe('New');
    });

    it('should update existing entity', () => {
      store.addOne({ id: '1', name: 'Original' });
      store.upsertOne({ id: '1', name: 'Updated' });

      expect(store.total.value).toBe(1);
      expect(store.selectById('1')?.name).toBe('Updated');
    });

    it('should ignore null/undefined entity', () => {
      store.upsertOne(null as any);
      store.upsertOne(undefined as any);

      expect(store.total.value).toBe(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // upsertMany tests
  // ─────────────────────────────────────────────────────────────────────────────

  describe('upsertMany', () => {
    it('should upsert multiple entities', () => {
      store.addOne({ id: '1', name: 'Original' });

      store.upsertMany([
        { id: '1', name: 'Updated' },
        { id: '2', name: 'New' },
      ]);

      expect(store.total.value).toBe(2);
      expect(store.selectById('1')?.name).toBe('Updated');
      expect(store.selectById('2')?.name).toBe('New');
    });

    it('should handle empty array', () => {
      store.upsertMany([]);

      expect(store.total.value).toBe(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // removeOne tests
  // ─────────────────────────────────────────────────────────────────────────────

  describe('removeOne', () => {
    it('should remove entity by id', () => {
      store.setAll([
        { id: '1', name: 'First' },
        { id: '2', name: 'Second' },
      ]);

      store.removeOne('1');

      expect(store.total.value).toBe(1);
      expect(store.selectById('1')).toBeUndefined();
      expect(store.selectById('2')).toBeDefined();
    });

    it('should clear selection if removed entity was selected', () => {
      store.setAll([{ id: '1', name: 'First' }]);
      store.selectEntity('1');
      store.removeOne('1');

      expect(store.getSelectedId()).toBeNull();
    });

    it('should not affect selection if different entity removed', () => {
      store.setAll([
        { id: '1', name: 'First' },
        { id: '2', name: 'Second' },
      ]);
      store.selectEntity('1');
      store.removeOne('2');

      expect(store.getSelectedId()).toBe('1');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // removeMany tests
  // ─────────────────────────────────────────────────────────────────────────────

  describe('removeMany', () => {
    it('should remove multiple entities', () => {
      store.setAll([
        { id: '1', name: 'First' },
        { id: '2', name: 'Second' },
        { id: '3', name: 'Third' },
      ]);

      store.removeMany(['1', '2']);

      expect(store.total.value).toBe(1);
      expect(store.selectById('3')).toBeDefined();
    });

    it('should clear selection if selected entity is in removed list', () => {
      store.setAll([
        { id: '1', name: 'First' },
        { id: '2', name: 'Second' },
      ]);
      store.selectEntity('1');
      store.removeMany(['1', '2']);

      expect(store.getSelectedId()).toBeNull();
    });

    it('should handle empty array', () => {
      store.addOne({ id: '1', name: 'First' });
      store.removeMany([]);

      expect(store.total.value).toBe(1);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // removeAll tests
  // ─────────────────────────────────────────────────────────────────────────────

  describe('removeAll', () => {
    it('should remove all entities', () => {
      store.setAll([
        { id: '1', name: 'First' },
        { id: '2', name: 'Second' },
      ]);

      store.removeAll();

      expect(store.total.value).toBe(0);
      expect(store.isEmpty.value).toBe(true);
    });

    it('should clear selection', () => {
      store.setAll([{ id: '1', name: 'First' }]);
      store.selectEntity('1');
      store.removeAll();

      expect(store.getSelectedId()).toBeNull();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Selection tests
  // ─────────────────────────────────────────────────────────────────────────────

  describe('selection', () => {
    beforeEach(() => {
      store.setAll([
        { id: '1', name: 'First' },
        { id: '2', name: 'Second' },
        { id: '3', name: 'Third' },
      ]);
    });

    it('should select entity by id', () => {
      store.selectEntity('2');

      expect(store.getSelectedId()).toBe('2');
      expect(store.selectedEntity.value).toEqual({ id: '2', name: 'Second' });
      expect(store.hasSelection.value).toBe(true);
    });

    it('should select entity even if not loaded yet', () => {
      // This supports pretty URL navigation before entity is fetched
      store.selectEntity('999');

      expect(store.getSelectedId()).toBe('999');
      expect(store.selectedEntity.value).toBeNull(); // Not in store yet
    });

    it('should clear selection with null', () => {
      store.selectEntity('1');
      store.selectEntity(null);

      expect(store.getSelectedId()).toBeNull();
      expect(store.hasSelection.value).toBe(false);
    });

    it('should select first entity', () => {
      store.selectFirst();

      expect(store.getSelectedId()).toBe('1');
    });

    it('should select last entity', () => {
      store.selectLast();

      expect(store.getSelectedId()).toBe('3');
    });

    it('should clear selection with clearSelection', () => {
      store.selectEntity('1');
      store.clearSelection();

      expect(store.getSelectedId()).toBeNull();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Selector tests
  // ─────────────────────────────────────────────────────────────────────────────

  describe('selectors', () => {
    beforeEach(() => {
      store.setAll([
        { id: '1', name: 'Alpha', value: 10 },
        { id: '2', name: 'Beta', value: 20 },
        { id: '3', name: 'Gamma', value: 30 },
      ]);
    });

    it('should select by id', () => {
      expect(store.selectById('2')).toEqual({ id: '2', name: 'Beta', value: 20 });
      expect(store.selectById('999')).toBeUndefined();
    });

    it('should select by multiple ids', () => {
      const result = store.selectByIds(['1', '3', '999']);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('1');
      expect(result[1].id).toBe('3');
    });

    it('should select by predicate', () => {
      const result = store.selectWhere(e => e.value! > 15);

      expect(result).toHaveLength(2);
      expect(result.map(e => e.id)).toEqual(['2', '3']);
    });

    it('should check if entity exists', () => {
      expect(store.hasEntity('1')).toBe(true);
      expect(store.hasEntity('999')).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Loading/Error state tests
  // ─────────────────────────────────────────────────────────────────────────────

  describe('loading/error state', () => {
    it('should set loading state', () => {
      store.setLoading(true);
      expect(store.loading.value).toBe(true);

      store.setLoading(false);
      expect(store.loading.value).toBe(false);
    });

    it('should set error state', () => {
      store.setError('Something went wrong');
      expect(store.error.value).toBe('Something went wrong');
    });

    it('should clear error state', () => {
      store.setError('Error');
      store.clearError();

      expect(store.error.value).toBeNull();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Reset tests
  // ─────────────────────────────────────────────────────────────────────────────

  describe('reset', () => {
    it('should reset store to initial state', () => {
      store.setAll([{ id: '1', name: 'First' }]);
      store.selectEntity('1');
      store.setLoading(true);
      store.setError('Error');

      store.reset();

      expect(store.total.value).toBe(0);
      expect(store.getSelectedId()).toBeNull();
      expect(store.loading.value).toBe(false);
      expect(store.error.value).toBeNull();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // totalFromServer tests
  // ─────────────────────────────────────────────────────────────────────────────

  describe('totalFromServer', () => {
    it('should be null initially', () => {
      expect(store.totalFromServer.value).toBeNull();
    });

    it('should set total from server', () => {
      store.setTotalFromServer(1000);

      expect(store.totalFromServer.value).toBe(1000);
    });
  });
});
