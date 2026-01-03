import React from 'react';
import { Search, Plus, Maximize2, Minimize2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface ExtraButton {
  text: string;
  icon?: LucideIcon;
  onClick: () => void;
  className?: string;
}

export interface WorkspaceHeaderProps {
  // Title section
  title?: string;
  titleIcon?: LucideIcon;
  itemCount?: number;
  note?: string; // Additional note text (e.g., "Press ESC to deselect")
  
  // Search section
  showSearch?: boolean;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  
  // Filter section
  showFilter?: boolean;
  filterLabel?: string;
  filterValue?: string;
  onFilterChange?: (value: string) => void;
  filterOptions?: Array<{ value: string; label: string }>;
  filterFullWidth?: boolean; // Control filter width
  
  // Tree controls
  showTreeControls?: boolean;
  onCollapseAll?: () => void;
  onExpandAll?: () => void;
  
  // Add button section
  showAddButton?: boolean;
  addButtonText?: string;
  onAddClick?: () => void;
  
  // Extra buttons
  extraButtons?: ExtraButton[];
  
  // Custom checkbox (for special filters)
  showCheckbox?: boolean;
  checkboxIcon?: LucideIcon;
  checkboxChecked?: boolean;
  onCheckboxChange?: (checked: boolean) => void;
  checkboxTooltip?: string;
  
  // Layout
  containerPadding?: 4 | 6; // parent container padding size
}

export default function WorkspaceHeader({
  title,
  titleIcon: TitleIcon,
  itemCount,
  note,
  showSearch = true,
  searchPlaceholder = "Search...",
  searchValue = "",
  onSearchChange,
  showFilter = false,
  filterLabel = "Filter:",
  filterValue = "",
  onFilterChange,
  filterOptions = [],
  filterFullWidth = false,
  showTreeControls = false,
  onCollapseAll,
  onExpandAll,
  showAddButton = false,
  addButtonText = "Add",
  onAddClick,
  extraButtons = [],
  showCheckbox = false,
  checkboxIcon: CheckboxIcon,
  checkboxChecked = false,
  onCheckboxChange,
  checkboxTooltip,
  containerPadding = 6
}: WorkspaceHeaderProps) {
  const marginClass = containerPadding === 6 ? '-mx-6 px-6' : '-mx-4 px-4';
  
  return (
    <div className={`border-b border-slate-200 ${marginClass} pb-4 mb-4`}>
      {/* Title row if provided */}
      {(title || typeof itemCount === 'number') && (
        <div className="flex items-center justify-between mb-3">
          {title && (
            <h2 className="text-lg font-semibold flex items-center gap-2">
              {TitleIcon && <TitleIcon className="w-5 h-5" />}
              {title}
              {note && (
                <span className="text-xs font-normal text-slate-500 ml-2">
                  {note}
                </span>
              )}
            </h2>
          )}
          {typeof itemCount === 'number' && (
            <span className="text-xs text-slate-500">
              {itemCount} items
            </span>
          )}
        </div>
      )}
      
      {/* Search and controls row */}
      {(showSearch || showFilter || showAddButton || showTreeControls) && (
        <div className="flex items-center gap-2">
          {showSearch && (
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchValue}
                onChange={(e) => onSearchChange?.(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
          
          {/* Filter dropdown */}
          {showFilter && (
            <div className={`flex items-center gap-2 ${filterFullWidth ? 'flex-1' : ''}`}>
              {filterLabel && (
                <label className="text-sm font-medium text-slate-700 whitespace-nowrap">
                  {filterLabel}
                </label>
              )}
              <select
                value={filterValue}
                onChange={(e) => onFilterChange?.(e.target.value)}
                className={`${filterFullWidth ? 'w-full' : 'min-w-[200px]'} px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
              >
                {filterOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          {/* Custom checkbox for special filters */}
          {showCheckbox && CheckboxIcon && (
            <label 
              className="flex items-center gap-2 cursor-pointer" 
              title={checkboxTooltip}
            >
              <CheckboxIcon className="w-4 h-4 text-blue-600" />
              <input
                type="checkbox"
                checked={checkboxChecked}
                onChange={(e) => onCheckboxChange?.(e.target.checked)}
                className="rounded border-slate-300"
              />
            </label>
          )}
          
          {/* Tree controls */}
          {showTreeControls && (
            <>
              {onExpandAll && (
                <button
                  onClick={onExpandAll}
                  className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  title="Expand all"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              )}
              {onCollapseAll && (
                <button
                  onClick={onCollapseAll}
                  className="px-3 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-700 transition-colors"
                  title="Collapse all"
                >
                  <Minimize2 className="w-4 h-4" />
                </button>
              )}
            </>
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
          
          {/* Extra buttons */}
          {extraButtons.map((button, index) => {
            const ButtonIcon = button.icon;
            return (
              <button
                key={index}
                onClick={button.onClick}
                className={`px-4 py-2 text-white rounded-md transition-colors flex items-center gap-2 whitespace-nowrap text-sm ${
                  button.className || 'bg-slate-600 hover:bg-slate-700'
                }`}
              >
                {ButtonIcon && <ButtonIcon className="w-4 h-4" />}
                {button.text}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}