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

interface UseTabNavigationReturn {
  activeTab: string;
  handleTabChange: (fragment: string) => void;
  handleVisibilityChange?: (id: string, visibility: number) => void;
  visibilityMap?: Record<string, number>;
}

export function useTabNavigation({
  tabs,
  mode = "scroll",
  defaultTab,
}: UseTabNavigationProps): UseTabNavigationReturn {
  // Initialize activeTab with default or first tab
  const initialTab = defaultTab || tabs[0]?.fragment || "";
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [visibilityMap, setVisibilityMap] = useState<Record<string, number>>(
    {}
  );

  // Track if user manually clicked on tab (to prevent IntersectionObserver from overriding)
  const isManualScrollRef = useRef(false);

  // Handle tab change
  const handleTabChange = useCallback(
    (fragment: string) => {
      // Mark as manual scroll to prevent IntersectionObserver from overriding
      isManualScrollRef.current = true;
      setActiveTab(fragment);

      if (mode === "scroll") {
        // Find the tab section element
        const element = document.getElementById(`tab-${fragment}`);
        if (!element) return;

        // Calculate total height of sticky headers
        // We need to account for NameContainer + PageMenu that are sticky at top
        let stickyHeadersHeight = 0;

        // Find PageMenu parent - it should have a ref and be z-30
        const pageMenuContainer = element.closest('main')?.querySelector('.sticky.z-30.mb-6') as HTMLElement;

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

        if (!scrollContainer || scrollContainer === document.body) {
          // Fallback to window scroll
          const elementRect = element.getBoundingClientRect();
          const absoluteElementTop = elementRect.top + window.pageYOffset;
          const targetScrollTop = absoluteElementTop - stickyHeadersHeight;

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

          scrollContainer.scrollTo({
            top: targetScroll,
            behavior: "smooth",
          });
        }

        // Re-enable auto-update after scroll completes (smooth scroll takes ~500ms)
        setTimeout(() => {
          isManualScrollRef.current = false;
        }, 1000);

        // TODO Phase 3: Update URL hash
        // window.history.replaceState(null, '', `#${fragment}`);
      }
    },
    [mode]
  );

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
          // TODO Phase 3: Update URL hash
          // window.history.replaceState(null, '', `#${mostVisibleTab}`);
        }

        return newMap;
      });
    },
    [activeTab]
  );

  // Initialize from URL hash on mount (Phase 3)
  // useEffect(() => {
  //   const hash = window.location.hash.slice(1);
  //   if (hash && tabs.some(tab => tab.fragment === hash)) {
  //     setActiveTab(hash);
  //   }
  // }, [tabs]);

  // Return based on mode
  if (mode === "scroll") {
    return {
      activeTab,
      handleTabChange,
      handleVisibilityChange,
      visibilityMap,
    };
  }

  // Tabs mode: simpler return without visibility tracking
  return {
    activeTab,
    handleTabChange,
  };
}
