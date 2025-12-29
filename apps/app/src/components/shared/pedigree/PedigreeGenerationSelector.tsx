import { useState } from "react";
import { Button } from "@ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@ui/components/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { GENERATION_OPTIONS, type GenerationCount } from "./types";

interface PedigreeGenerationSelectorProps {
  generations: GenerationCount;
  onGenerationsChange: (count: GenerationCount) => void;
}

/**
 * PedigreeGenerationSelector - Dropdown for selecting pedigree generations
 *
 * Uses our DropdownMenu component for consistent design.
 * Shows current selection with chevron indicator.
 */
export function PedigreeGenerationSelector({
  generations,
  onGenerationsChange,
}: PedigreeGenerationSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="text-sm font-medium text-sub-header-color hover:bg-hover-surface-header px-3 py-1.5 h-auto"
        >
          {generations} generations
          <ChevronDown className="ml-1.5 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {GENERATION_OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option}
            onClick={() => {
              onGenerationsChange(option);
              setIsOpen(false);
            }}
            className={generations === option ? "selected-menu-item" : ""}
          >
            {option} generations
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
