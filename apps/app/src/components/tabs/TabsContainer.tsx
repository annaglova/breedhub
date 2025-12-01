import { useState } from "react";
import { cn } from "@ui/lib/utils";
import { TabHeader } from "./TabHeader";
import { ScrollableTab } from "./ScrollableTab";
import type { IconConfig } from "@breedhub/rxdb-store";

export interface Tab {
  id: string;
  fragment: string;
  label: string;
  icon: IconConfig; // Changed from React.ReactNode to IconConfig for universal icon support
  badge?: string; // "Coming soon", "New", "Beta", etc.
  fullscreenButton?: boolean; // Show fullscreen button (generates URL from fragment)
  recordsCount?: number; // Number of records to fetch for this tab
  component: React.ComponentType<any>;
}

interface TabsContainerProps {
  tabs: Tab[];
  mode?: "scroll" | "tabs"; // scroll = all tabs rendered (public), tabs = only active shown (edit)
  activeTab?: string; // Required in tabs mode
  onTabChange?: (fragment: string) => void; // Required in tabs mode
  onVisibilityChange?: (id: string, visibility: number) => void; // Optional visibility tracking callback
  tabHeaderTop?: number; // Top position for sticky TabHeader in scroll mode
  entitySlug?: string; // Entity slug for generating fullscreen URLs (e.g., "affenpinscher")
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
  entitySlug,
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
          // Generate fullscreen URL from fragment if fullscreenButton is enabled
          // New format: /{entitySlug}/{tabSlug} (nested route)
          // Fallback to hash-based URL if entitySlug not provided
          const fullscreenUrl = tab.fullscreenButton
            ? entitySlug
              ? `/${entitySlug}/${tab.fragment}`
              : `#${tab.fragment}/fullscreen`
            : undefined;

          return (
            <section key={tab.id} className="relative">
              {/* Sticky TabHeader */}
              <TabHeader
                label={tab.label}
                icon={tab.icon}
                mode="list"
                badge={tab.badge}
                fullscreenUrl={fullscreenUrl}
                isFirst={index === 0}
                className="sticky z-20"
                style={{ top: `${tabHeaderTop}px` }}
              />

              {/* ScrollableTab for visibility tracking */}
              <ScrollableTab
                id={tab.fragment}
                onVisibilityChange={handleVisibilityChange}
              >
                <Component recordsCount={tab.recordsCount} />
              </ScrollableTab>
            </section>
          );
        })}
      </div>
    );
  }

  // TABS MODE: Show only active tab
  const activeTabData = tabs.find((tab) => tab.fragment === activeTab);
  if (!activeTabData) return null;

  const Component = activeTabData.component;
  // New format: /{entitySlug}/{tabSlug} (nested route)
  const fullscreenUrl = activeTabData.fullscreenButton
    ? entitySlug
      ? `/${entitySlug}/${activeTabData.fragment}`
      : `#${activeTabData.fragment}/fullscreen`
    : undefined;

  return (
    <div className={cn("w-full", className)}>
      <TabHeader
        label={activeTabData.label}
        icon={activeTabData.icon}
        mode="compact"
        badge={activeTabData.badge}
        fullscreenUrl={fullscreenUrl}
        isFirst={false}
      />

      {/* Active Tab Content */}
      <Component recordsCount={activeTabData.recordsCount} />
    </div>
  );
}
