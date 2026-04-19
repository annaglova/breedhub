import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';
import { waitForReady } from '../space-ready.helpers';

describe('space-ready.helpers', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves immediately when the readiness predicate is already true', async () => {
    await expect(waitForReady(() => true)).resolves.toBeUndefined();
  });

  it('waits until the readiness predicate becomes true', async () => {
    let ready = false;

    const readyPromise = waitForReady(() => ready, {
      retries: 3,
      delayMs: 10,
      errorMessage: 'Still not ready',
    });

    await vi.advanceTimersByTimeAsync(10);
    ready = true;
    await vi.advanceTimersByTimeAsync(10);

    await expect(readyPromise).resolves.toBeUndefined();
  });

  it('throws with the provided message when readiness never flips', async () => {
    const readyPromise = waitForReady(() => false, {
      retries: 2,
      delayMs: 10,
      errorMessage: 'Still not ready',
    });
    const assertion = expect(readyPromise).rejects.toThrow('Still not ready');

    await vi.advanceTimersByTimeAsync(20);

    await assertion;
  });
});
