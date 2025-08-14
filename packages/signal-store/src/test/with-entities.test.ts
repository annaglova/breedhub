import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { createSignalStore } from '../create-signal-store';
import { withEntities, withSelection } from '../features/with-entities';
import { Entity } from '../types';

interface TestEntity extends Entity {
  id: string;
  name: string;
  value: number;
}

describe('withEntities', () => {
  it('should create a store with entity management', () => {
    const useTestStore = createSignalStore<TestEntity>('test', [
      withEntities<TestEntity>(),
    ]);

    const { result } = renderHook(() => useTestStore());

    expect(result.current.entities).toBeDefined();
    expect(result.current.entities.size).toBe(0);
    expect(result.current.ids).toEqual([]);
  });

  it('should add entities', () => {
    const useTestStore = createSignalStore<TestEntity>('test', [
      withEntities<TestEntity>(),
    ]);

    const { result } = renderHook(() => useTestStore());

    act(() => {
      result.current.addEntity({ id: '1', name: 'Test 1', value: 100 });
    });

    expect(result.current.entities.size).toBe(1);
    expect(result.current.ids).toEqual(['1']);
  });

  it('should update entities', () => {
    const useTestStore = createSignalStore<TestEntity>('test', [
      withEntities<TestEntity>(),
    ]);

    const { result } = renderHook(() => useTestStore());

    act(() => {
      result.current.addEntity({ id: '1', name: 'Test 1', value: 100 });
      result.current.updateEntity('1', { value: 200 });
    });

    const entity = result.current.entities.get('1');
    expect(entity?.value).toBe(200);
  });

  it('should remove entities', () => {
    const useTestStore = createSignalStore<TestEntity>('test', [
      withEntities<TestEntity>(),
    ]);

    const { result } = renderHook(() => useTestStore());

    act(() => {
      result.current.addEntity({ id: '1', name: 'Test 1', value: 100 });
      result.current.removeEntity('1');
    });

    expect(result.current.entities.size).toBe(0);
    expect(result.current.ids).toEqual([]);
  });
});

describe('withSelection', () => {
  it('should handle entity selection', () => {
    const useTestStore = createSignalStore<TestEntity>('test', [
      withEntities<TestEntity>(),
      withSelection<TestEntity>(),
    ]);

    const { result } = renderHook(() => useTestStore());

    act(() => {
      result.current.addEntity({ id: '1', name: 'Test 1', value: 100 });
      result.current.selectEntity('1');
    });

    expect(result.current.selectedId).toBe('1');
  });

  it('should handle multiple selection', () => {
    const useTestStore = createSignalStore<TestEntity>('test', [
      withEntities<TestEntity>(),
      withSelection<TestEntity>(),
    ]);

    const { result } = renderHook(() => useTestStore());

    act(() => {
      result.current.addEntity({ id: '1', name: 'Test 1', value: 100 });
      result.current.addEntity({ id: '2', name: 'Test 2', value: 200 });
      result.current.selectEntities(['1', '2']);
    });

    expect(result.current.selectedIds.size).toBe(2);
    expect(result.current.selectedIds.has('1')).toBe(true);
    expect(result.current.selectedIds.has('2')).toBe(true);
  });
});