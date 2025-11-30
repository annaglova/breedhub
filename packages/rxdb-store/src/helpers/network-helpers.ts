/**
 * Network Helpers
 *
 * Shared logic for detecting network status and errors.
 * Used by: DictionaryStore, SpaceStore, RouteStore
 */

/**
 * Check if browser is currently online
 */
export function isOnline(): boolean {
  return navigator.onLine;
}

/**
 * Check if browser is currently offline
 */
export function isOffline(): boolean {
  return !navigator.onLine;
}

/**
 * Detect if an error is a network-related error
 *
 * Checks multiple error properties to catch various network failure modes:
 * - Fetch failures
 * - Network disconnections
 * - Browser offline status
 *
 * @param error - Error to check
 * @returns true if this is a network error
 */
export function isNetworkError(error: unknown): boolean {
  const errorMessage = (error instanceof Error ? error.message : '').toLowerCase();
  const errorName = ((error as any)?.name || '').toLowerCase();
  const errorCode = ((error as any)?.code || '').toLowerCase();
  const errorString = String(error).toLowerCase();

  return (
    errorMessage.includes('fetch') ||
    errorMessage.includes('network') ||
    errorMessage.includes('disconnected') ||
    errorMessage.includes('failed to fetch') ||
    errorName.includes('network') ||
    errorName.includes('fetch') ||
    errorName.includes('disconnected') ||
    errorCode.includes('network') ||
    errorCode.includes('disconnected') ||
    errorCode.includes('err_internet_disconnected') ||
    errorString.includes('err_internet_disconnected') ||
    (error instanceof TypeError && errorMessage.includes('fetch')) ||
    !navigator.onLine
  );
}
