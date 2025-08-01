import React, { useRef, useEffect } from "react";

interface TabHeaderProps {
  value: number;
  name: string;
  activeTab: number;
  onTabChange: (value: number) => void;
  variant?: "primary" | "pink";
  tabIndex?: number;
  isFirst?: boolean;
  isLast?: boolean;
  onKeyDown?: (e: React.KeyboardEvent<HTMLButtonElement>) => void;
  idPrefix?: string;
}

export function TabHeader({
  value,
  name,
  activeTab,
  onTabChange,
  variant = "primary",
  tabIndex,
  isFirst = false,
  isLast = false,
  onKeyDown,
  idPrefix = "",
}: TabHeaderProps) {
  const isActive = activeTab === value;
  const buttonRef = useRef<HTMLButtonElement>(null);
  
  // Визначаємо кольори залежно від варіанту
  const colors = {
    primary: {
      activeText: "text-primary",
      activeBorder: "border-primary",
    },
    pink: {
      activeText: "text-pink-600",
      activeBorder: "border-pink-600",
    },
  };
  
  const { activeText, activeBorder } = colors[variant];
  
  // Фокусуємо активний таб при зміні
  useEffect(() => {
    if (isActive && buttonRef.current) {
      buttonRef.current.focus();
    }
  }, [isActive]);
  
  // Обробник клавіатурної навігації
  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (onKeyDown) {
      onKeyDown(e);
      return;
    }
    
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault();
        if (!isLast) {
          // Фокус на наступний таб
          const nextButton = buttonRef.current?.parentElement?.nextElementSibling?.querySelector('button');
          if (nextButton instanceof HTMLElement) {
            nextButton.focus();
          }
        }
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault();
        if (!isFirst) {
          // Фокус на попередній таб
          const prevButton = buttonRef.current?.parentElement?.previousElementSibling?.querySelector('button');
          if (prevButton instanceof HTMLElement) {
            prevButton.focus();
          }
        }
        break;
      case 'Home':
        e.preventDefault();
        // Фокус на перший таб
        const firstButton = buttonRef.current?.closest('[role="tablist"]')?.querySelector('button[role="tab"]');
        if (firstButton instanceof HTMLElement) {
          firstButton.focus();
        }
        break;
      case 'End':
        e.preventDefault();
        // Фокус на останній таб
        const buttons = buttonRef.current?.closest('[role="tablist"]')?.querySelectorAll('button[role="tab"]');
        if (buttons && buttons.length > 0) {
          const lastButton = buttons[buttons.length - 1];
          if (lastButton instanceof HTMLElement) {
            lastButton.focus();
          }
        }
        break;
    }
  };
  
  return (
    <div className="mr-2 flex shrink-0 text-center last:mr-0">
      <button
        ref={buttonRef}
        role="tab"
        aria-selected={isActive}
        aria-controls={`tabpanel${idPrefix}-${value}`}
        id={`tab${idPrefix}-${value}`}
        tabIndex={tabIndex !== undefined ? tabIndex : (isActive ? 0 : -1)}
        className={`block px-3 sm:px-5 py-2 sm:py-3 text-sm sm:text-base font-bold uppercase leading-normal whitespace-nowrap ${
          isActive
            ? `${activeText} border-b-2 ${activeBorder} active-tab-button`
            : "text-slate-500 hover:text-slate-700"
        }`}
        onClick={() => onTabChange(value)}
        onKeyDown={handleKeyDown}
      >
        {name}
      </button>
    </div>
  );
}