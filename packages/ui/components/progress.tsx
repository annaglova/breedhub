"use client";

import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@ui/lib/utils";

const progressVariants = cva(
  "relative h-2 w-full overflow-hidden rounded-full bg-primary/20",
  {
    variants: {
      size: {
        sm: "h-1",
        default: "h-2",
        lg: "h-3",
        xl: "h-4",
      },
      variant: {
        default: "bg-primary/20",
        secondary: "bg-secondary/20",
        success: "bg-green-200 dark:bg-green-900",
        warning: "bg-yellow-200 dark:bg-yellow-900",
        destructive: "bg-destructive/20",
      },
    },
    defaultVariants: {
      size: "default",
      variant: "default",
    },
  }
);

const progressIndicatorVariants = cva(
  "h-full w-full flex-1 bg-primary transition-all",
  {
    variants: {
      variant: {
        default: "bg-primary",
        secondary: "bg-secondary",
        success: "bg-green-600 dark:bg-green-400",
        warning: "bg-yellow-600 dark:bg-yellow-400",
        destructive: "bg-destructive",
      },
      animated: {
        true: "transition-transform duration-300 ease-in-out",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      animated: true,
    },
  }
);

interface ProgressProps
  extends React.ComponentProps<typeof ProgressPrimitive.Root>,
    VariantProps<typeof progressVariants>,
    VariantProps<typeof progressIndicatorVariants> {
  value?: number;
  max?: number;
  showValue?: boolean;
  formatValue?: (value: number, max: number) => string;
}

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(
  (
    {
      className,
      value = 0,
      max = 100,
      size,
      variant,
      animated,
      showValue = false,
      formatValue,
      ...props
    },
    ref
  ) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

    const formatValueDefault = React.useCallback(
      (val: number, maxVal: number) => {
        return `${Math.round((val / maxVal) * 100)}%`;
      },
      []
    );

    const displayValue = formatValue
      ? formatValue(value, max)
      : formatValueDefault(value, max);

    return (
      <div className="space-y-1">
        {showValue && (
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Progress</span>
            <span>{displayValue}</span>
          </div>
        )}
        <ProgressPrimitive.Root
          ref={ref}
          className={cn(progressVariants({ size, variant }), className)}
          value={value}
          max={max}
          {...props}
        >
          <ProgressPrimitive.Indicator
            className={cn(progressIndicatorVariants({ variant, animated }))}
            style={{ transform: `translateX(-${100 - percentage}%)` }}
          />
        </ProgressPrimitive.Root>
      </div>
    );
  }
);
Progress.displayName = ProgressPrimitive.Root.displayName;

// Circular Progress Component
interface CircularProgressProps
  extends VariantProps<typeof progressIndicatorVariants> {
  value?: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  showValue?: boolean;
  formatValue?: (value: number, max: number) => string;
  className?: string;
}

const CircularProgress = React.forwardRef<
  HTMLDivElement,
  CircularProgressProps
>(
  (
    {
      value = 0,
      max = 100,
      size = 48,
      strokeWidth = 4,
      variant = "default",
      showValue = false,
      formatValue,
      className,
    },
    ref
  ) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    const formatValueDefault = React.useCallback(
      (val: number, maxVal: number) => {
        return `${Math.round((val / maxVal) * 100)}%`;
      },
      []
    );

    const displayValue = formatValue
      ? formatValue(value, max)
      : formatValueDefault(value, max);

    const colorMap = {
      default: "stroke-primary",
      secondary: "stroke-secondary",
      success: "stroke-green-600",
      warning: "stroke-yellow-600",
      destructive: "stroke-destructive",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "relative inline-flex items-center justify-center",
          className
        )}
      >
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="none"
            className="text-muted stroke-current opacity-20"
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            fill="none"
            className={cn(
              colorMap[variant as keyof typeof colorMap],
              "transition-all duration-300"
            )}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </svg>
        {showValue && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs  text-foreground">{displayValue}</span>
          </div>
        )}
      </div>
    );
  }
);
CircularProgress.displayName = "CircularProgress";

// Multi-step Progress Component
interface MultiStepProgressProps {
  currentStep: number;
  totalSteps: number;
  steps?: string[];
  variant?: VariantProps<typeof progressIndicatorVariants>["variant"];
  className?: string;
}

const MultiStepProgress = React.forwardRef<
  HTMLDivElement,
  MultiStepProgressProps
>(({ currentStep, totalSteps, steps, variant = "default", className }, ref) => {
  const percentage = (currentStep / totalSteps) * 100;

  return (
    <div ref={ref} className={cn("space-y-2", className)}>
      {steps && (
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>
            Step {currentStep} of {totalSteps}
          </span>
          <span>{steps[currentStep - 1]}</span>
        </div>
      )}
      <div className="flex space-x-1">
        {Array.from({ length: totalSteps }).map((_, index) => (
          <div
            key={index}
            className={cn(
              "h-2 flex-1 rounded-full transition-colors",
              index < currentStep
                ? variant === "success"
                  ? "bg-green-600"
                  : variant === "warning"
                  ? "bg-yellow-600"
                  : variant === "destructive"
                  ? "bg-destructive"
                  : "bg-primary"
                : "bg-muted"
            )}
          />
        ))}
      </div>
      <Progress value={percentage} variant={variant} />
    </div>
  );
});
MultiStepProgress.displayName = "MultiStepProgress";

export {
  CircularProgress,
  MultiStepProgress,
  Progress,
  progressIndicatorVariants,
  progressVariants,
};
