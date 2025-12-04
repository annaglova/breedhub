import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@ui/components/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@ui/components/dropdown-menu";
import { ArrowLeft, ChevronDown, Clock } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { navigationHistoryStore } from "@breedhub/rxdb-store";
import { useSignals } from "@preact/signals-react/runtime";

interface NavigationButtonsProps {
  mode?: "default" | "white";
  className?: string;
  entityType?: string; // Required for per-space history
}

/**
 * NavigationButtons - Back/Forward navigation buttons
 *
 * EXACT COPY from Angular: libs/schema/ui/button-ui/nav-button.component.ts
 *
 * Two buttons in a group:
 * - Left: Back button (arrow-left) - returns to previous page
 * - Right: Navigate button (angle-down) - opens history menu with last 5 pages for current space
 */
export function NavigationButtons({
  mode = "white",
  className = "",
  entityType,
}: NavigationButtonsProps) {
  useSignals();
  const navigate = useNavigate();
  const location = useLocation();

  // Get history for current entity type (excluding current page)
  const historyEntries = entityType
    ? navigationHistoryStore.getHistoryForType(entityType, location.pathname)
    : [];
  const hasHistory = historyEntries.length > 0;

  const handleBack = () => {
    navigate(-1);
  };

  const handleNavigateTo = (path: string) => {
    navigate(path);
  };

  const isWhiteMode = mode === "white";

  const buttonBaseClass = `
    flex items-center justify-center px-2.5 text-xl border
    ${
      isWhiteMode
        ? "border-white bg-white/30 text-white hover:bg-white/60"
        : "border-secondary dark:border-secondary-400 text-secondary dark:text-secondary-400 hover:bg-secondary/10 hover:dark:bg-secondary-700"
    }
  `;

  const disabledClass = "opacity-50 cursor-not-allowed hover:bg-transparent";

  return (
    <div className={`flex shrink-0 ${className}`}>
      {/* Back button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleBack}
            className={`${buttonBaseClass} border-r-[0.5px]`}
            style={{ borderRadius: "2rem 0 0 2rem" }}
          >
            <ArrowLeft size={20} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Back</TooltipContent>
      </Tooltip>

      {/* Navigate button (history menu) */}
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild disabled={!hasHistory}>
              <button
                className={`
                  ${buttonBaseClass}
                  border-l-[0.5px]
                  ${!hasHistory ? disabledClass : ""}
                `}
                style={{ borderRadius: "0 2rem 2rem 0" }}
                disabled={!hasHistory}
              >
                <ChevronDown size={20} />
              </button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {hasHistory ? "Recent pages" : "No recent pages"}
          </TooltipContent>
        </Tooltip>

        {hasHistory && (
          <DropdownMenuContent align="end" className="w-56">
            {historyEntries.map((entry) => (
              <DropdownMenuItem
                key={entry.path}
                onClick={() => handleNavigateTo(entry.path)}
                className="flex items-center gap-2"
              >
                <Clock size={14} className="text-muted-foreground shrink-0" />
                <span className="truncate">{entry.title}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        )}
      </DropdownMenu>
    </div>
  );
}
