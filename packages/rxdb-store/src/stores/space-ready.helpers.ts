export interface WaitForReadyOptions {
  retries?: number;
  delayMs?: number;
  errorMessage?: string;
}

export async function waitForReady(
  isReady: () => boolean,
  {
    retries = 20,
    delayMs = 100,
    errorMessage = 'Not ready',
  }: WaitForReadyOptions = {},
): Promise<void> {
  let remainingRetries = retries;

  while (!isReady() && remainingRetries > 0) {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    remainingRetries--;
  }

  if (!isReady()) {
    throw new Error(errorMessage);
  }
}
