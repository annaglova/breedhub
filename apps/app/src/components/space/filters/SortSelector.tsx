import React, { useState } from 'react';
import { Button } from '@ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@ui/components/dropdown-menu';
import { ChevronDown } from 'lucide-react';

export interface SortOption {
  id: string;
  name: string;
  icon?: string;
}

interface SortSelectorProps {
  options?: SortOption[];
  selected?: SortOption;
  onSelect?: (option: SortOption) => void;
}

export function SortSelector({
  options = [],
  selected,
  onSelect,
}: SortSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="small-button rounded-l-full border-r-0 hover:bg-surface-100 dark:hover:bg-surface-800"
        >
          {selected?.icon && <span className={`mr-2 ${selected.icon}`} />}
          {selected?.name || 'Select a column'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {options.map((option) => (
          <DropdownMenuItem
            key={option.id}
            onClick={() => {
              onSelect?.(option);
              setIsOpen(false);
            }}
          >
            {option.icon && <span className={`mr-2 ${option.icon}`} />}
            {option.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
