import { useState, useEffect } from 'react';

/**
 * Hook to detect online/offline status
 *
 * Listens to browser online/offline events and returns current status
 *
 * @returns boolean - true if online, false if offline
 *
 * @example
 * ```tsx
 * const isOnline = useOnlineStatus();
 *
 * return (
 *   <div>
 *     {isOnline ? '🟢 Online' : '🔴 Offline'}
 *   </div>
 * );
 * ```
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => {
      console.log('[useOnlineStatus] 🟢 Network is online');
      setIsOnline(true);
    };

    const handleOffline = () => {
      console.log('[useOnlineStatus] 🔴 Network is offline');
      setIsOnline(false);
    };

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
