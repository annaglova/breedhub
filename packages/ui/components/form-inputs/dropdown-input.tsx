import React, { forwardRef, useState, useRef, useEffect } from "react";
import { Input } from "../input";
import { FormField } from "../form-field";
import { cn } from "@ui/lib/utils";
import { ChevronDown, Check } from "lucide-react";

interface DropdownOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface DropdownInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  label?: string;
  error?: string;
  required?: boolean;
  placeholder?: string;
  options: DropdownOption[];
  value?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  className?: string;
  fieldClassName?: string;
}

export const DropdownInput = forwardRef<HTMLInputElement, DropdownInputProps>(
  ({ 
    label, 
    error, 
    required, 
    placeholder = "Select an option",
    options,
    value,
    onValueChange,
    disabled,
    className,
    fieldClassName,
    ...props
  }, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Find selected option
    const selectedOption = options.find(opt => opt.value === value);

    // Handle clicks outside
    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
          setIsOpen(false);
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelect = (option: DropdownOption) => {
      if (!option.disabled) {
        onValueChange?.(option.value);
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    const selectElement = (
      <div className="relative" ref={dropdownRef}>
        <div 
          className="relative cursor-pointer"
          onClick={() => !disabled && setIsOpen(!isOpen)}
        >
          <Input
            ref={ref}
            type="text"
            value={selectedOption?.label || ""}
            placeholder={placeholder}
            readOnly
            disabled={disabled}
            onKeyDown={handleKeyDown}
            className={cn(
              "cursor-pointer pr-10",
              className
            )}
            aria-expanded={isOpen}
            aria-haspopup="listbox"
            {...props}
          />
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
            <ChevronDown className={cn(
              "h-4 w-4 transition-transform",
              isOpen && "rotate-180"
            )} />
          </div>
        </div>

        {isOpen && (
          <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
            {options.length === 0 ? (
              <div className="px-3 py-2 text-gray-500 text-center">
                No options available
              </div>
            ) : (
              options.map((option) => (
                <div
                  key={option.value}
                  onClick={() => handleSelect(option)}
                  className={cn(
                    "px-3 py-2 cursor-pointer transition-colors flex items-center justify-between",
                    "hover:bg-gray-100",
                    option.disabled && "opacity-50 cursor-not-allowed",
                    option.value === value && "bg-primary-50 text-primary-700"
                  )}
                  role="option"
                  aria-selected={option.value === value}
                  aria-disabled={option.disabled}
                >
                  <span>{option.label}</span>
                  {option.value === value && (
                    <Check className="h-4 w-4 text-primary-600" />
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    );

    if (label || error) {
      return (
        <FormField
          label={label}
          error={error}
          required={required}
          className={fieldClassName}
        >
          {selectElement}
        </FormField>
      );
    }

    return selectElement;
  }
);

DropdownInput.displayName = "DropdownInput";