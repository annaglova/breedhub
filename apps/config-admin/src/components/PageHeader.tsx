import React from 'react';
import { Search, Plus } from 'lucide-react';

interface PageHeaderProps {
  searchPlaceholder?: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onAddClick?: () => void;
  addButtonText?: string;
  showAddButton?: boolean;
}

export default function PageHeader({
  searchPlaceholder = "Search...",
  searchValue,
  onSearchChange,
  onAddClick,
  addButtonText = "Add",
  showAddButton = true
}: PageHeaderProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-4 pb-3 border-b border-slate-200">
        <div className="relative flex-1">
          <Search className="absolute left-0 top-2.5 h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-lg border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-slate-400"
          />
        </div>
        
        {showAddButton && onAddClick && (
          <button
            onClick={onAddClick}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            {addButtonText}
          </button>
        )}
      </div>
    </div>
  );
}