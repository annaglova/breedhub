import { Bookmark } from "lucide-react";
import * as React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "./tooltip";
import { cn } from "@ui/lib/utils";

interface NoteFlagButtonProps {
  /**
   * Whether the entity has notes
   * @default true
   */
  hasNotes?: boolean;
  /**
   * Click handler for the notes button
   */
  onClick?: () => void;
  /**
   * Display mode - affects icon size
   * @default "page"
   */
  mode?: "page" | "drawer";
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * NoteFlagButton - Shows a bookmark icon that indicates whether an entity has notes
 *
 * EXACT COPY from Angular: libs/schema/ui/note/note-flag-button.component.ts
 * - Filled bookmark icon when hasNotes=true
 * - Outlined bookmark icon when hasNotes=false
 * - Tooltip showing "Notes"
 */
export function NoteFlagButton({
  hasNotes = true,
  onClick,
  mode = "page",
  className,
}: NoteFlagButtonProps) {
  const iconSize = mode === "page" ? 18 : 16;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className={cn("outline-none", className)}
          type="button"
        >
          <Bookmark
            size={iconSize}
            className={cn(
              "text-primary transition-colors",
              hasNotes && "fill-current"
            )}
          />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top">Notes</TooltipContent>
    </Tooltip>
  );
}
