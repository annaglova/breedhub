import { useState } from "react";
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
 * PedigreeGenerationSelector - Minimalist dropdown for selecting pedigree generations
 *
 * Simple text trigger with chevron, matching tab header style.
 */
export function PedigreeGenerationSelector({
  generations,
  onGenerationsChange,
}: PedigreeGenerationSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center text-base font-semibold text-sub-header-color hover:text-foreground transition-colors"
        >
          {generations} generations
          <ChevronDown className="ml-1 h-4 w-4" />
        </button>
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
