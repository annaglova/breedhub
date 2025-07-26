import React, { forwardRef, useState, useRef } from "react";
import { Input } from "../input";
import { FormField } from "../form-field";
import { cn } from "@ui/lib/utils";
import { Clock } from "lucide-react";

interface TimeOption {
  value: string;
  label: string;
}

interface TimeInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  label?: string;
  error?: string;
  required?: boolean;
  value?: string;
  onValueChange?: (time: string) => void;
  showIcon?: boolean;
  use24Hour?: boolean;
  minTime?: string;
  maxTime?: string;
  step?: number; // in minutes
  fieldClassName?: string;
}

const generateTimeOptions = (use24Hour: boolean, step: number = 30): TimeOption[] => {
  const options: TimeOption[] = [];
  const totalMinutes = 24 * 60;
  
  for (let minutes = 0; minutes < totalMinutes; minutes += step) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    let value = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    let label = value;
    
    if (!use24Hour) {
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
      label = `${displayHours}:${mins.toString().padStart(2, '0')} ${period}`;
    }
    
    options.push({ value, label });
  }
  
  return options;
};

export const TimeInput = forwardRef<HTMLInputElement, TimeInputProps>(
  ({ 
    label, 
    error, 
    required,
    value,
    onValueChange,
    showIcon = true,
    use24Hour = false,
    minTime,
    maxTime,
    step = 30,
    className,
    fieldClassName,
    disabled,
    placeholder,
    ...props 
  }, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const [inputValue, setInputValue] = useState(value || "");
    const dropdownRef = useRef<HTMLDivElement>(null);
    const timeOptions = generateTimeOptions(use24Hour, step);

    // Filter options based on min/max time
    const filteredOptions = timeOptions.filter(option => {
      if (minTime && option.value < minTime) return false;
      if (maxTime && option.value > maxTime) return false;
      return true;
    });

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

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setInputValue(newValue);
      
      // Validate time format (HH:MM)
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (timeRegex.test(newValue)) {
        onValueChange?.(newValue);
      }
    };

    const handleTimeSelect = (selectedValue: string) => {
      setInputValue(selectedValue);
      onValueChange?.(selectedValue);
      setIsOpen(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      } else if (e.key === "Enter") {
        e.preventDefault();
        setIsOpen(false);
      }
    };

    const inputElement = (
      <div className="relative" ref={dropdownRef}>
        <div className="relative">
          {showIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <Clock className="h-4 w-4" />
            </div>
          )}
          <Input
            ref={ref}
            type="time"
            value={inputValue}
            onChange={handleInputChange}
            onFocus={() => !disabled && setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder || (use24Hour ? "HH:MM" : "HH:MM AM/PM")}
            disabled={disabled}
            className={cn(
              showIcon && "pl-10",
              className
            )}
            {...props}
          />
        </div>

        {isOpen && !disabled && (
          <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
            {filteredOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleTimeSelect(option.value)}
                className={cn(
                  "w-full px-3 py-2 text-left text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none",
                  value === option.value && "bg-primary-50 text-primary-600 font-medium"
                )}
              >
                {option.label}
              </button>
            ))}
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

TimeInput.displayName = "TimeInput";