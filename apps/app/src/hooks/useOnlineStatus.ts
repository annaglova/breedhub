import { useState, useEffect, useRef } from 'react';
import { toast } from '@breedhub/rxdb-store';

/**
 * Hook to detect online/offline status
 *
 * Listens to browser online/offline events and returns current status.
 * Shows toast notifications on connectivity changes.
 *
 * @returns boolean - true if online, false if offline
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const isFirstRender = useRef(true);

  useEffect(() => {
    const handleOnline = () => {
      console.log('[useOnlineStatus] 🟢 Network is online');
      setIsOnline(true);
      toast.success('Internet connection restored');
    };

    const handleOffline = () => {
      console.log('[useOnlineStatus] 🔴 Network is offline');
      setIsOnline(false);
      toast.warning('No internet connection. Some features are limited.', { duration: 8000 });
    };

    // Show toast if already offline on mount (but not on first normal load)
    if (isFirstRender.current) {
      isFirstRender.current = false;
      if (!navigator.onLine) {
        toast.warning('No internet connection. Some features are limited.', { duration: 8000 });
      }
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
