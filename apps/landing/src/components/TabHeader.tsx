import React from "react";

interface TabHeaderProps {
  value: number;
  name: string;
  activeTab: number;
  onTabChange: (value: number) => void;
  variant?: "primary" | "pink";
}

export function TabHeader({
  value,
  name,
  activeTab,
  onTabChange,
  variant = "primary",
}: TabHeaderProps) {
  const isActive = activeTab === value;
  
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
  
  return (
    <div className="mr-2 flex shrink-0 text-center last:mr-0">
      <button
        className={`block px-5 py-3 font-bold uppercase leading-normal ${
          isActive
            ? `${activeText} border-b-2 ${activeBorder} active-tab-button`
            : "text-slate-400 hover:text-slate-600"
        }`}
        onClick={() => onTabChange(value)}
      >
        {name}
      </button>
    </div>
  );
}