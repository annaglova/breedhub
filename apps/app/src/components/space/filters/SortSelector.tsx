import { Button } from "@ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@ui/components/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@ui/components/tooltip";
import { getIconComponent } from "@ui/lib/utils";
import { useState } from "react";

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

  const SelectedIcon = getIconComponent(selected?.icon);

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button className="small-button rounded-l-full bg-primary-50 hover:bg-primary-100/60 dark:bg-primary-300 dark:hover:bg-primary-200 text-primary dark:text-zinc-900 focus:ring-0 focus:ring-offset-0 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:ring-0 data-[state=open]:outline-none">
              {selected?.icon && <SelectedIcon className="mr-2 h-5 w-5" style={{ color: 'rgb(var(--primary))' }} />}
              {selected?.name || "Select a column"}
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>Change sort order</p>
        </TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="start">
        {options.map((option) => {
          const OptionIcon = getIconComponent(option.icon);
          const isSelected = selected?.id === option.id;
          return (
            <DropdownMenuItem
              key={option.id}
              onClick={() => {
                onSelect?.(option);
                setIsOpen(false);
              }}
              className={isSelected ? "selected-menu-item" : ""}
            >
              {option.icon && <OptionIcon />}
              {option.name}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
