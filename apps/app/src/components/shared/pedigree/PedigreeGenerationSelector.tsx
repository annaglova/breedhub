import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@ui/components/dropdown-menu";
import { ChevronDown, TreeDeciduous } from "lucide-react";
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
          className="flex items-center text-lg font-semibold text-sub-header-color hover:text-foreground/70 transition-colors focus:outline-none focus-visible:outline-none"
        >
          <TreeDeciduous className="mr-2 h-6 w-6" />
          {generations} generations
          <ChevronDown className="ml-1.5 h-5 w-5" />
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
