import { useState } from "react";
import { cn } from "@ui/lib/utils";
import { TabHeader } from "./TabHeader";
import { ScrollableTab } from "./ScrollableTab";

export interface Tab {
  id: string;
  fragment: string;
  label: string;
  icon: React.ReactNode;
  comingSoon?: boolean;
  fullscreenUrl?: string;
  component: React.ComponentType<any>;
}

interface TabsContainerProps {
  tabs: Tab[];
  mode?: "scroll" | "tabs"; // scroll = all tabs rendered (public), tabs = only active shown (edit)
  activeTab?: string; // Required in tabs mode
  onTabChange?: (fragment: string) => void; // Required in tabs mode
  onVisibilityChange?: (id: string, visibility: number) => void; // Optional visibility tracking callback
  tabHeaderTop?: number; // Top position for sticky TabHeader in scroll mode
  className?: string;
}

/**
 * TabsContainer - Universal tabs container supporting two modes
 *
 * REFERENCE: /Users/annaglova/projects/org/libs/schema/domain/breed/pages/breed-page/breed.routing.ts
 *
 * Two modes:
 * 1. SCROLL mode (default) - Public pages:
 *    - Рендерить всі таби як scroll sections
 *    - TabHeader + ScrollableTab для кожного табу
 *    - Visibility tracking для всіх табів
 *    - Auto URL sync (implemented via hook)
 *
 * 2. TABS mode - Edit pages + fullscreen:
 *    - Shows only active tab content
 *    - TabHeader in compact mode
 *    - No scroll sections, classic tab switching
 */
export function TabsContainer({
  tabs,
  mode = "scroll",
  activeTab,
  onTabChange,
  onVisibilityChange,
  tabHeaderTop = 0,
  className,
}: TabsContainerProps) {
  // Use provided visibility handler or create internal one
  const handleVisibilityChange =
    onVisibilityChange ||
    ((id: string, visibility: number) => {
      // Fallback: internal tracking if no handler provided
      console.log(`Tab ${id} visibility: ${visibility}`);
    });

  // SCROLL MODE: Render all tabs as scroll sections
  if (mode === "scroll") {
    return (
      <div className={cn("w-full", className)}>
        {tabs.map((tab, index) => {
          const Component = tab.component;

          return (
            <ScrollableTab
              key={tab.id}
              id={tab.fragment}
              onVisibilityChange={handleVisibilityChange}
            >
              {/* Sticky TabHeader */}
              <div
                className="sticky z-20"
                style={{ top: `${tabHeaderTop}px` }}
              >
                <TabHeader
                  label={tab.label}
                  icon={tab.icon}
                  mode="list"
                  comingSoon={tab.comingSoon}
                  fullscreenUrl={tab.fullscreenUrl}
                  isFirst={index === 0}
                />
              </div>

              {/* Tab Content */}
              <div className="px-0 pb-8">
                <Component />
              </div>
            </ScrollableTab>
          );
        })}
      </div>
    );
  }

  // TABS MODE: Show only active tab
  const activeTabData = tabs.find((tab) => tab.fragment === activeTab);
  if (!activeTabData) return null;

  const Component = activeTabData.component;

  return (
    <div className={cn("w-full", className)}>
      <TabHeader
        label={activeTabData.label}
        icon={activeTabData.icon}
        mode="compact"
        comingSoon={activeTabData.comingSoon}
        fullscreenUrl={activeTabData.fullscreenUrl}
        isFirst={false}
      />

      {/* Active Tab Content */}
      <div className="px-0 pb-8">
        <Component />
      </div>
    </div>
  );
}
