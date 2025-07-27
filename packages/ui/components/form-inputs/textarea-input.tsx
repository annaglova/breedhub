import React, { forwardRef } from "react";
import { Textarea } from "../textarea";
import { FormField } from "../form-field";
import { cn } from "@ui/lib/utils";

interface TextareaInputProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  fieldClassName?: string;
  showCharCount?: boolean;
  maxChars?: number;
}

export const TextareaInput = forwardRef<HTMLTextAreaElement, TextareaInputProps>(
  ({ 
    label, 
    error,
    helperText, 
    required, 
    className, 
    fieldClassName,
    showCharCount = false,
    maxChars,
    value,
    onChange,
    ...props 
  }, ref) => {
    const charCount = value ? String(value).length : 0;
    const isOverLimit = maxChars ? charCount > maxChars : false;

    const textareaElement = (
      <>
        <Textarea
          ref={ref}
          value={value}
          onChange={onChange}
          className={cn(
            "min-h-[100px] resize-y",
            isOverLimit && "border-red-500 focus:border-red-500",
            className
          )}
          maxLength={maxChars}
          {...props}
        />
        {showCharCount && (
          <div className="mt-1 text-right text-sm">
            <span className={cn(
              "text-gray-500",
              isOverLimit && "text-red-500"
            )}>
              {charCount}
              {maxChars && ` / ${maxChars}`}
            </span>
          </div>
        )}
      </>
    );

    if (label || error || helperText) {
      return (
        <FormField
          label={label}
          error={error}
          helperText={!error ? helperText : undefined}
          required={required}
          className={fieldClassName}
        >
          {textareaElement}
        </FormField>
      );
    }

    return textareaElement;
  }
);

TextareaInput.displayName = "TextareaInput";