import React, { forwardRef, useState, useRef } from "react";
import { Input } from "../input";
import { FormField } from "../form-field";
import { Calendar } from "../calendar";
import { cn } from "@ui/lib/utils";
import { CalendarIcon } from "lucide-react";
import { format, parse, isValid } from "date-fns";
import "react-day-picker/dist/style.css";

interface DateInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  label?: string;
  error?: string;
  required?: boolean;
  value?: Date | null;
  onValueChange?: (date: Date | null) => void;
  minDate?: Date;
  maxDate?: Date;
  dateFormat?: string;
  placeholder?: string;
  fieldClassName?: string;
  disabled?: boolean;
}

export const DateInput = forwardRef<HTMLInputElement, DateInputProps>(
  ({ 
    label, 
    error, 
    required,
    value,
    onValueChange,
    minDate,
    maxDate,
    dateFormat = "MM/dd/yyyy",
    placeholder,
    className,
    fieldClassName,
    disabled,
    ...props 
  }, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const [inputValue, setInputValue] = useState(
      value ? format(value, dateFormat) : ""
    );
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Handle clicks outside
    React.useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
          setIsOpen(false);
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Update input value when value prop changes
    React.useEffect(() => {
      setInputValue(value ? format(value, dateFormat) : "");
    }, [value, dateFormat]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setInputValue(newValue);

      // Try to parse the date
      if (newValue === "") {
        onValueChange?.(null);
      } else {
        const parsedDate = parse(newValue, dateFormat, new Date());
        if (isValid(parsedDate)) {
          onValueChange?.(parsedDate);
        }
      }
    };

    const handleCalendarSelect = (date: Date | undefined) => {
      if (date) {
        setInputValue(format(date, dateFormat));
        onValueChange?.(date);
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      } else if (e.key === "Enter") {
        e.preventDefault();
      }
    };

    const inputElement = (
      <div className="relative" ref={dropdownRef}>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            <CalendarIcon className="h-4 w-4" />
          </div>
          <Input
            ref={ref}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onFocus={() => !disabled && setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder || dateFormat.toLowerCase()}
            disabled={disabled}
            className={cn(
              "pl-10 pr-3",
              className
            )}
            {...props}
          />
        </div>

        {isOpen && !disabled && (
          <div className="absolute z-50 mt-1 bg-white border border-gray-200 rounded-md shadow-lg p-3">
            <Calendar
              mode="single"
              selected={value || undefined}
              onSelect={handleCalendarSelect}
              disabled={(date) => {
                if (minDate && date < minDate) return true;
                if (maxDate && date > maxDate) return true;
                return false;
              }}
              initialFocus
              className="p-0"
            />
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
          {inputElement}
        </FormField>
      );
    }

    return inputElement;
  }
);

DateInput.displayName = "DateInput";