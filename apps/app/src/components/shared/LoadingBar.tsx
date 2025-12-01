import { spaceStore, loadingStore } from '@breedhub/rxdb-store';
import { useSignals } from '@preact/signals-react/runtime';
import { useState, useEffect, useRef } from 'react';

// Minimum time to show loading bar (prevents flickering)
const MIN_DISPLAY_TIME = 400;
// Fade out duration
const FADE_OUT_DURATION = 300;

/**
 * LoadingBar - Global loading indicator
 *
 * Thin progress bar at the top of the screen.
 * Shows during data fetching/syncing operations.
 *
 * Features:
 * - Minimum display time to prevent flickering on fast requests
 * - Smooth fade-out animation
 * - Debounced show (won't flash for very fast requests)
 *
 * Listens to:
 * - loadingStore (axios requests via signals)
 * - spaceStore (RxDB syncing)
 *
 * Based on Angular: libs/schema/ui/loading-bar-ui/loading-bar.component.ts
 */
export function LoadingBar() {
  useSignals();

  // Loading states from signal stores
  const hasAxiosLoading = loadingStore.isLoading.value;
  const hasSignalLoading = spaceStore.loading.value || spaceStore.isSyncing.value;
  const isActuallyLoading = hasAxiosLoading || hasSignalLoading;

  // Visual state (with minimum display time)
  const [isVisible, setIsVisible] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);

  const showTimeRef = useRef<number>(0);
  const fadeOutTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (isActuallyLoading) {
      // Start loading - show immediately
      setIsVisible(true);
      setIsFadingOut(false);
      showTimeRef.current = Date.now();

      // Clear any pending fade-out
      if (fadeOutTimerRef.current) {
        clearTimeout(fadeOutTimerRef.current);
      }
    } else if (isVisible && !isFadingOut) {
      // Loading finished - ensure minimum display time, then fade out
      const elapsed = Date.now() - showTimeRef.current;
      const remaining = Math.max(0, MIN_DISPLAY_TIME - elapsed);

      fadeOutTimerRef.current = setTimeout(() => {
        setIsFadingOut(true);

        // Hide after fade-out animation
        fadeOutTimerRef.current = setTimeout(() => {
          setIsVisible(false);
          setIsFadingOut(false);
        }, FADE_OUT_DURATION);
      }, remaining);
    }

    return () => {
      if (fadeOutTimerRef.current) {
        clearTimeout(fadeOutTimerRef.current);
      }
    };
  }, [isActuallyLoading, isVisible, isFadingOut]);

  if (!isVisible) {
    return null;
  }

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[999] h-1 pointer-events-none"
      style={{
        opacity: isFadingOut ? 0 : 1,
        transition: `opacity ${FADE_OUT_DURATION}ms ease-out`,
      }}
    >
      <div className="h-full w-full bg-primary-100 overflow-hidden">
        <div
          className="h-full bg-primary-500"
          style={{
            animation: 'loading-bar 1.5s ease-in-out infinite',
          }}
        />
      </div>
      <style>{`
        @keyframes loading-bar {
          0% {
            width: 0%;
            margin-left: 0%;
          }
          50% {
            width: 70%;
            margin-left: 15%;
          }
          100% {
            width: 0%;
            margin-left: 100%;
          }
        }
      `}</style>
    </div>
  );
}
