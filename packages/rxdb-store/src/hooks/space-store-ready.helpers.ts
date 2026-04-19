import { spaceStore } from '../stores/space-store.signal-store';
import { waitForReady } from '../stores/space-ready.helpers';

export interface WaitForSpaceStoreReadyOptions {
  retries?: number;
  delayMs?: number;
}

export async function waitForSpaceStoreReady(
  {
    retries = 20,
    delayMs = 100,
  }: WaitForSpaceStoreReadyOptions = {},
): Promise<void> {
  await waitForReady(
    () => spaceStore.initialized.value,
    {
      retries,
      delayMs,
      errorMessage: 'SpaceStore not initialized',
    },
  );
}
