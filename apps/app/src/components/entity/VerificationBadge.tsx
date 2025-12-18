import { BadgeCheck } from "lucide-react";
import { cn } from "@ui/lib/utils";

interface VerificationBadgeProps {
  status?: string | { Id?: string; Name?: string };
  size?: number;
  className?: string;
}

const VERIFIED_STATUS_ID = "13c697a5-4895-4ec8-856c-536b925fd54f";

/**
 * VerificationBadge - displays verification status badge
 *
 * Used in: Pet, Kennel, Contact list cards
 *
 * Status can be:
 * - string (status ID)
 * - object with Id and Name
 * - undefined (hidden)
 */
export function VerificationBadge({
  status,
  size = 12,
  className,
}: VerificationBadgeProps) {
  // Extract status ID
  const statusId = typeof status === "object" ? status?.Id : status;

  // Don't render if no status
  if (!statusId) return null;

  const isVerified = statusId === VERIFIED_STATUS_ID;

  return (
    <BadgeCheck
      className={cn(
        "bg-white dark:bg-gray-900 rounded-full",
        isVerified
          ? "text-primary-500"
          : "text-gray-400",
        className
      )}
      style={{ width: size, height: size }}
    />
  );
}
