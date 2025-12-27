import { useDictionaryValue } from "@/hooks/useDictionaryValue";
import { CommonVerifiedIcon } from "@shared/icons";
import { cn } from "@ui/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@ui/components/tooltip";

interface VerificationBadgeProps {
  status?: string | { Id?: string; Name?: string };
  size?: number;
  className?: string;
  /** Display mode - tooltip only shown in "page" mode */
  mode?: "page" | "list";
}

// Verification status IDs
const VERIFIED_STATUS_ID = "13c697a5-4895-4ec8-856c-536b925fd54f";
const ON_VERIFICATION_STATUS_ID = "8b8a9341-6ac2-4129-b7fb-8db4a6d1f334";
const VERIFICATION_NEEDED_STATUS_ID = "62ca5750-351c-49ed-81bd-1e8fd459d15f";

/**
 * VerificationBadge - displays verification status badge
 *
 * Used in: Pet, Kennel, Contact list cards
 *
 * Status can be:
 * - string (status ID)
 * - object with Id and Name
 * - undefined (hidden)
 *
 * Colors:
 * - Verified → primary (confirmed)
 * - On verification → gray (processing)
 * - Verification needed → destructive (action required)
 */
export function VerificationBadge({
  status,
  size = 16,
  className,
  mode = "list",
}: VerificationBadgeProps) {
  // Extract status ID
  const statusId = typeof status === "object" ? status?.Id : status;

  // Load status name from dictionary (only in page mode)
  const statusName = useDictionaryValue(
    mode === "page" ? "verification_status" : undefined,
    statusId
  );

  // Don't render if no status
  if (!statusId) return null;

  const getColorClass = () => {
    switch (statusId) {
      case VERIFIED_STATUS_ID:
        return "fill-primary";
      case VERIFICATION_NEEDED_STATUS_ID:
        return "fill-destructive";
      case ON_VERIFICATION_STATUS_ID:
      default:
        return "fill-gray-400";
    }
  };

  const icon = (
    <CommonVerifiedIcon
      className={cn(getColorClass(), className)}
      width={size}
      height={size}
    />
  );

  // List mode - no tooltip
  if (mode === "list") {
    return icon;
  }

  // Page mode - with tooltip
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">{icon}</span>
      </TooltipTrigger>
      <TooltipContent side="top">
        <p>{statusName || "Loading..."}</p>
      </TooltipContent>
    </Tooltip>
  );
}
