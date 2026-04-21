// @vitest-environment jsdom

import { cleanup, renderHook, waitFor, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockState = vi.hoisted(() => ({
  loadTabDataPaginatedMock: vi.fn(),
  waitForSpaceStoreReadyMock: vi.fn(),
}));

vi.mock('../../services/tab-data.service', () => ({
  tabDataService: {
    loadTabDataPaginated: mockState.loadTabDataPaginatedMock,
  },
}));

vi.mock('../space-store-ready.helpers', () => ({
  waitForSpaceStoreReady: mockState.waitForSpaceStoreReadyMock,
}));

import { useInfiniteTabData } from '../useInfiniteTabData';
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

describe('useInfiniteTabData', () => {
  const dataSource: DataSourceConfig = {
    type: 'child',
    childTable: {
      table: 'pet_child',
      parentField: 'parent_id',
    },
  };

  beforeEach(() => {
    mockState.loadTabDataPaginatedMock.mockReset();
    mockState.waitForSpaceStoreReadyMock.mockReset();
    mockState.waitForSpaceStoreReadyMock.mockResolvedValue(undefined);
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('loads the first page on mount and exposes the pagination state', async () => {
    const deferred = createDeferred<{
      records: Array<{ id: string; name: string }>;
      total: number;
      hasMore: boolean;
      nextCursor: string | null;
    }>();

    mockState.loadTabDataPaginatedMock.mockImplementation(() => deferred.promise);

    const { result } = renderHook(() =>
      useInfiniteTabData({
        parentId: 'breed-1',
        dataSource,
        pageSize: 2,
      }),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(true);
    });

    deferred.resolve({
      records: [
        { id: 'pet-1', name: 'Alpha' },
        { id: 'pet-2', name: 'Beta' },
      ],
      total: 7,
      hasMore: true,
      nextCursor: '{"value":"Beta","tieBreaker":"pet-2"}',
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toEqual([
        { id: 'pet-1', name: 'Alpha' },
        { id: 'pet-2', name: 'Beta' },
      ]);
      expect(result.current.hasMore).toBe(true);
      expect(result.current.total).toBe(7);
    });

    expect(mockState.waitForSpaceStoreReadyMock).toHaveBeenCalledTimes(1);
    expect(mockState.loadTabDataPaginatedMock).toHaveBeenCalledWith(
      'breed-1',
      dataSource,
      { cursor: null, limit: 2 },
    );
  });

  it('loadMore appends the next page, flips isLoadingMore, and updates hasMore/cursor flow', async () => {
    const deferred = createDeferred<{
      records: Array<{ id: string; name: string }>;
      total: number;
      hasMore: boolean;
      nextCursor: string | null;
    }>();

    mockState.loadTabDataPaginatedMock
      .mockResolvedValueOnce({
        records: [{ id: 'pet-1', name: 'Alpha' }],
        total: 1,
        hasMore: true,
        nextCursor: '{"value":"Alpha","tieBreaker":"pet-1"}',
      })
      .mockImplementationOnce(() => deferred.promise);

    const { result } = renderHook(() =>
      useInfiniteTabData({
        parentId: 'breed-1',
        dataSource,
        pageSize: 1,
      }),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toEqual([{ id: 'pet-1', name: 'Alpha' }]);
    });

    await act(async () => {
      void result.current.loadMore();
    });

    await waitFor(() => {
      expect(result.current.isLoadingMore).toBe(true);
    });

    deferred.resolve({
      records: [{ id: 'pet-2', name: 'Beta' }],
      total: 1,
      hasMore: false,
      nextCursor: null,
    });

    await waitFor(() => {
      expect(result.current.isLoadingMore).toBe(false);
      expect(result.current.data).toEqual([
        { id: 'pet-1', name: 'Alpha' },
        { id: 'pet-2', name: 'Beta' },
      ]);
      expect(result.current.hasMore).toBe(false);
      expect(result.current.total).toBe(2);
    });

    expect(mockState.loadTabDataPaginatedMock).toHaveBeenNthCalledWith(
      2,
      'breed-1',
      dataSource,
      { cursor: '{"value":"Alpha","tieBreaker":"pet-1"}', limit: 1 },
    );
  });

  it('skips loadMore when there is no next cursor or no more records', async () => {
    mockState.loadTabDataPaginatedMock.mockResolvedValue({
      records: [{ id: 'pet-1', name: 'Alpha' }],
      total: 1,
      hasMore: false,
      nextCursor: null,
    });

    const { result } = renderHook(() =>
      useInfiniteTabData({
        parentId: 'breed-1',
        dataSource,
        pageSize: 1,
      }),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.loadMore();
    });

    expect(mockState.loadTabDataPaginatedMock).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual([{ id: 'pet-1', name: 'Alpha' }]);
  });

  it('refetch resets the accumulated data and reloads from the first page', async () => {
    mockState.loadTabDataPaginatedMock
      .mockResolvedValueOnce({
        records: [{ id: 'pet-1', name: 'Alpha' }],
        total: 3,
        hasMore: true,
        nextCursor: '{"value":"Alpha","tieBreaker":"pet-1"}',
      })
      .mockResolvedValueOnce({
        records: [{ id: 'pet-9', name: 'Reset' }],
        total: 1,
        hasMore: false,
        nextCursor: null,
      });

    const { result } = renderHook(() =>
      useInfiniteTabData({
        parentId: 'breed-1',
        dataSource,
        pageSize: 1,
      }),
    );

    await waitFor(() => {
      expect(result.current.data).toEqual([{ id: 'pet-1', name: 'Alpha' }]);
    });

    await act(async () => {
      await result.current.refetch();
    });

    await waitFor(() => {
      expect(result.current.data).toEqual([{ id: 'pet-9', name: 'Reset' }]);
      expect(result.current.hasMore).toBe(false);
      expect(result.current.total).toBe(1);
    });

    expect(mockState.loadTabDataPaginatedMock).toHaveBeenNthCalledWith(
      2,
      'breed-1',
      dataSource,
      { cursor: null, limit: 1 },
    );
  });

  it('preserves existing data when loadMore fails and exposes the error', async () => {
    const error = new Error('next page failed');

    mockState.loadTabDataPaginatedMock
      .mockResolvedValueOnce({
        records: [{ id: 'pet-1', name: 'Alpha' }],
        total: 1,
        hasMore: true,
        nextCursor: '{"value":"Alpha","tieBreaker":"pet-1"}',
      })
      .mockRejectedValueOnce(error);

    const { result } = renderHook(() =>
      useInfiniteTabData({
        parentId: 'breed-1',
        dataSource,
        pageSize: 1,
      }),
    );

    await waitFor(() => {
      expect(result.current.data).toEqual([{ id: 'pet-1', name: 'Alpha' }]);
    });

    await act(async () => {
      await result.current.loadMore();
    });

    await waitFor(() => {
      expect(result.current.isLoadingMore).toBe(false);
      expect(result.current.error).toBe(error);
    });

    expect(result.current.data).toEqual([{ id: 'pet-1', name: 'Alpha' }]);
    expect(console.error).toHaveBeenCalledWith(
      '[useInfiniteTabData] Error loading more:',
      error,
    );
  });

  it('resets and reloads from scratch when parentId changes', async () => {
    mockState.loadTabDataPaginatedMock
      .mockResolvedValueOnce({
        records: [{ id: 'pet-1', name: 'Alpha' }],
        total: 2,
        hasMore: true,
        nextCursor: '{"value":"Alpha","tieBreaker":"pet-1"}',
      })
      .mockResolvedValueOnce({
        records: [{ id: 'pet-8', name: 'Other parent' }],
        total: 1,
        hasMore: false,
        nextCursor: null,
      });

    const { result, rerender } = renderHook(
      ({ parentId }: { parentId: string }) =>
        useInfiniteTabData({
          parentId,
          dataSource,
          pageSize: 1,
        }),
      {
        initialProps: { parentId: 'breed-1' },
      },
    );

    await waitFor(() => {
      expect(result.current.data).toEqual([{ id: 'pet-1', name: 'Alpha' }]);
    });

    rerender({ parentId: 'breed-2' });

    await waitFor(() => {
      expect(result.current.data).toEqual([{ id: 'pet-8', name: 'Other parent' }]);
      expect(result.current.hasMore).toBe(false);
      expect(result.current.total).toBe(1);
      expect(result.current.error).toBeNull();
    });

    expect(mockState.loadTabDataPaginatedMock).toHaveBeenNthCalledWith(
      2,
      'breed-2',
      dataSource,
      { cursor: null, limit: 1 },
    );
  });
});
