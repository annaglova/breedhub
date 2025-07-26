import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@ui/lib/utils";

const inputVariants = cva(
  "flex w-full rounded-md border bg-white text-gray-900 transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-gray-900 placeholder:text-gray-500 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "border-gray-300 focus-visible:border-primary-500 focus-visible:ring-primary-500/20 focus-visible:ring-4",
        destructive: "border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/20 focus-visible:ring-4",
        ghost: "border-transparent bg-transparent focus-visible:border-primary-500 focus-visible:ring-primary-500/20 focus-visible:ring-4",
      },
      size: {
        default: "h-9 px-3 py-2 text-sm",
        sm: "h-8 px-2.5 py-1.5 text-xs",
        lg: "h-10 px-4 py-3 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

interface InputProps
  extends Omit<React.ComponentProps<"input">, "size">,
    VariantProps<typeof inputVariants> {
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, variant, size, type, startIcon, endIcon, ...props }, ref) => {
    const hasIcons = startIcon || endIcon;

    if (hasIcons) {
      return (
        <div className="relative">
          {startIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              {startIcon}
            </div>
          )}
          <input
            type={type}
            className={cn(
              inputVariants({ variant, size, className }),
              startIcon && "pl-9",
              endIcon && "pr-9"
            )}
            ref={ref}
            {...props}
          />
          {endIcon && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
              {endIcon}
            </div>
          )}
        </div>
      );
    }

    return (
      <input
        type={type}
        className={cn(inputVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";

export { Input, inputVariants };