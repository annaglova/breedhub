import { cn } from "./utils";

export type FieldState = "default" | "hover" | "focus" | "error" | "success" | "disabled";

export interface FieldStateClasses {
  container?: string;
  input?: string;
  icon?: string;
  label?: string;
}

export const getFieldStateClasses = (
  state: FieldState,
  hasIcon?: boolean
): FieldStateClasses => {
  const baseInputClasses = cn(
    "transition-all duration-200",
    hasIcon && "pl-10"
  );

  switch (state) {
    case "hover":
      return {
        input: cn(baseInputClasses, "border-gray-400 hover:border-gray-500"),
        icon: "text-gray-500",
        label: "text-gray-700",
      };

    case "focus":
      return {
        input: cn(
          baseInputClasses,
          "border-primary-500 ring-2 ring-primary-500/20"
        ),
        icon: "text-primary-600",
        label: "text-primary-600",
      };

    case "error":
      return {
        input: cn(
          baseInputClasses,
          "border-red-500 focus:border-red-500 focus:ring-red-500/20"
        ),
        icon: "text-red-400",
        label: "text-red-600",
      };

    case "success":
      return {
        input: cn(
          baseInputClasses,
          "border-green-500 focus:border-green-500 focus:ring-green-500/20"
        ),
        icon: "text-green-500",
        label: "text-green-600",
      };

    case "disabled":
      return {
        input: cn(
          baseInputClasses,
          "bg-gray-50 border-gray-200 text-gray-500 cursor-not-allowed"
        ),
        icon: "text-gray-300",
        label: "text-gray-400",
      };

    default:
      return {
        input: cn(baseInputClasses, "border-gray-300"),
        icon: "text-gray-400",
        label: "text-gray-700",
      };
  }
};

export const determineFieldState = ({
  isFocused,
  isHovered,
  hasError,
  isValid,
  isDisabled,
  touched,
}: {
  isFocused?: boolean;
  isHovered?: boolean;
  hasError?: boolean;
  isValid?: boolean;
  isDisabled?: boolean;
  touched?: boolean;
}): FieldState => {
  if (isDisabled) return "disabled";
  if (hasError && touched) return "error";
  if (isValid && touched && !isFocused) return "success";
  if (isFocused) return "focus";
  if (isHovered) return "hover";
  return "default";
};