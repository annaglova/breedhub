import { cn } from "@ui/lib/utils";

type SexCode = "male" | "female" | string | null | undefined;
type StyleType = "horizontal" | "vertical" | "round";

interface PetSexMarkProps {
  sex?: SexCode;
  style?: StyleType;
  className?: string;
}

/**
 * PetSexMark - Visual indicator for pet sex
 *
 * Colors:
 * - male: blue-300 (dark: blue-400)
 * - female: pink-300 (dark: pink-400)
 * - unknown: slate-300 (dark: slate-400)
 *
 * Styles:
 * - horizontal: h-1 w-full (line)
 * - vertical: h-4 w-1 (vertical line)
 * - round: h-4 w-4 (circle)
 */
export function PetSexMark({
  sex,
  style = "horizontal",
  className,
}: PetSexMarkProps) {
  const colorClass =
    sex === "male"
      ? "bg-blue-300 dark:bg-blue-400"
      : sex === "female"
        ? "bg-pink-300 dark:bg-pink-400"
        : "bg-slate-300 dark:bg-slate-400";

  const sizeClass =
    style === "horizontal"
      ? "h-1 w-full"
      : style === "vertical"
        ? "h-4 w-1"
        : "size-4"; // round

  return (
    <div className={cn("rounded-full", colorClass, sizeClass, className)} />
  );
}
