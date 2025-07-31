import { Button } from "@ui/components/button";
import { Spinner } from "./Spinner";
import { cn } from "@ui/lib/utils";
import React from "react";

interface LoadingButtonProps extends React.ComponentProps<typeof Button> {
  isLoading?: boolean;
  loadingText?: string;
  children: React.ReactNode;
  spinnerClassName?: string;
}

export function LoadingButton({ 
  isLoading, 
  loadingText, 
  children, 
  disabled,
  className,
  spinnerClassName,
  ...props 
}: LoadingButtonProps) {
  return (
    <Button
      disabled={isLoading || disabled}
      className={cn(
        "transition-all",
        isLoading && "cursor-wait",
        className
      )}
      {...props}
    >
      {isLoading ? (
        <div className="flex items-center justify-center">
          <Spinner className={cn("mr-2 animate-spin", spinnerClassName)} />
          <span className="animate-pulse">{loadingText || children}</span>
        </div>
      ) : (
        children
      )}
    </Button>
  );
}