import { useState, useEffect, useCallback, useRef } from "react";
import type { Tab } from "@/components/tabs/TabsContainer";

/**
 * useTabNavigation - Hook for managing tab navigation
 *
 * REFERENCE: /Users/annaglova/projects/org/libs/schema/ui/page-tabs.feature.ts
 *
 * Features:
 * - Manages activeTab state
 * - Handles visibility tracking (scroll mode)
 * - Provides handleTabChange function
 * - Future: Will handle URL hash sync (Phase 3)
 *
 * Usage:
 * ```tsx
 * const { activeTab, handleTabChange, handleVisibilityChange } = useTabNavigation(tabs);
 * ```
 */

interface UseTabNavigationProps {
  tabs: Tab[];
  mode?: "scroll" | "tabs";
  defaultTab?: string; // Default active tab (default: first tab)
}

interface DebugInfo {
  timestamp: number;
  fragment: string;
  found: {
    element: boolean;
    pageMenuContainer: boolean;
    tabHeader: boolean;
    scrollContainer: boolean;
  };
  values: {
    stickyHeadersHeight: number;
    elementTop: number;
    containerTop: number;
    desiredElementTop: number;
    scrollDelta: number;
    targetScroll: number;
    currentScroll: number;
  };
  scrollContainer?: {
    scrollTop: number;
    scrollHeight: number;
    clientHeight: number;
    overflow: string;
    overflowY: string;
    scrollBehavior: string;
    scrollTopAfterScroll: number;
  };
}

interface UseTabNavigationReturn {
  activeTab: string;
  handleTabChange: (fragment: string) => void;
  handleVisibilityChange?: (id: string, visibility: number) => void;
  visibilityMap?: Record<string, number>;
  debugInfo?: DebugInfo | null;
}

export function useTabNavigation({
  tabs,
  mode = "scroll",
  defaultTab,
}: UseTabNavigationProps): UseTabNavigationReturn {
  // Initialize activeTab from URL hash or default
  const getInitialTab = () => {
    const hash = window.location.hash.slice(1);
    // Check if hash matches any tab fragment
    if (hash && tabs.some(tab => tab.fragment === hash)) {
      return hash;
    }
    return defaultTab || tabs[0]?.fragment || "";
  };

  const [activeTab, setActiveTab] = useState<string>(getInitialTab);
  const [visibilityMap, setVisibilityMap] = useState<Record<string, number>>(
    {}
  );
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);

  // Track if user manually clicked on tab (to prevent IntersectionObserver from overriding)
  const isManualScrollRef = useRef(false);

  // Update URL hash when activeTab changes
  const updateUrlHash = useCallback((fragment: string) => {
    const url = new URL(window.location.href);
    url.hash = fragment;
    window.history.replaceState(null, '', url.toString());
  }, []);

  // Set initial hash on mount if not present
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash && activeTab) {
      updateUrlHash(activeTab);
    }
  }, []); // Only on mount

  // Handle tab change
  const handleTabChange = useCallback(
    (fragment: string) => {
      // Mark as manual scroll to prevent IntersectionObserver from overriding
      isManualScrollRef.current = true;
      setActiveTab(fragment);
      updateUrlHash(fragment);

      if (mode === "scroll") {
        // Find the tab section element
        const element = document.getElementById(`tab-${fragment}`);
        if (!element) return;

        // Wait for element to be fully rendered and positioned
        // Use multiple strategies to ensure timing
        const attemptScroll = () => {
          // Check if element has proper dimensions
          const rect = element.getBoundingClientRect();
          if (rect.height === 0 || rect.width === 0) {
            // Element not fully rendered yet, try again
            requestAnimationFrame(attemptScroll);
            return;
          }

          // Element is ready, perform scroll
          performScroll(element, fragment);
        };

        // Start with requestAnimationFrame chain
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            attemptScroll();
          });
        });
      }
    },
    [mode, updateUrlHash]
  );

  // Separate function for scroll logic
  const performScroll = (element: HTMLElement, fragment: string) => {
        // Special case: First tab (Overview) - scroll to top (0) to show full cover
        const isFirstTab = tabs[0]?.fragment === fragment;

        if (isFirstTab) {
          // Find the scrollable container
          let scrollContainer: HTMLElement | null = element.parentElement;
          while (scrollContainer && scrollContainer !== document.body) {
            const styles = window.getComputedStyle(scrollContainer);
            if (styles.overflowY === 'auto' || styles.overflowY === 'scroll') {
              break;
            }
            scrollContainer = scrollContainer.parentElement;
          }

          if (scrollContainer && scrollContainer !== document.body) {
            // Scroll container to top
            scrollContainer.scrollTop = 0;
          } else {
            // Fallback to window scroll
            window.scrollTo({ top: 0, behavior: "smooth" });
          }

          // Re-enable auto-update after scroll completes
          setTimeout(() => {
            isManualScrollRef.current = false;
          }, 1000);

          return; // Exit early for first tab
        }

        // For other tabs: Calculate total height of sticky headers
        // We need to account for NameContainer + PageMenu that are sticky at top
        let stickyHeadersHeight = 0;

        // Find PageMenu parent - it should have a ref and be z-30
        const pageMenuContainer = element.closest('main')?.querySelector('.sticky.z-30.mb-6') as HTMLElement;
        const foundPageMenu = !!pageMenuContainer;

        let foundTabHeader = false;
        if (pageMenuContainer) {
          // Get the 'top' style value which tells us where PageMenu is positioned
          const pageMenuTop = parseInt(pageMenuContainer.style.top || '0');
          // PageMenu top = NameContainer height, so total = NameContainer + PageMenu + margin
          // Use getBoundingClientRect to get actual rendered height
          const pageMenuRect = pageMenuContainer.getBoundingClientRect();
          const styles = window.getComputedStyle(pageMenuContainer);
          const marginBottom = parseInt(styles.marginBottom || '0');

          // Find TabHeader - it's the first sticky element in the section
          const section = element.closest('section');
          const tabHeader = section?.querySelector('.sticky') as HTMLElement;
          let tabHeaderHeight = 0;
          if (tabHeader) {
            foundTabHeader = true;
            const tabHeaderRect = tabHeader.getBoundingClientRect();
            tabHeaderHeight = tabHeaderRect.height;
          }

          stickyHeadersHeight = pageMenuTop + pageMenuRect.height + marginBottom + tabHeaderHeight;
        } else {
          // Fallback: just use a reasonable default
          stickyHeadersHeight = 250;
        }

        // Find the scrollable container (element with overflow-y-auto)
        let scrollContainer: HTMLElement | null = element.parentElement;
        while (scrollContainer && scrollContainer !== document.body) {
          const styles = window.getComputedStyle(scrollContainer);
          if (styles.overflowY === 'auto' || styles.overflowY === 'scroll') {
            break;
          }
          scrollContainer = scrollContainer.parentElement;
        }

        const foundScrollContainer = !!(scrollContainer && scrollContainer !== document.body);

        if (!scrollContainer || scrollContainer === document.body) {
          // Fallback to window scroll
          const elementRect = element.getBoundingClientRect();
          const absoluteElementTop = elementRect.top + window.pageYOffset;
          const targetScrollTop = absoluteElementTop - stickyHeadersHeight;

          // Debug info for window scroll
          setDebugInfo({
            timestamp: Date.now(),
            fragment,
            found: {
              element: true,
              pageMenuContainer: foundPageMenu,
              tabHeader: foundTabHeader,
              scrollContainer: false,
            },
            values: {
              stickyHeadersHeight,
              elementTop: elementRect.top,
              containerTop: 0,
              desiredElementTop: stickyHeadersHeight,
              scrollDelta: absoluteElementTop - stickyHeadersHeight,
              targetScroll: targetScrollTop,
              currentScroll: window.pageYOffset,
            },
          });

          window.scrollTo({
            top: targetScrollTop,
            behavior: "smooth",
          });
        } else {
          // Scroll within container - pure viewport-based approach

          // All measurements relative to viewport (screen top)
          const containerRect = scrollContainer.getBoundingClientRect();
          const elementRect = element.getBoundingClientRect();

          // Where is element NOW in viewport
          const elementTop = elementRect.top;

          // Where does scroll container start in viewport
          const containerTop = containerRect.top;

          // Where we WANT element to be: under sticky headers
          const desiredElementTop = containerTop + stickyHeadersHeight;

          // How much to scroll (delta)
          const scrollDelta = elementTop - desiredElementTop;

          // Apply scroll
          const targetScroll = scrollContainer.scrollTop + scrollDelta;

          // Debug info
          setDebugInfo({
            timestamp: Date.now(),
            fragment,
            found: {
              element: true,
              pageMenuContainer: foundPageMenu,
              tabHeader: foundTabHeader,
              scrollContainer: foundScrollContainer,
            },
            values: {
              stickyHeadersHeight,
              elementTop,
              containerTop,
              desiredElementTop,
              scrollDelta,
              targetScroll,
              currentScroll: scrollContainer.scrollTop,
            },
          });

          // Capture scroll container info
          const styles = window.getComputedStyle(scrollContainer);
          const scrollTopBefore = scrollContainer.scrollTop;

          // DON'T use scrollIntoView - it scrolls wrong container
          // Manually scroll our specific container
          scrollContainer.scrollTop = targetScroll;

          const scrollTopAfter = scrollContainer.scrollTop;

          // Update debug info with scroll container details
          setDebugInfo(prev => ({
            ...prev!,
            scrollContainer: {
              scrollTop: scrollTopBefore,
              scrollHeight: scrollContainer.scrollHeight,
              clientHeight: scrollContainer.clientHeight,
              overflow: styles.overflow,
              overflowY: styles.overflowY,
              scrollBehavior: styles.scrollBehavior,
              scrollTopAfterScroll: scrollTopAfter,
            },
          }));
        }

        // Re-enable auto-update after scroll completes (smooth scroll takes ~500ms)
        setTimeout(() => {
          isManualScrollRef.current = false;
        }, 1000);
  };

  // Handle visibility change (scroll mode only)
  const handleVisibilityChange = useCallback(
    (id: string, visibility: number) => {
      setVisibilityMap((prev) => {
        const newMap = { ...prev, [id]: visibility };

        // Skip auto-update if user manually scrolling
        if (isManualScrollRef.current) {
          return newMap;
        }

        // Find most visible tab
        let maxVisibility = 0;
        let mostVisibleTab = "";

        Object.entries(newMap).forEach(([tabId, vis]) => {
          if (vis > maxVisibility) {
            maxVisibility = vis;
            mostVisibleTab = tabId;
          }
        });

        // Update activeTab if most visible tab changed and visibility > 50%
        if (mostVisibleTab && maxVisibility > 0.5 && mostVisibleTab !== activeTab) {
          setActiveTab(mostVisibleTab);
          updateUrlHash(mostVisibleTab);
        }

        return newMap;
      });
    },
    [activeTab, updateUrlHash]
  );

  // Return based on mode
  if (mode === "scroll") {
    return {
      activeTab,
      handleTabChange,
      handleVisibilityChange,
      visibilityMap,
      debugInfo,
    };
  }

  // Tabs mode: simpler return without visibility tracking
  return {
    activeTab,
    handleTabChange,
    debugInfo,
  };
}
