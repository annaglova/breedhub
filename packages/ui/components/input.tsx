import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@ui/lib/utils";

const inputVariants = cva(
  "flex w-full rounded-md border bg-white text-slate-900 transition-all file:border-0 file:bg-transparent file:text-sm file: file:text-slate-900 placeholder:text-slate-500 disabled:cursor-not-allowed disabled:opacity-50 outline-none focus:outline-none",
  {
    variants: {
      variant: {
        default: "border-slate-300 hover:border-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20",
        destructive: "border-warning-500 hover:border-warning-600 focus:border-warning-500 focus:ring-2 focus:ring-warning-500/20",
        ghost: "border-transparent bg-transparent",
      },
      size: {
        default: "h-10 px-3 py-2 text-base",
        sm: "h-8 px-2.5 py-1.5 text-sm",
        lg: "h-11 px-4 py-3 text-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

// Non-DOM props that pass through from config-driven forms — strip before <input>
const NON_DOM_PROPS = new Set([
  'referencedTable', 'referencedFieldID', 'referencedFieldName',
  'disabledOnGray', 'onValueChange', 'onCheckedChange',
  'junctionFilter', 'filterBy', 'filterByValue', 'filterByIds',
  'dataSource', 'error', 'touched',
]);

interface InputProps
  extends Omit<React.ComponentProps<"input">, "size">,
    VariantProps<typeof inputVariants> {
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, variant, size, type, startIcon, endIcon, ...rest }, ref) => {
    // Strip non-DOM props to avoid React warnings
    const props: Record<string, any> = {};
    for (const key in rest) {
      if (!NON_DOM_PROPS.has(key)) {
        props[key] = (rest as any)[key];
      }
    }

    const hasIcons = startIcon || endIcon;

    if (hasIcons) {
      return (
        <div className="relative">
          {startIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
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
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
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
