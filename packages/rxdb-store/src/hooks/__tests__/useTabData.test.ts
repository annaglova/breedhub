// @vitest-environment jsdom

import { cleanup, renderHook, waitFor, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockState = vi.hoisted(() => ({
  loadTabDataMock: vi.fn(),
  waitForSpaceStoreReadyMock: vi.fn(),
  childRefreshSignal: { value: null as { parentId: string; tableType: string } | null },
}));

vi.mock('../../services/tab-data.service', () => ({
  tabDataService: {
    loadTabData: mockState.loadTabDataMock,
  },
}));

vi.mock('../space-store-ready.helpers', () => ({
  waitForSpaceStoreReady: mockState.waitForSpaceStoreReadyMock,
}));

vi.mock('../../stores/space-store.signal-store', () => ({
  spaceStore: {
    childRefreshSignal: mockState.childRefreshSignal,
  },
}));

import { useTabData } from '../useTabData';
import type { DataSourceConfig } from '../../types/tab-data.types';

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

describe('useTabData', () => {
  const dataSource: DataSourceConfig = {
    type: 'child',
    childTable: {
      table: 'title_in_pet_with_title',
      parentField: 'pet_id',
    },
  };

  beforeEach(() => {
    mockState.loadTabDataMock.mockReset();
    mockState.waitForSpaceStoreReadyMock.mockReset();
    mockState.childRefreshSignal.value = null;
    mockState.waitForSpaceStoreReadyMock.mockResolvedValue(undefined);
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('loads tab data after the store is ready and applies enrich atomically', async () => {
    const enrich = vi.fn(async (records: Array<{ id: string; name: string }>) =>
      records.map((record) => ({
        ...record,
        label: record.name.toUpperCase(),
      })),
    );

    mockState.loadTabDataMock.mockResolvedValue([
      { id: 'child-1', name: 'Champion' },
    ]);

    const { result } = renderHook(() =>
      useTabData({
        parentId: 'pet-1',
        dataSource,
        enrich,
      }),
    );

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toEqual([]);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toEqual([
        { id: 'child-1', name: 'Champion', label: 'CHAMPION' },
      ]);
    });

    expect(mockState.waitForSpaceStoreReadyMock).toHaveBeenCalledTimes(1);
    expect(mockState.loadTabDataMock).toHaveBeenCalledWith('pet-1', dataSource);
    expect(enrich).toHaveBeenCalledWith([{ id: 'child-1', name: 'Champion' }]);
    expect(result.current.error).toBeNull();
  });

  it('returns the done empty state without calling the service when disabled or parentId is missing', async () => {
    const { result, rerender } = renderHook(
      ({ parentId, enabled }: { parentId?: string; enabled?: boolean }) =>
        useTabData({
          parentId,
          dataSource,
          enabled,
        }),
      {
        initialProps: { parentId: 'pet-1', enabled: false },
      },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toEqual([]);
    });

    rerender({ parentId: undefined, enabled: true });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toEqual([]);
    });

    expect(mockState.waitForSpaceStoreReadyMock).not.toHaveBeenCalled();
    expect(mockState.loadTabDataMock).not.toHaveBeenCalled();
    expect(result.current.error).toBeNull();
  });

  it('captures loader errors and exposes them without leaving the hook stuck in loading', async () => {
    const error = new Error('tab load failed');
    mockState.loadTabDataMock.mockRejectedValue(error);

    const { result } = renderHook(() =>
      useTabData({
        parentId: 'pet-1',
        dataSource,
      }),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(error);
    });

    expect(console.error).toHaveBeenCalledWith('[useTabData] Error:', error);
    expect(result.current.data).toEqual([]);
  });

  it('refetches silently and keeps the previous data visible until the fresh payload resolves', async () => {
    const deferred = createDeferred<Array<{ id: string; name: string }>>();

    mockState.loadTabDataMock
      .mockResolvedValueOnce([{ id: 'child-1', name: 'Old title' }])
      .mockImplementationOnce(() => deferred.promise);

    const { result } = renderHook(() =>
      useTabData({
        parentId: 'pet-1',
        dataSource,
      }),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toEqual([{ id: 'child-1', name: 'Old title' }]);
    });

    let refetchPromise!: Promise<void>;
    await act(async () => {
      refetchPromise = result.current.refetch();
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toEqual([{ id: 'child-1', name: 'Old title' }]);

    deferred.resolve([{ id: 'child-1', name: 'New title' }]);
    await act(async () => {
      await refetchPromise;
    });

    await waitFor(() => {
      expect(result.current.data).toEqual([{ id: 'child-1', name: 'New title' }]);
    });

    expect(mockState.loadTabDataMock).toHaveBeenCalledTimes(2);
  });

  it('auto-refetches only when childRefreshSignal matches the same parent and normalized table name', async () => {
    mockState.loadTabDataMock
      .mockResolvedValueOnce([{ id: 'child-1', name: 'Initial' }])
      .mockResolvedValueOnce([{ id: 'child-1', name: 'Refreshed' }]);

    const { result, rerender } = renderHook(
      ({ parentId }: { parentId: string }) =>
        useTabData({
          parentId,
          dataSource,
        }),
      {
        initialProps: { parentId: 'pet-1' },
      },
    );

    await waitFor(() => {
      expect(result.current.data).toEqual([{ id: 'child-1', name: 'Initial' }]);
    });

    mockState.childRefreshSignal.value = {
      parentId: 'pet-2',
      tableType: 'title_in_pet',
    };
    rerender({ parentId: 'pet-1' });

    await waitFor(() => {
      expect(mockState.loadTabDataMock).toHaveBeenCalledTimes(1);
    });

    mockState.childRefreshSignal.value = {
      parentId: 'pet-1',
      tableType: 'title_in_pet',
    };
    rerender({ parentId: 'pet-1' });

    await waitFor(() => {
      expect(mockState.loadTabDataMock).toHaveBeenCalledTimes(2);
      expect(result.current.data).toEqual([{ id: 'child-1', name: 'Refreshed' }]);
    });
  });
});
