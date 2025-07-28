import { cn } from "@ui/lib/utils";
import { AlertCircle } from "lucide-react";
import React, { forwardRef } from "react";
import { Label } from "./label";

interface FormFieldProps {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  className?: string;
  children: React.ReactElement;
}

export const FormField = forwardRef<HTMLDivElement, FormFieldProps>(
  ({ label, error, helperText, required, className, children }, ref) => {
    return (
      <div ref={ref} className={cn("", className)}>
        {label && (
          <Label className="block text-base font-medium text-gray-700 mb-1">
            {label}
            {required && <span className="text-warning-500 ml-1">*</span>}
          </Label>
        )}
        {React.cloneElement(children, {
          className: cn(
            children.props.className,
            error &&
              "border-warning-500 focus:border-warning-500 focus:ring-warning-500"
          ),
          "aria-invalid": error ? "true" : undefined,
          "aria-describedby": error
            ? `${children.props.id}-error`
            : helperText
            ? `${children.props.id}-helper`
            : undefined,
        })}
        <div className="h-5 mt-1">
          {error ? (
            <p
              id={`${children.props.id}-error`}
              className="text-warning-500 text-sm text-left flex items-center"
            >
              <AlertCircle className="h-3 w-3 mr-1 flex-shrink-0" />
              <span>{error}</span>
            </p>
          ) : helperText ? (
            <p
              id={`${children.props.id}-helper`}
              className="text-gray-500 text-sm text-left"
            >
              {helperText}
            </p>
          ) : null}
        </div>
      </div>
    );
  }
);

FormField.displayName = "FormField";
