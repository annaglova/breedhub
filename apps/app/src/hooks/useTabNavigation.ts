import { useState, useEffect, useCallback } from "react";
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

  // Handle tab change
  const handleTabChange = useCallback(
    (fragment: string) => {
      setActiveTab(fragment);

      if (mode === "scroll") {
        // Scroll to tab section
        const element = document.getElementById(`tab-${fragment}`);
        if (element) {
          element.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }

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
