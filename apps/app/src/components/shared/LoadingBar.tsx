import { spaceStore, loadingStore } from '@breedhub/rxdb-store';
import { useSignals } from '@preact/signals-react/runtime';

/**
 * LoadingBar - Global loading indicator
 *
 * Thin progress bar at the top of the screen.
 * Shows during data fetching/syncing operations.
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

  const isLoading = hasAxiosLoading || hasSignalLoading;

  if (!isLoading) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-[999] h-1 pointer-events-none">
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
