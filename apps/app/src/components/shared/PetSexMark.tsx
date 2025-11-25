import { cn } from "@ui/lib/utils";

/**
 * Sex code types
 */
export type Male = "male";
export type Female = "female";
export type DefinedSexCode = Female | Male;
export type SexCode = DefinedSexCode | null | undefined;

/**
 * Style variants for sex mark
 */
export type SexMarkStyle = "horizontal" | "vertical" | "round";

/**
 * Props for PetSexMark component
 */
interface PetSexMarkProps {
  sex?: SexCode;
  style?: SexMarkStyle;
  className?: string;
}

/**
 * PetSexMark component
 * Visual indicator for pet's sex (blue for male, pink for female, gray for unknown)
 *
 * Similar to Angular pet-sex-mark.component.ts
 */
export function PetSexMark({
  sex,
  style = "horizontal",
  className
}: PetSexMarkProps) {
  const sexClasses = cn(
    "rounded-full",
    {
      // Sex colors
      "bg-blue-300 dark:bg-blue-400": sex === "male",
      "bg-pink-300 dark:bg-pink-400": sex === "female",
      "bg-slate-300 dark:bg-slate-400": sex !== "male" && sex !== "female",
      // Style variants
      "h-1 w-full": style === "horizontal",
      "h-4 w-1": style === "vertical",
      "h-4 w-4": style === "round"
    },
    className
  );

  return <div className={sexClasses} />;
}
