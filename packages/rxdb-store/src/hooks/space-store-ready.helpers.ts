import { spaceStore } from '../stores/space-store.signal-store';

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
  while (!spaceStore.initialized.value && retries > 0) {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    retries--;
  }

  if (!spaceStore.initialized.value) {
    throw new Error('SpaceStore not initialized');
  }
}
