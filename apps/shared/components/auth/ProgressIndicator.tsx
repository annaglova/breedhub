import { Check } from "lucide-react";
import { cn } from "@ui/lib/utils";

export interface ProgressStep {
  id: string;
  label: string;
  description?: string;
  status: "completed" | "current" | "upcoming";
}

interface ProgressIndicatorProps {
  steps: ProgressStep[];
  className?: string;
  variant?: "dots" | "bar" | "steps";
}

export function ProgressIndicator({ 
  steps, 
  className,
  variant = "steps" 
}: ProgressIndicatorProps) {
  const currentIndex = steps.findIndex(step => step.status === "current");
  const progress = ((currentIndex + 1) / steps.length) * 100;

  if (variant === "bar") {
    return (
      <div className={cn("w-full", className)}>
        <div className="flex justify-between mb-2">
          <span className="text-sm font-medium text-slate-700">
            Step {currentIndex + 1} of {steps.length}
          </span>
          <span className="text-sm text-slate-500">
            {Math.round(progress)}% complete
          </span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-2">
          <div
            className="bg-primary-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    );
  }

  if (variant === "dots") {
    return (
      <div className={cn("flex items-center justify-center space-x-2", className)}>
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={cn(
              "h-2 w-2 rounded-full transition-all duration-300",
              step.status === "completed" ? "bg-primary-600 w-8" :
              step.status === "current" ? "bg-primary-600 w-8 animate-pulse" :
              "bg-slate-300"
            )}
            aria-label={`Step ${index + 1}: ${step.label} - ${step.status}`}
          />
        ))}
      </div>
    );
  }

  // Default "steps" variant
  return (
    <nav aria-label="Progress" className={cn("w-full", className)}>
      <ol className="flex items-center w-full">
        {steps.map((step, index) => (
          <li
            key={step.id}
            className={cn(
              "flex items-center",
              index !== steps.length - 1 ? "flex-1" : ""
            )}
          >
            <div className="flex items-center">
              <span
                className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-300",
                  step.status === "completed"
                    ? "bg-primary-600 border-primary-600 text-white"
                    : step.status === "current"
                    ? "border-primary-600 text-primary-600 bg-white"
                    : "border-slate-300 text-slate-400 bg-white"
                )}
              >
                {step.status === "completed" ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <span className="text-sm font-medium">{index + 1}</span>
                )}
              </span>
              <div className="ml-3">
                <p
                  className={cn(
                    "text-sm font-medium transition-colors duration-300",
                    step.status === "completed" || step.status === "current"
                      ? "text-slate-900"
                      : "text-slate-400"
                  )}
                >
                  {step.label}
                </p>
                {step.description && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    {step.description}
                  </p>
                )}
              </div>
            </div>
            {index !== steps.length - 1 && (
              <div
                className={cn(
                  "flex-1 h-0.5 mx-4 transition-all duration-300",
                  steps[index + 1].status !== "upcoming"
                    ? "bg-primary-600"
                    : "bg-slate-300"
                )}
              />
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}