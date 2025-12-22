import { CommonVerifiedIcon } from "@shared/icons";
import { cn } from "@ui/lib/utils";

interface VerificationBadgeProps {
  status?: string | { Id?: string; Name?: string };
  size?: number;
  className?: string;
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
}: VerificationBadgeProps) {
  // Extract status ID
  const statusId = typeof status === "object" ? status?.Id : status;

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

  return (
    <CommonVerifiedIcon
      className={cn(getColorClass(), className)}
      width={size}
      height={size}
    />
  );
}
