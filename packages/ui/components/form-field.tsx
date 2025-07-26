import React, { forwardRef } from "react";
import { Label } from "./label";
import { cn } from "@ui/lib/utils";
import { AlertCircle } from "lucide-react";

interface FormFieldProps {
  label?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: React.ReactElement;
}

export const FormField = forwardRef<HTMLDivElement, FormFieldProps>(
  ({ label, error, required, className, children }, ref) => {
    return (
      <div ref={ref} className={cn("w-full", className)}>
        {label && (
          <Label className="block text-base font-medium text-gray-700 mb-1">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </Label>
        )}
        {React.cloneElement(children, {
          className: cn(
            children.props.className,
            error && "border-red-500 focus:border-red-500 focus:ring-red-500"
          ),
          "aria-invalid": error ? "true" : undefined,
          "aria-describedby": error ? `${children.props.id}-error` : undefined,
        })}
        <div className="h-5 mt-1">
          {error && (
            <p 
              id={`${children.props.id}-error`} 
              className="text-red-500 text-sm text-left flex items-center"
            >
              <AlertCircle className="h-3 w-3 mr-1 flex-shrink-0" />
              <span>{error}</span>
            </p>
          )}
        </div>
      </div>
    );
  }
);

FormField.displayName = "FormField";