/**
 * Cleanup Scheduler Helper
 *
 * Shared logic for scheduling periodic cleanup tasks.
 * Used by: DictionaryStore, SpaceStore, RouteStore
 */

// Cleanup runs every 24 hours
export const CLEANUP_INTERVAL = 24 * 60 * 60 * 1000;

/**
 * Schedule periodic cleanup (every 24 hours)
 *
 * @param cleanupFn - Async function to run for cleanup
 * @param logPrefix - Prefix for error logs
 * @returns Interval ID (can be used to cancel with clearInterval)
 */
export function schedulePeriodicCleanup(
  cleanupFn: () => Promise<void>,
  logPrefix: string = '[Cleanup]'
): ReturnType<typeof setInterval> {
  return setInterval(() => {
    cleanupFn().catch(error => {
      console.error(`${logPrefix} Periodic cleanup failed:`, error);
    });
  }, CLEANUP_INTERVAL);
}

/**
 * Run initial cleanup (non-blocking, fire-and-forget)
 *
 * @param cleanupFn - Async function to run for cleanup
 * @param logPrefix - Prefix for error logs
 */
export function runInitialCleanup(
  cleanupFn: () => Promise<void>,
  logPrefix: string = '[Cleanup]'
): void {
  cleanupFn().catch(error => {
    console.error(`${logPrefix} Initial cleanup failed:`, error);
  });
}
