import { useKeyboardNavigation } from "@shared/hooks/useKeyboardNavigation";
import { cn } from "@ui/lib/utils";
import { useEffect, useRef } from "react";

export interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface TabNavigationProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
  variant?: "default" | "pills" | "underline";
}

export function TabNavigation({
  tabs,
  activeTab,
  onTabChange,
  className,
  variant = "default",
}: TabNavigationProps) {
  const tabRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});
  const currentIndex = tabs.findIndex((tab) => tab.id === activeTab);

  // Handle keyboard navigation
  useKeyboardNavigation({
    onArrowLeft: () => {
      const newIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
      const newTab = tabs[newIndex];
      onTabChange(newTab.id);
      // Focus the new tab button
      setTimeout(() => {
        tabRefs.current[newTab.id]?.focus();
      }, 0);
    },
    onArrowRight: () => {
      const newIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
      const newTab = tabs[newIndex];
      onTabChange(newTab.id);
      // Focus the new tab button
      setTimeout(() => {
        tabRefs.current[newTab.id]?.focus();
      }, 0);
    },
  });

  // Set initial focus on active tab
  useEffect(() => {
    const activeTabElement = tabRefs.current[activeTab];
    if (activeTabElement && document.activeElement !== activeTabElement) {
      // Only focus if no other element is focused
      const hasActiveFocus =
        document.activeElement && document.activeElement !== document.body;
      if (!hasActiveFocus) {
        activeTabElement.focus();
      }
    }
  }, [activeTab]);

  const getTabStyles = () => {
    switch (variant) {
      case "pills":
        return {
          container: "flex space-x-2 p-1 bg-slate-100 rounded-lg",
          tab: "flex-1 py-2 px-4 text-sm  rounded-md transition-all focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:ring-offset-2",
          activeTab: "bg-white text-slate-900 shadow-sm",
          inactiveTab: "text-slate-500 hover:text-slate-700",
        };
      case "underline":
        return {
          container: "flex border-b border-slate-200",
          tab: "py-2 px-4 text-sm  border-b-2 transition-all focus:outline-none focus:ring-2 focus:ring-primary-500/20 rounded-t",
          activeTab: "border-primary-600 text-primary-600",
          inactiveTab:
            "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300",
        };
      default:
        return {
          container: "flex rounded-lg bg-slate-100 p-[2px]",
          tab: "flex-1 py-2.5 px-4 text-base  rounded-md transition-all focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:ring-offset-2",
          activeTab: "bg-white text-slate-900 shadow-sm",
          inactiveTab: "text-slate-400 hover:text-slate-700",
        };
    }
  };

  const styles = getTabStyles();

  return (
    <div
      className={cn(styles.container, className)}
      role="tablist"
      aria-label="Tab navigation"
    >
      {tabs.map((tab, index) => (
        <button
          key={tab.id}
          ref={(el) => {
            tabRefs.current[tab.id] = el;
          }}
          role="tab"
          aria-selected={activeTab === tab.id}
          aria-controls={`tabpanel-${tab.id}`}
          tabIndex={activeTab === tab.id ? 0 : -1}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            styles.tab,
            activeTab === tab.id ? styles.activeTab : styles.inactiveTab
          )}
        >
          {tab.icon && (
            <span className="mr-2" aria-hidden="true">
              {tab.icon}
            </span>
          )}
          {tab.label}
        </button>
      ))}
    </div>
  );
}
