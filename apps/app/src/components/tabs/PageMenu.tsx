import { Icon } from "@/components/shared/Icon";
import { cn } from "@ui/lib/utils";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Tab } from "./TabsContainer";

interface PageMenuProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (fragment: string) => void;
  mode?: "scroll" | "tabs";
  className?: string;
}

/**
 * PageMenu - Horizontal Tab Navigation Bar
 *
 * REFERENCE: /Users/annaglova/projects/org/libs/schema/ui/page-menu/page-menu.component.ts
 *
 * Features:
 * - Horizontal scrollable tab bar
 * - Left/Right navigation buttons when tabs overflow
 * - Active tab indicator (bottom border)
 * - Auto-scroll active tab into viewport
 * - Works in both modes: scroll (scroll to section) | tabs (switch content)
 */
export function PageMenu({
  tabs,
  activeTab,
  onTabChange,
  mode = "scroll",
  className,
}: PageMenuProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [startX, setStartX] = useState(0);
  const [tabWidths, setTabWidths] = useState<number[]>([]);
  const [showLeftButton, setShowLeftButton] = useState(false);
  const [showRightButton, setShowRightButton] = useState(false);
  const previousActiveTabRef = useRef<string>(activeTab);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();
  const BUTTON_OFFSET = 27;

  // Memoize calculated values to prevent unnecessary re-renders
  const fullTabsWidth = useMemo(
    () => tabWidths.reduce((sum, width) => sum + width, 0),
    [tabWidths]
  );
  const firstTabWidth = useMemo(() => tabWidths[0] || 0, [tabWidths]);

  // Track container width and position
  useEffect(() => {
    if (!scrollContainerRef.current) return;

    const updateDimensions = () => {
      if (!scrollContainerRef.current) return;
      const rect = scrollContainerRef.current.getBoundingClientRect();
      setContainerWidth(rect.width);
      setStartX(rect.x);
    };

    const observer = new ResizeObserver(() => {
      updateDimensions();
    });

    observer.observe(scrollContainerRef.current);
    updateDimensions(); // Initial update

    return () => observer.disconnect();
  }, []);

  // Track scroll position with throttle to prevent excessive updates
  const handleScroll = () => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      if (scrollContainerRef.current) {
        setScrollLeft(scrollContainerRef.current.scrollLeft);
      }
    }, 50); // Throttle to 50ms
  };

  // Update button visibility based on scroll position (viewport-based, pure manual scroll logic)
  useEffect(() => {
    if (tabWidths.length === 0) return;

    // Left button - показуємо коли перший таб вже не повністю видимий
    let showLeft = false;
    if (fullTabsWidth > containerWidth) {
      showLeft = scrollLeft > BUTTON_OFFSET;
    }

    // Right button - ховаємо коли кінець останнього табу видимий
    let showRight = false;
    if (fullTabsWidth > containerWidth) {
      const lastTabEndVisible =
        scrollLeft + containerWidth >= fullTabsWidth - BUTTON_OFFSET;
      showRight = !lastTabEndVisible;
    }

    // Update state only if changed (prevent loops)
    setShowLeftButton((prev) => (prev !== showLeft ? showLeft : prev));
    setShowRightButton((prev) => (prev !== showRight ? showRight : prev));
  }, [scrollLeft, containerWidth, fullTabsWidth, BUTTON_OFFSET]);

  // Auto-scroll active tab into view (ТІЛЬКИ при зміні activeTab)
  useEffect(() => {
    // Перевіряємо чи справді змінився activeTab
    if (previousActiveTabRef.current === activeTab) {
      return; // activeTab не змінився, виходимо
    }
    previousActiveTabRef.current = activeTab;

    if (!scrollContainerRef.current) return;

    const activeIndex = tabs.findIndex((t) => t.fragment === activeTab);
    if (activeIndex === -1) return;

    // Перевіряємо чи є дані про ширину табів
    if (tabWidths.length === 0) return;

    // Calculate active tab position
    const activeTabStart = tabWidths
      .slice(0, activeIndex)
      .reduce((sum, width) => sum + width, 0);
    const activeTabWidth = tabWidths[activeIndex] || 0;
    const activeTabEnd = activeTabStart + activeTabWidth;

    // Get current scroll position directly from ref
    const currentScrollLeft = scrollContainerRef.current.scrollLeft;
    const visibleStart = currentScrollLeft;
    const visibleEnd = currentScrollLeft + containerWidth;

    // Scroll if needed
    if (activeTabEnd > visibleEnd - BUTTON_OFFSET) {
      // Tab is cut off on right
      scrollContainerRef.current.scrollTo({
        left: activeTabEnd - containerWidth + BUTTON_OFFSET,
        behavior: "smooth",
      });
    } else if (activeTabStart < visibleStart + BUTTON_OFFSET) {
      // Tab is cut off on left
      scrollContainerRef.current.scrollTo({
        left: activeTabStart - BUTTON_OFFSET,
        behavior: "smooth",
      });
    }
  }, [activeTab, tabs, tabWidths, containerWidth]); // НЕ включаємо scrollLeft!

  // Navigate to prev/next tab
  const navigate = (direction: -1 | 1) => {
    const currentIndex = tabs.findIndex((t) => t.fragment === activeTab);
    const nextIndex = currentIndex + direction;

    if (nextIndex >= 0 && nextIndex < tabs.length) {
      onTabChange(tabs[nextIndex].fragment);
    }
  };

  // Handle tab click
  const handleTabClick = (fragment: string) => {
    onTabChange(fragment);
  };

  // Track individual tab widths
  const handleTabResize = (index: number, width: number) => {
    setTabWidths((prev) => {
      const newWidths = [...prev];
      newWidths[index] = width;
      return newWidths;
    });
  };

  return (
    <div className={cn("relative w-full", className)}>
      {/* Scrollable Tabs Container */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex w-full overflow-x-auto bg-card-ground no-scrollbar"
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {/* Left Navigation Button */}
        {showLeftButton && (
          <button
            onClick={() => navigate(-1)}
            className="absolute left-0 top-0 z-20 h-full bg-card-ground border-r border-surface-border group transition-colors px-1"
            aria-label="Previous tab"
          >
            <Icon
              icon={{ name: "ChevronLeft", source: "lucide" }}
              size={20}
              className="text-surface-400 group-hover:text-primary transition-colors"
            />
          </button>
        )}

        {/* Right Navigation Button */}
        {showRightButton && (
          <button
            onClick={() => navigate(1)}
            className="absolute right-0 top-0 z-20 h-full bg-card-ground border-l border-surface-border group transition-colors px-1"
            aria-label="Next tab"
          >
            <Icon
              icon={{ name: "ChevronRight", source: "lucide" }}
              size={20}
              className="text-surface-400 group-hover:text-primary transition-colors"
            />
          </button>
        )}

        {/* Tabs */}
        <div className="flex">
          {tabs.map((tab, index) => (
            <TabButton
              key={tab.id}
              tab={tab}
              isActive={tab.fragment === activeTab}
              onClick={() => handleTabClick(tab.fragment)}
              onResize={(width) => handleTabResize(index, width)}
            />
          ))}
        </div>

        {/* Bottom Border Line */}
        <div className="absolute bottom-0 w-full border-b border-surface-border" />
      </div>
    </div>
  );
}

// TabButton Component
interface TabButtonProps {
  tab: Tab;
  isActive: boolean;
  onClick: () => void;
  onResize: (width: number) => void;
}

function TabButton({ tab, isActive, onClick, onResize }: TabButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);

  // Track tab width
  useEffect(() => {
    if (!ref.current) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        onResize(entry.contentRect.width);
      }
    });

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [onResize]);

  return (
    <button
      ref={ref}
      onClick={onClick}
      className="group z-10 flex shrink-0 flex-col"
    >
      <div
        className={cn(
          "flex shrink-0 items-center justify-center px-5 py-3.5 transition-colors",
          isActive ? "text-primary" : "text-secondary"
        )}
      >
        {/* Icon */}
        <div className="mr-2 flex-shrink-0">
          <Icon icon={tab.icon} size={18} />
        </div>

        {/* Label */}
        <span className="shrink-0 font-bold">{tab.label}</span>
      </div>

      {/* Active Indicator (bottom border) */}
      <div
        className={cn(
          "border-b-2 transition-colors",
          isActive
            ? "border-primary"
            : "border-transparent group-hover:border-surface-400"
        )}
      />
    </button>
  );
}

// Hide scrollbar CSS
const styles = `
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
`;

if (typeof document !== "undefined") {
  const styleTag = document.createElement("style");
  styleTag.textContent = styles;
  document.head.appendChild(styleTag);
}

/**
 * PageMenuSkeleton - Loading skeleton for PageMenu
 * Shows animated placeholder tabs while data is loading
 * Style matches the existing skeleton pattern used in TabOutlet
 */
interface PageMenuSkeletonProps {
  tabCount?: number;
  className?: string;
}

export function PageMenuSkeleton({
  tabCount = 3,
  className,
}: PageMenuSkeletonProps) {
  return (
    <div className={cn("relative w-full", className)}>
      <div className="flex w-full gap-4 px-5 py-[17px] border-b border-surface-border bg-card-ground">
        {Array.from({ length: tabCount }).map((_, index) => (
          <div
            key={index}
            className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"
            style={{ width: `${60 + (index % 3) * 20}px` }}
          />
        ))}
      </div>
    </div>
  );
}
