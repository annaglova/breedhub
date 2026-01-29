import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

interface AboveFoldLoadingContextValue {
  /**
   * Register a block's loading state
   * Call this in useEffect when loading state changes
   * @param blockId - Unique block identifier (e.g., "cover", "name", "achievements")
   * @param isReady - true when block has finished loading its data
   */
  registerBlock: (blockId: string, isReady: boolean) => void;

  /**
   * Unregister a block (call on unmount)
   */
  unregisterBlock: (blockId: string) => void;

  /**
   * True when ALL registered blocks are ready
   */
  allBlocksReady: boolean;

  /**
   * True when skeleton should be shown (after delay elapsed)
   * Use this instead of !allBlocksReady to prevent flicker on cached data
   */
  shouldShowSkeleton: boolean;

  /**
   * Number of registered blocks (for debugging)
   */
  registeredCount: number;

  /**
   * Number of ready blocks (for debugging)
   */
  readyCount: number;
}

const AboveFoldLoadingContext = createContext<AboveFoldLoadingContextValue | null>(null);

interface AboveFoldLoadingProviderProps {
  children: React.ReactNode;
  /**
   * Minimum time to wait before showing content (prevents flash)
   * Default: 0 (no minimum)
   */
  minLoadingTime?: number;
  /**
   * Delay before showing skeleton (prevents flicker on cached data)
   * If loading completes within this time, skeleton is never shown
   * Default: 100ms
   */
  skeletonDelay?: number;
  /**
   * Called when all blocks are ready
   */
  onAllReady?: () => void;
}

/**
 * AboveFoldLoadingProvider - Coordinates loading state for above-fold blocks
 *
 * Wraps above-fold content and tracks when all blocks have finished loading.
 * Blocks register themselves via useAboveFoldBlock hook.
 * Content is shown only when ALL blocks are ready.
 *
 * @example
 * ```tsx
 * <AboveFoldLoadingProvider>
 *   <Cover />
 *   <Name />
 *   <Achievements />
 * </AboveFoldLoadingProvider>
 * ```
 */
export function AboveFoldLoadingProvider({
  children,
  minLoadingTime = 0,
  skeletonDelay = 100,
  onAllReady,
}: AboveFoldLoadingProviderProps) {
  // Track registered blocks and their ready state
  const [blocks, setBlocks] = useState<Record<string, boolean>>({});

  // Track if minimum loading time has passed
  const [minTimeElapsed, setMinTimeElapsed] = useState(minLoadingTime === 0);

  // Track if skeleton delay has passed (only show skeleton after delay)
  const [skeletonDelayElapsed, setSkeletonDelayElapsed] = useState(skeletonDelay === 0);

  // Track if we've already fired onAllReady
  const hasNotifiedReady = useRef(false);

  // Start min loading timer on mount
  useEffect(() => {
    if (minLoadingTime > 0) {
      const timer = setTimeout(() => {
        setMinTimeElapsed(true);
      }, minLoadingTime);
      return () => clearTimeout(timer);
    }
  }, [minLoadingTime]);

  // Start skeleton delay timer on mount
  // This prevents skeleton flicker for cached data that loads quickly
  useEffect(() => {
    if (skeletonDelay > 0) {
      const timer = setTimeout(() => {
        setSkeletonDelayElapsed(true);
      }, skeletonDelay);
      return () => clearTimeout(timer);
    }
  }, [skeletonDelay]);

  const registerBlock = useCallback((blockId: string, isReady: boolean) => {
    setBlocks((prev) => {
      // Skip if no change
      if (prev[blockId] === isReady) return prev;
      return { ...prev, [blockId]: isReady };
    });
  }, []);

  const unregisterBlock = useCallback((blockId: string) => {
    setBlocks((prev) => {
      if (!(blockId in prev)) return prev;
      const { [blockId]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  // Calculate if all blocks are ready
  const blockEntries = Object.entries(blocks);
  const registeredCount = blockEntries.length;
  const readyCount = blockEntries.filter(([, ready]) => ready).length;

  // All ready when:
  // - No blocks registered (no async loading needed) OR
  // - All registered blocks are ready
  // AND min time has elapsed
  const allBlocksReady = (registeredCount === 0 || readyCount === registeredCount) &&
                         minTimeElapsed;

  // Show skeleton only when:
  // - Not all blocks are ready AND
  // - Skeleton delay has elapsed (prevents flicker on fast cached loads)
  const shouldShowSkeleton = !allBlocksReady && skeletonDelayElapsed;

  // Notify when all ready (once)
  useEffect(() => {
    if (allBlocksReady && !hasNotifiedReady.current) {
      hasNotifiedReady.current = true;
      onAllReady?.();
    }
  }, [allBlocksReady, onAllReady]);

  // Reset notification flag when blocks change
  useEffect(() => {
    if (!allBlocksReady) {
      hasNotifiedReady.current = false;
    }
  }, [allBlocksReady]);

  const value = useMemo<AboveFoldLoadingContextValue>(
    () => ({
      registerBlock,
      unregisterBlock,
      allBlocksReady,
      shouldShowSkeleton,
      registeredCount,
      readyCount,
    }),
    [registerBlock, unregisterBlock, allBlocksReady, shouldShowSkeleton, registeredCount, readyCount]
  );

  return (
    <AboveFoldLoadingContext.Provider value={value}>
      {children}
    </AboveFoldLoadingContext.Provider>
  );
}

/**
 * Hook to access above-fold loading context
 */
export function useAboveFoldLoadingContext(): AboveFoldLoadingContextValue | null {
  return useContext(AboveFoldLoadingContext);
}

/**
 * Hook for blocks to register their loading state
 *
 * @param blockId - Unique identifier for this block
 * @param isReady - Whether this block has finished loading
 *
 * @example
 * ```tsx
 * function PetAchievements() {
 *   const { isLoading } = useTabData(...);
 *   useAboveFoldBlock("achievements", !isLoading);
 *   // ...
 * }
 * ```
 */
export function useAboveFoldBlock(blockId: string, isReady: boolean): void {
  const context = useContext(AboveFoldLoadingContext);

  useEffect(() => {
    if (!context) return;

    context.registerBlock(blockId, isReady);

    return () => {
      context.unregisterBlock(blockId);
    };
  }, [context, blockId, isReady]);
}

/**
 * Hook to check if all above-fold blocks are ready
 * Returns true if no context (for standalone usage)
 */
export function useAllAboveFoldReady(): boolean {
  const context = useContext(AboveFoldLoadingContext);
  // If no context, assume ready (backward compatibility)
  return context?.allBlocksReady ?? true;
}

/**
 * Hook to check if skeleton should be shown
 * Returns false if:
 * - No context (standalone usage)
 * - All blocks are ready
 * - Skeleton delay hasn't elapsed yet (prevents flicker)
 */
export function useShouldShowSkeleton(): boolean {
  const context = useContext(AboveFoldLoadingContext);
  // If no context, don't show skeleton
  return context?.shouldShowSkeleton ?? false;
}

/**
 * Hook to get skeleton delay state
 * Use this to build custom loading logic that respects skeleton delay
 *
 * @param isLoading - your loading state (e.g., !isEntityFullyLoaded || !allBlocksReady)
 * @returns shouldShowSkeleton - true only when loading AND delay has elapsed
 */
export function useSkeletonWithDelay(isLoading: boolean): boolean {
  const [delayElapsed, setDelayElapsed] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isLoading) {
      // Start delay timer when loading begins
      timerRef.current = setTimeout(() => {
        setDelayElapsed(true);
      }, 100); // 100ms delay
    } else {
      // Reset when loading ends
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      setDelayElapsed(false);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isLoading]);

  return isLoading && delayElapsed;
}
