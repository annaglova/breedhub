import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@ui/components/tooltip";
import { ArrowLeft, ChevronDown } from "lucide-react";

interface NavigationButtonsProps {
  mode?: "default" | "white";
  className?: string;
}

/**
 * NavigationButtons - Back/Forward navigation buttons
 *
 * EXACT COPY from Angular: libs/schema/ui/button-ui/nav-button.component.ts
 *
 * Two buttons in a group:
 * - Left: Back button (arrow-left) - returns to previous page
 * - Right: Navigate button (angle-down) - opens history menu
 *
 * Note: Currently visual only, no navigation functionality
 */
export function NavigationButtons({
  mode = "white",
  className = "",
}: NavigationButtonsProps) {
  const handleBack = () => {
    console.log("[NavigationButtons] Back clicked");
    // TODO: Implement navigation back logic
  };

  const handleNavigate = () => {
    console.log("[NavigationButtons] Navigate menu clicked");
    // TODO: Implement navigation history menu
  };

  const isWhiteMode = mode === "white";

  return (
    <div className={`flex shrink-0 ${className}`}>
      {/* Back button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleBack}
            className={`
              left-button flex items-center justify-center px-2.5 text-xl
              border border-r-[0.5px]
              ${
                isWhiteMode
                  ? "border-white bg-white/30 text-white hover:bg-white/60"
                  : "border-secondary dark:border-secondary-400 text-secondary dark:text-secondary-400 hover:bg-secondary/10 hover:dark:bg-secondary-700"
              }
            `}
            style={{ borderRadius: "2rem 0 0 2rem" }}
          >
            <ArrowLeft size={20} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Back</TooltipContent>
      </Tooltip>

      {/* Navigate button (history menu) */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleNavigate}
            className={`
              right-button flex items-center justify-center px-2.5 text-xl
              border border-l-[0.5px]
              ${
                isWhiteMode
                  ? "border-white bg-white/30 text-white hover:bg-white/60"
                  : "border-secondary dark:border-secondary-400 text-secondary dark:text-secondary-400 hover:bg-secondary/10 hover:dark:bg-secondary-700"
              }
            `}
            style={{ borderRadius: "0 2rem 2rem 0" }}
          >
            <ChevronDown size={20} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Navigate</TooltipContent>
      </Tooltip>
    </div>
  );
}
