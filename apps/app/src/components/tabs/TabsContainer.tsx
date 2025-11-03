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
  className?: string;
}

/**
 * TabsContainer - Container для всіх scroll-based tabs
 *
 * REFERENCE: /Users/annaglova/projects/org/libs/schema/domain/breed/pages/breed-page/breed.routing.ts
 *
 * Features:
 * - Рендерить всі таби як scroll sections
 * - TabHeader + ScrollableTab для кожного табу
 * - Visibility tracking для всіх табів
 * - Передає visibility data через callback
 */
export function TabsContainer({ tabs, className }: TabsContainerProps) {
  const [visibilityMap, setVisibilityMap] = useState<Record<string, number>>(
    {}
  );

  const handleVisibilityChange = (id: string, visibility: number) => {
    setVisibilityMap((prev) => ({ ...prev, [id]: visibility }));
  };

  // Debug: Log visibility changes
  // console.log('[TabsContainer] Visibility:', visibilityMap);

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
            <TabHeader
              label={tab.label}
              icon={tab.icon}
              mode="list"
              comingSoon={tab.comingSoon}
              fullscreenUrl={tab.fullscreenUrl}
              isFirst={index === 0}
            />

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
