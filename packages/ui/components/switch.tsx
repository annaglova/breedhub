"use client";

import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@ui/lib/utils";

const switchVariants = cva(
  "peer inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "h-6 w-11 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input",
        "secondary-sm":
          "h-5 w-9 data-[state=checked]:bg-secondary data-[state=unchecked]:bg-secondary/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const thumbVariants = cva(
  "pointer-events-none block rounded-full shadow-lg ring-0 transition-transform data-[state=unchecked]:translate-x-0",
  {
    variants: {
      variant: {
        default:
          "h-5 w-5 bg-background data-[state=checked]:translate-x-5",
        "secondary-sm":
          "h-3.5 w-3.5 bg-background data-[state=unchecked]:translate-x-px data-[state=checked]:translate-x-[17px]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root> &
    VariantProps<typeof switchVariants>
>(({ className, variant, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(switchVariants({ variant, className }))}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(thumbVariants({ variant }))}
    />
  </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch, switchVariants };
