import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { waitForSpaceStoreReady } from '../space-store-ready.helpers';

const { initialized } = vi.hoisted(() => ({
  initialized: { value: false },
}));

vi.mock('../../stores/space-store.signal-store', () => ({
  spaceStore: {
    initialized,
  },
}));

describe('waitForSpaceStoreReady', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    initialized.value = false;
  });

  afterEach(() => {
    vi.useRealTimers();
    initialized.value = false;
  });

  it('resolves immediately when SpaceStore is already initialized', async () => {
    initialized.value = true;

    await expect(waitForSpaceStoreReady()).resolves.toBeUndefined();
  });

  it('waits until SpaceStore becomes initialized', async () => {
    const readyPromise = waitForSpaceStoreReady({ retries: 3, delayMs: 10 });

    await vi.advanceTimersByTimeAsync(10);
    initialized.value = true;
    await vi.advanceTimersByTimeAsync(10);

    await expect(readyPromise).resolves.toBeUndefined();
  });

  it('throws when SpaceStore does not initialize within retries', async () => {
    const readyPromise = waitForSpaceStoreReady({ retries: 2, delayMs: 10 });
    const assertion = expect(readyPromise).rejects.toThrow(
      'SpaceStore not initialized',
    );

    await vi.advanceTimersByTimeAsync(20);

    await assertion;
  });
});
