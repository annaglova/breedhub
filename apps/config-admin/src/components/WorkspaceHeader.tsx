import React from 'react';
import { Search, Plus, Maximize2, Minimize2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface WorkspaceHeaderProps {
  // Title section
  title?: string;
  titleIcon?: LucideIcon;
  itemCount?: number;
  
  // Search section
  showSearch?: boolean;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  
  // Tree controls
  showTreeControls?: boolean;
  onCollapseAll?: () => void;
  
  // Add button section
  showAddButton?: boolean;
  addButtonText?: string;
  onAddClick?: () => void;
  
  // Layout
  containerPadding?: 4 | 6; // parent container padding size
}

export default function WorkspaceHeader({
  title,
  titleIcon: TitleIcon,
  itemCount,
  showSearch = true,
  searchPlaceholder = "Search...",
  searchValue = "",
  onSearchChange,
  showTreeControls = false,
  onCollapseAll,
  showAddButton = false,
  addButtonText = "Add",
  onAddClick,
  containerPadding = 6
}: WorkspaceHeaderProps) {
  const marginClass = containerPadding === 6 ? '-mx-6 px-6' : '-mx-4 px-4';
  
  return (
    <div className={`border-b border-gray-200 ${marginClass} pb-4 mb-4`}>
      {/* Title row if provided */}
      {(title || typeof itemCount === 'number') && (
        <div className="flex items-center justify-between mb-3">
          {title && (
            <h2 className="text-lg font-semibold flex items-center gap-2">
              {TitleIcon && <TitleIcon className="w-5 h-5" />}
              {title}
            </h2>
          )}
          {typeof itemCount === 'number' && (
            <span className="text-xs text-gray-500">
              {itemCount} items
            </span>
          )}
        </div>
      )}
      
      {/* Search and controls row */}
      {(showSearch || showAddButton || showTreeControls) && (
        <div className="flex items-center gap-2">
          {showSearch && (
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchValue}
                onChange={(e) => onSearchChange?.(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
          
          {/* Tree control */}
          {showTreeControls && onCollapseAll && (
            <button
              onClick={onCollapseAll}
              className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              title="Collapse all"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
          )}
          
          {showAddButton && onAddClick && (
            <button
              onClick={onAddClick}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2 whitespace-nowrap text-sm"
            >
              <Plus className="w-4 h-4" />
              {addButtonText}
            </button>
          )}
        </div>
      )}
    </div>
  );
}