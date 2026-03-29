import React, { forwardRef, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Input } from "../input";
import { FormField } from "../form-field";
import { CustomCalendar } from "../custom-calendar";
import { cn } from "@ui/lib/utils";
import { CalendarIcon } from "lucide-react";
import { format, parse, isValid } from "date-fns";

interface DateInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  value?: Date | string | null;
  onValueChange?: (date: string | null) => void;
  minDate?: Date;
  maxDate?: Date;
  dateFormat?: string;
  placeholder?: string;
  fieldClassName?: string;
  disabled?: boolean;
}

/** Format Date to YYYY-MM-DD using local timezone (no UTC shift) */
function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export const DateInput = forwardRef<HTMLInputElement, DateInputProps>(
  ({ 
    label, 
    error,
    helperText, 
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
    // Normalize value: accept both Date and ISO string
    const normalizedValue = value
      ? (value instanceof Date ? value : new Date(value))
      : null;
    // Guard against invalid dates
    const safeValue = normalizedValue && !isNaN(normalizedValue.getTime()) ? normalizedValue : null;

    const [isOpen, setIsOpen] = useState(false);
    const [inputValue, setInputValue] = useState(
      safeValue ? format(safeValue, dateFormat) : ""
    );
    const triggerRef = useRef<HTMLDivElement>(null);
    const calendarRef = useRef<HTMLDivElement>(null);
    const [calendarPos, setCalendarPos] = useState({ top: 0, left: 0, width: 0 });

    // Handle clicks outside (check both trigger and portal calendar)
    React.useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        const target = e.target as Node;
        const inTrigger = triggerRef.current?.contains(target);
        const inCalendar = calendarRef.current?.contains(target);
        if (!inTrigger && !inCalendar) {
          setIsOpen(false);
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const openCalendar = useCallback(() => {
      if (disabled) return;
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        const calendarHeight = 380; // approximate calendar height with today button
        const spaceBelow = window.innerHeight - rect.bottom;
        const openUp = spaceBelow < calendarHeight && rect.top > calendarHeight;
        setCalendarPos({
          top: openUp ? rect.top - calendarHeight - 8 : rect.bottom + 4,
          left: rect.left,
          width: rect.width,
        });
      }
      setIsOpen(true);
    }, [disabled]);

    // Close calendar and blur field on page/container scroll
    React.useEffect(() => {
      if (!isOpen) return;
      const handlePageScroll = () => {
        setIsOpen(false);
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
      };
      window.addEventListener("scroll", handlePageScroll, true);
      return () => window.removeEventListener("scroll", handlePageScroll, true);
    }, [isOpen]);

    // Update input value when value prop changes
    React.useEffect(() => {
      setInputValue(safeValue ? format(safeValue, dateFormat) : "");
    }, [safeValue?.getTime(), dateFormat]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setInputValue(newValue);

      // Try to parse the date
      if (newValue === "") {
        onValueChange?.(null);
      } else {
        const parsedDate = parse(newValue, dateFormat, new Date());
        if (isValid(parsedDate)) {
          onValueChange?.(toLocalDateString(parsedDate));
        }
      }
    };

    const handleCalendarSelect = (date: Date | undefined) => {
      if (date) {
        setInputValue(format(date, dateFormat));
        onValueChange?.(toLocalDateString(date));
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
      <div className="relative" ref={triggerRef}>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <CalendarIcon className="h-4 w-4" />
          </div>
          <Input
            ref={ref}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onFocus={openCalendar}
            onClick={openCalendar}
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

        {isOpen && !disabled && createPortal(
          <div
            ref={calendarRef}
            data-portal-dropdown
            className="fixed z-[9999] pointer-events-auto bg-white border border-slate-200 rounded-md shadow-lg"
            style={{ top: calendarPos.top, left: calendarPos.left }}
          >
            <CustomCalendar
              selected={safeValue || undefined}
              onSelect={handleCalendarSelect}
              fromYear={1900}
              toYear={2030}
              disabled={(date) => {
                if (minDate && date < minDate) return true;
                if (maxDate && date > maxDate) return true;
                return false;
              }}
            />
          </div>,
          document.body
        )}
      </div>
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
          {inputElement}
        </FormField>
      );
    }

    return inputElement;
  }
);

DateInput.displayName = "DateInput";