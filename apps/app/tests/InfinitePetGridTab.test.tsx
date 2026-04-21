// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

const { mockPetCard } = vi.hoisted(() => ({
  mockPetCard: vi.fn(),
}));

vi.mock('@/components/shared/PetCard', () => ({
  PetCard: ({ pet }: { pet: { name: string } }) => {
    mockPetCard(pet);
    return <div data-testid="pet-card">{pet.name}</div>;
  },
}));

import { InfinitePetGridTab } from '../src/components/shared/InfinitePetGridTab';

describe('InfinitePetGridTab', () => {
  let container: HTMLDivElement;
  let root: Root;
  let intersectionCallback:
    | ((entries: Array<{ isIntersecting: boolean }>) => void)
    | null;
  let observeMock: ReturnType<typeof vi.fn>;
  let disconnectMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true);

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    intersectionCallback = null;
    observeMock = vi.fn();
    disconnectMock = vi.fn();
    mockPetCard.mockReset();

    class MockIntersectionObserver {
      constructor(callback: (entries: Array<{ isIntersecting: boolean }>) => void) {
        intersectionCallback = callback;
      }

      observe = observeMock;
      disconnect = disconnectMock;
    }

    Reflect.set(globalThis, 'IntersectionObserver', MockIntersectionObserver);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    Reflect.deleteProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT');
    vi.restoreAllMocks();
  });

  async function render(node: React.ReactNode) {
    await act(async () => {
      root.render(node);
    });
  }

  it('renders the default loading state', async () => {
    await render(
      <InfinitePetGridTab
        pets={[]}
        isLoading
        isFullscreen={false}
        emptyMessage="No pets"
      />,
    );

    expect(container.textContent).toContain('Loading...');
  });

  it('renders a custom loading fallback when provided', async () => {
    await render(
      <InfinitePetGridTab
        pets={[]}
        isLoading
        isFullscreen={false}
        emptyMessage="No pets"
        loadingFallback={<div>Custom loading</div>}
      />,
    );

    expect(container.textContent).toContain('Custom loading');
  });

  it('renders the empty state when there are no pets', async () => {
    await render(
      <InfinitePetGridTab
        pets={[]}
        isLoading={false}
        isFullscreen={false}
        emptyMessage="No pets found"
      />,
    );

    expect(container.textContent).toContain('No pets found');
  });

  it('renders pet cards and triggers loadMore when the sentinel intersects in fullscreen mode', async () => {
    const onLoadMore = vi.fn();

    await render(
      <InfinitePetGridTab
        pets={[
          { id: 'pet-1', name: 'Alpha', url: '' },
          { id: 'pet-2', name: 'Beta', url: '' },
        ]}
        isLoading={false}
        isFullscreen
        hasMore
        isLoadingMore={false}
        onLoadMore={onLoadMore}
        emptyMessage="No pets"
      />,
    );

    expect(mockPetCard).toHaveBeenCalledTimes(2);
    expect(observeMock).toHaveBeenCalledTimes(1);
    expect(intersectionCallback).not.toBeNull();

    await act(async () => {
      intersectionCallback?.([{ isIntersecting: true }]);
    });

    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it('does not trigger loadMore when there are no more pages', async () => {
    const onLoadMore = vi.fn();

    await render(
      <InfinitePetGridTab
        pets={[{ id: 'pet-1', name: 'Alpha', url: '' }]}
        isLoading={false}
        isFullscreen
        hasMore={false}
        isLoadingMore={false}
        onLoadMore={onLoadMore}
        emptyMessage="No pets"
      />,
    );

    await act(async () => {
      intersectionCallback?.([{ isIntersecting: true }]);
    });

    expect(onLoadMore).not.toHaveBeenCalled();
    expect(container.textContent).toContain('All 1 pets loaded');
  });
});
