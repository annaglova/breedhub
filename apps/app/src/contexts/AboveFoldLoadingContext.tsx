import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

/**
 * Single source of truth for skeleton anti-flash timing.
 *
 * Used in three semantically distinct places that must stay in lockstep:
 * 1. `useSkeletonWithDelay`'s `minDisplayMs` — once a skeleton is shown,
 *    keep it visible for at least this long so a fast resolve doesn't
 *    flash skeleton → real → maybe-skeleton-again.
 * 2. `AboveFoldLoadingProvider.skeletonDelay` — wait this long before
 *    treating "still loading" as "show skeleton". If the page resolves
 *    within this window, skeleton is never shown.
 * 3. `AboveFoldLoadingProvider.minLoadingTime` — minimum duration for
 *    `allBlocksReady` to flip true, even if every block reports ready
 *    immediately. Closes a race where the first render commits with
 *    `registeredCount=0 → allReady=true` before async block-registration
 *    effects fire.
 *
 * One constant keeps the perceived loading rhythm consistent across
 * page templates (public detail / edit / tab fullscreen / playground).
 * 100ms is well below the 200ms perceptual-instant threshold.
 */
export const SKELETON_ANTI_FLASH_MS = 100;

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
  minLoadingTime = SKELETON_ANTI_FLASH_MS,
  skeletonDelay = SKELETON_ANTI_FLASH_MS,
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

  // Sticky-ready: once all registered blocks have reported ready ONCE
  // within this provider mount, stay ready for the rest of the lifetime.
  // Aligns with SKELETON_LOADING_ARCHITECTURE P5/P8 — "background refreshes
  // never paint skeleton over existing data". Without this, tabs with async
  // lookups (pet/breed/litter use loadLookups effect) toggle their ready
  // signal false→true on entity-switch within a space, which would re-fire
  // the page-level skeleton even though the user already saw real content.
  // Provider unmounts on space change (different SpaceShell key), so the
  // ref correctly resets to false on cold-load into a new space.
  const computedReady = (registeredCount === 0 || readyCount === registeredCount) &&
                         minTimeElapsed;
  const hasEverBeenReadyRef = useRef(false);
  if (computedReady) {
    hasEverBeenReadyRef.current = true;
  }
  const allBlocksReady = hasEverBeenReadyRef.current || computedReady;

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
 * Conditional variant of useAboveFoldBlock — only registers when `enabled`
 * is true. Used by tabs that may or may not be in the above-fold gating
 * set: in `tabMode === "scroll"` (public page), the top N visible tabs
 * receive `enabled=true` via tabProps and gate the atomic transition;
 * the rest pass `enabled=false` and never register, so they don't block
 * the page-level skeleton flip.
 *
 * Hooks rules: this hook is always called (consistent call order per
 * render); only the *effect body* short-circuits when not enabled.
 */
export function useAboveFoldBlockIf(
  blockId: string,
  isReady: boolean,
  enabled: boolean,
): void {
  const context = useContext(AboveFoldLoadingContext);

  useEffect(() => {
    if (!context || !enabled) return;

    context.registerBlock(blockId, isReady);

    return () => {
      context.unregisterBlock(blockId);
    };
  }, [context, blockId, isReady, enabled]);
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
 * @param minDisplayMs - once shown, skeleton stays visible for at least this long (anti-flash). Default 100ms per SKELETON_LOADING_ARCHITECTURE §P9.
 * @returns shouldShowSkeleton - true while loading; remains true until minDisplayMs elapses after isLoading flips false
 */
export function useSkeletonWithDelay(isLoading: boolean, minDisplayMs = SKELETON_ANTI_FLASH_MS): boolean {
  const [showSkeleton, setShowSkeleton] = useState(isLoading);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isLoading) {
      // Show skeleton IMMEDIATELY
      setShowSkeleton(true);
      startTimeRef.current = Date.now();
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    } else if (showSkeleton) {
      // Delay hiding: keep skeleton for minimum display time to prevent flash
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, minDisplayMs - elapsed);
      if (remaining > 0) {
        timerRef.current = setTimeout(() => setShowSkeleton(false), remaining);
      } else {
        setShowSkeleton(false);
      }
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isLoading, minDisplayMs]);

  return showSkeleton;
}
