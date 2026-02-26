import React, { forwardRef, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Input } from "../input";
import { FormField } from "../form-field";
import { CustomDropdown } from "../custom-dropdown";
import { cn } from "@ui/lib/utils";
import { CalendarIcon, X } from "lucide-react";
import {
  format,
  parse,
  isValid,
  isSameDay,
  isSameMonth,
  isWithinInterval,
  addMonths,
  subMonths,
  startOfMonth,
  startOfWeek,
  eachDayOfInterval,
  isAfter,
  isBefore,
} from "date-fns";

interface DateRangeInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  value?: string; // "2024-01-01_2024-12-31"
  onValueChange?: (value: string) => void;
  dateFormat?: string; // Display format, default "MM/dd/yyyy"
  placeholder?: string;
  fieldClassName?: string;
  disabled?: boolean;
  className?: string;
  touched?: boolean;
  disabledOnGray?: boolean;
}

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const monthOptions = months.map((month, idx) => ({
  value: idx,
  label: month,
}));

const fromYear = 1900;
const toYear = 2030;
const years = Array.from({ length: toYear - fromYear + 1 }, (_, i) => fromYear + i);
const yearOptions = years.map((year) => ({
  value: year,
  label: year.toString(),
}));

function parseRangeValue(value: string | undefined): { from: Date | null; to: Date | null } {
  if (!value) return { from: null, to: null };
  const [fromStr, toStr] = value.split("_");
  const from = fromStr ? parse(fromStr, "yyyy-MM-dd", new Date()) : null;
  const to = toStr ? parse(toStr, "yyyy-MM-dd", new Date()) : null;
  return {
    from: from && isValid(from) ? from : null,
    to: to && isValid(to) ? to : null,
  };
}

function toRangeString(from: Date | null, to: Date | null): string {
  const fromStr = from ? format(from, "yyyy-MM-dd") : "";
  const toStr = to ? format(to, "yyyy-MM-dd") : "";
  if (!fromStr && !toStr) return "";
  return `${fromStr}_${toStr}`;
}

interface CalendarMonthProps {
  month: Date;
  from: Date | null;
  to: Date | null;
  onDayClick: (day: Date) => void;
  onMonthChange: (monthIdx: number) => void;
  onYearChange: (year: number) => void;
}

function CalendarMonth({ month, from, to, onDayClick, onMonthChange, onYearChange }: CalendarMonthProps) {
  const monthStart = startOfMonth(month);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  // Always render exactly 6 rows (42 days) for consistent height
  const calendarEnd = new Date(calendarStart);
  calendarEnd.setDate(calendarStart.getDate() + 41);
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const today = new Date();

  // Normalize range direction once
  const rangeStart = from && to ? (isBefore(from, to) ? from : to) : null;
  const rangeEnd = from && to ? (isAfter(from, to) ? from : to) : null;
  const hasRange = rangeStart && rangeEnd && !isSameDay(rangeStart, rangeEnd);

  return (
    <div className="flex-1 min-w-[240px]">
      {/* Month/Year selectors */}
      <div className="flex gap-2 mb-3 relative z-20">
        <div className="flex-1 min-w-0">
          <CustomDropdown
            value={month.getMonth()}
            options={monthOptions}
            onChange={(v) => onMonthChange(v as number)}
            className="w-full"
          />
        </div>
        <div className="shrink-0">
          <CustomDropdown
            value={month.getFullYear()}
            options={yearOptions}
            onChange={(v) => onYearChange(v as number)}
          />
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-1">
        {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((day) => (
          <div key={day} className="text-center text-xs text-slate-500 py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Days — z-0 creates stacking context below the z-20 dropdown row */}
      <div className="grid grid-cols-7 relative z-0">
        {days.map((day, idx) => {
          const isCurrentMonth = isSameMonth(day, month);
          const isToday = isSameDay(day, today);
          const isFrom = from && isSameDay(day, from);
          const isTo = to && isSameDay(day, to);
          // Only show endpoint/range highlights for days in the current month
          const isEndpoint = isCurrentMonth && (isFrom || isTo);

          // Check if day is in the middle of the range (not an endpoint)
          const inRangeMiddle = isCurrentMonth && hasRange &&
            isWithinInterval(day, { start: rangeStart, end: rangeEnd }) && !isEndpoint;

          // Endpoint that is the visual start of range (has range bg extending right)
          const isVisualStart = isCurrentMonth && hasRange && rangeStart && isSameDay(day, rangeStart);
          // Endpoint that is the visual end of range (has range bg extending left)
          const isVisualEnd = isCurrentMonth && hasRange && rangeEnd && isSameDay(day, rangeEnd);

          return (
            <button
              key={idx}
              onClick={() => onDayClick(day)}
              className={cn(
                "h-8 w-full relative flex items-center justify-center text-sm",
                "focus:outline-none",
                !isEndpoint && isCurrentMonth && "hover:bg-slate-100 hover:rounded-full",
              )}
              type="button"
            >
              {/* Range background strip */}
              {(inRangeMiddle || isVisualStart || isVisualEnd) && (
                <div
                  className={cn(
                    "absolute inset-y-0 bg-primary-50",
                    isVisualStart && !isVisualEnd && "left-1/2 right-0",
                    isVisualEnd && !isVisualStart && "left-0 right-1/2",
                    inRangeMiddle && "left-0 right-0",
                    isVisualStart && isVisualEnd && "hidden", // same day = no strip
                  )}
                />
              )}
              {/* Endpoint circle */}
              {isEndpoint && (
                <div className="absolute h-8 w-8 rounded-full bg-primary-600 hover:bg-primary-700 transition-colors" />
              )}
              {/* Day number */}
              <span
                className={cn(
                  "relative z-10",
                  !isCurrentMonth && "text-slate-300",
                  isCurrentMonth && !isEndpoint && "text-slate-900",
                  isToday && !isEndpoint && "text-primary-700 font-bold",
                  isEndpoint && "text-white font-bold",
                )}
              >
                {format(day, "d")}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export const DateRangeInput = forwardRef<HTMLInputElement, DateRangeInputProps>(
  ({
    label,
    error,
    helperText,
    required,
    value,
    onValueChange,
    dateFormat = "MM/dd/yyyy",
    placeholder,
    className,
    fieldClassName,
    disabled,
    touched,
    disabledOnGray,
  }, ref) => {
    const { from: committedFrom, to: committedTo } = parseRangeValue(value);

    // Validation state
    const hasError = touched && !!error;

    const [isOpen, setIsOpen] = useState(false);
    const [tempFrom, setTempFrom] = useState<Date | null>(committedFrom);
    const [tempTo, setTempTo] = useState<Date | null>(committedTo);
    const [fromInput, setFromInput] = useState(committedFrom ? format(committedFrom, dateFormat) : "");
    const [toInput, setToInput] = useState(committedTo ? format(committedTo, dateFormat) : "");
    const [selectingField, setSelectingField] = useState<"from" | "to">("from");
    const [leftMonth, setLeftMonth] = useState<Date>(() => {
      if (committedFrom) return startOfMonth(committedFrom);
      return startOfMonth(new Date());
    });
    const [rightMonth, setRightMonth] = useState<Date>(() => {
      if (committedTo) return startOfMonth(committedTo);
      if (committedFrom) return addMonths(startOfMonth(committedFrom), 1);
      return addMonths(startOfMonth(new Date()), 1);
    });

    const triggerRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });

    // Sync state when value prop changes externally
    React.useEffect(() => {
      const { from, to } = parseRangeValue(value);
      setTempFrom(from);
      setTempTo(to);
      setFromInput(from ? format(from, dateFormat) : "");
      setToInput(to ? format(to, dateFormat) : "");
      if (from) setLeftMonth(startOfMonth(from));
      if (to) {
        setRightMonth(startOfMonth(to));
      } else if (from) {
        setRightMonth(addMonths(startOfMonth(from), 1));
      }
    }, [value, dateFormat]);

    const handleOpen = useCallback(() => {
      if (disabled) return;
      // Reset temp state to current committed values
      const { from, to } = parseRangeValue(value);
      setTempFrom(from);
      setTempTo(to);
      setFromInput(from ? format(from, dateFormat) : "");
      setToInput(to ? format(to, dateFormat) : "");
      setSelectingField("from");
      if (from) setLeftMonth(startOfMonth(from));
      if (to) {
        setRightMonth(startOfMonth(to));
      } else if (from) {
        setRightMonth(addMonths(startOfMonth(from), 1));
      }

      // Calculate position from trigger element
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        setDropdownPos({ top: rect.bottom + 4, left: rect.left });
      }
      setIsOpen(true);
    }, [disabled, value, dateFormat]);

    const handleDayClick = useCallback((day: Date) => {
      if (selectingField === "from") {
        setTempFrom(day);
        setFromInput(format(day, dateFormat));
        setSelectingField("to");
      } else {
        let newFrom = tempFrom;
        let newTo = day;

        // Auto-swap if to < from
        if (newFrom && isBefore(newTo, newFrom)) {
          const swap = newFrom;
          newFrom = newTo;
          newTo = swap;
        }

        setTempFrom(newFrom);
        setTempTo(newTo);
        // Only update fromInput if we have a valid date (don't clear user's typed text)
        if (newFrom) {
          setFromInput(format(newFrom, dateFormat));
        }
        setToInput(format(newTo, dateFormat));
        setSelectingField("from");
      }
    }, [selectingField, tempFrom, dateFormat]);

    const handleApply = useCallback(() => {
      // Auto-swap if needed
      let finalFrom = tempFrom;
      let finalTo = tempTo;
      if (finalFrom && finalTo && isAfter(finalFrom, finalTo)) {
        const swap = finalFrom;
        finalFrom = finalTo;
        finalTo = swap;
      }
      const rangeStr = toRangeString(finalFrom, finalTo);
      onValueChange?.(rangeStr);
      setIsOpen(false);
    }, [tempFrom, tempTo, onValueChange]);

    const handleCancel = useCallback(() => {
      // Restore to committed values
      const { from, to } = parseRangeValue(value);
      setTempFrom(from);
      setTempTo(to);
      setFromInput(from ? format(from, dateFormat) : "");
      setToInput(to ? format(to, dateFormat) : "");
      setIsOpen(false);
    }, [value, dateFormat]);

    const handleClear = useCallback((e: React.MouseEvent) => {
      e.stopPropagation();
      onValueChange?.("");
      setTempFrom(null);
      setTempTo(null);
      setFromInput("");
      setToInput("");
      setIsOpen(false);
    }, [onValueChange]);

    // Try parsing date with multiple formats for flexible manual input
    const tryParseDate = useCallback((val: string): Date | null => {
      const formats = [
        dateFormat,       // Primary format (e.g. MM/dd/yyyy)
        "M/d/yyyy",       // Without leading zeros
        "MM/dd/yyyy",
        "dd.MM.yyyy",     // European format
        "d.M.yyyy",
        "yyyy-MM-dd",     // ISO format
      ];
      for (const fmt of formats) {
        const parsed = parse(val, fmt, new Date());
        if (isValid(parsed) && parsed.getFullYear() > 1900 && parsed.getFullYear() < 2100) {
          return parsed;
        }
      }
      return null;
    }, [dateFormat]);

    // Auto-format date input: "07272026" → "07/27/2026"
    const autoFormatDate = useCallback((raw: string, prev: string): string => {
      // If user is deleting, don't auto-format
      if (raw.length < prev.length) return raw;
      const digits = raw.replace(/\D/g, "").slice(0, 8); // max 8 digits (MMddyyyy)
      if (digits.length <= 2) return digits;
      if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
      return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    }, []);

    const handleFromInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      const val = autoFormatDate(e.target.value, fromInput);
      setFromInput(val);
      if (val === "") {
        setTempFrom(null);
      } else {
        const parsed = tryParseDate(val);
        if (parsed) {
          setTempFrom(parsed);
          setLeftMonth(startOfMonth(parsed));
        }
      }
    }, [tryParseDate, autoFormatDate, fromInput]);

    const handleToInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      const val = autoFormatDate(e.target.value, toInput);
      setToInput(val);
      if (val === "") {
        setTempTo(null);
      } else {
        const parsed = tryParseDate(val);
        if (parsed) {
          setTempTo(parsed);
          setRightMonth(startOfMonth(parsed));
        }
      }
    }, [tryParseDate, autoFormatDate, toInput]);

    const handleLeftMonthChange = useCallback((monthIdx: number) => {
      setLeftMonth((prev) => {
        const d = new Date(prev);
        d.setMonth(monthIdx);
        return d;
      });
    }, []);

    const handleLeftYearChange = useCallback((year: number) => {
      setLeftMonth((prev) => {
        const d = new Date(prev);
        d.setFullYear(year);
        return d;
      });
    }, []);

    const handleRightMonthChange = useCallback((monthIdx: number) => {
      setRightMonth((prev) => {
        const d = new Date(prev);
        d.setMonth(monthIdx);
        return d;
      });
    }, []);

    const handleRightYearChange = useCallback((year: number) => {
      setRightMonth((prev) => {
        const d = new Date(prev);
        d.setFullYear(year);
        return d;
      });
    }, []);

    // Prevent Radix Dialog FocusScope from stealing focus from portal inputs.
    // FocusScope listens for both focusin AND focusout on document.
    // On focusout it checks relatedTarget — if outside scope, it refocuses inside dialog.
    // We intercept both events on window (capture phase, fires before document)
    // and stop propagation so Radix's handlers never fire.
    React.useEffect(() => {
      if (!isOpen) return;
      const handleFocusIn = (e: FocusEvent) => {
        if (dropdownRef.current?.contains(e.target as Node)) {
          e.stopPropagation();
        }
      };
      const handleFocusOut = (e: FocusEvent) => {
        const relatedTarget = e.relatedTarget as Node | null;
        if (relatedTarget && dropdownRef.current?.contains(relatedTarget)) {
          e.stopPropagation();
        }
      };
      window.addEventListener("focusin", handleFocusIn, true);
      window.addEventListener("focusout", handleFocusOut, true);
      return () => {
        window.removeEventListener("focusin", handleFocusIn, true);
        window.removeEventListener("focusout", handleFocusOut, true);
      };
    }, [isOpen]);

    // Handle click outside — check both trigger and portal dropdown
    React.useEffect(() => {
      if (!isOpen) return;
      const handleClickOutside = (e: MouseEvent) => {
        const target = e.target as Node;
        if (
          triggerRef.current && !triggerRef.current.contains(target) &&
          dropdownRef.current && !dropdownRef.current.contains(target)
        ) {
          handleCancel();
        }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen, handleCancel]);

    // Display value for main input
    const displayValue = React.useMemo(() => {
      if (!committedFrom && !committedTo) return "";
      const fromStr = committedFrom ? format(committedFrom, dateFormat) : "...";
      const toStr = committedTo ? format(committedTo, dateFormat) : "...";
      return `${fromStr} — ${toStr}`;
    }, [committedFrom, committedTo, dateFormat]);

    const hasValue = !!(committedFrom || committedTo);

    const inputElement = (
      <div className="group/field relative" ref={triggerRef}>
        {/* Main trigger input */}
        <div className="relative cursor-pointer" onClick={handleOpen}>
          <div
            className={cn(
              "absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors z-10",
              hasError
                ? "text-red-400"
                : "text-slate-400"
            )}
          >
            <CalendarIcon className="h-4 w-4" />
          </div>
          <Input
            ref={ref}
            type="text"
            value={displayValue}
            readOnly
            placeholder={placeholder || `${dateFormat.toLowerCase()} — ${dateFormat.toLowerCase()}`}
            disabled={disabled}
            className={cn(
              "peer pl-10 cursor-pointer transition-all duration-200",
              hasValue ? "pr-8" : "pr-3",
              disabled &&
                !disabledOnGray &&
                "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed",
              disabled &&
                disabledOnGray &&
                "bg-white/95 border-slate-300 text-slate-400 cursor-not-allowed",
              hasError &&
                "border-red-500 hover:border-red-600 focus:border-red-500 focus:ring-2 focus:ring-red-500/20",
              !hasError &&
                !disabled &&
                "border-slate-300 hover:border-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20",
              className
            )}
            style={{ caretColor: "transparent" }}
            aria-invalid={hasError ? "true" : undefined}
          />
          {hasValue && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className={cn(
                "absolute inset-y-0 right-0 pr-3 flex items-center transition-colors",
                hasError
                  ? "text-red-400 hover:text-red-600"
                  : "text-slate-400 hover:text-slate-600"
              )}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Dropdown panel — rendered via portal to escape overflow clipping */}
        {isOpen && !disabled && createPortal(
          <div
            ref={dropdownRef}
            data-portal-dropdown
            className="fixed z-[9999] pointer-events-auto bg-white rounded-lg border border-slate-200 shadow-lg p-4"
            style={{ top: dropdownPos.top, left: dropdownPos.left }}
          >
            {/* Date text inputs */}
            <div className="flex items-center gap-2 mb-4">
              <Input
                type="text"
                value={fromInput}
                onChange={handleFromInputChange}
                onClick={() => {
                  setSelectingField("from");
                  if (tempFrom) setLeftMonth(startOfMonth(tempFrom));
                }}
                onFocus={() => {
                  setSelectingField("from");
                  if (tempFrom) setLeftMonth(startOfMonth(tempFrom));
                }}
                placeholder={dateFormat.toLowerCase()}
                className={cn(
                  "flex-1",
                  fromInput && !tempFrom
                    ? "border-red-500 focus:ring-2 focus:ring-red-500/20"
                    : selectingField === "from" && "border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                )}
              />
              <span className="text-slate-400 shrink-0">—</span>
              <Input
                type="text"
                value={toInput}
                onChange={handleToInputChange}
                onClick={() => {
                  setSelectingField("to");
                  if (tempTo) setRightMonth(startOfMonth(tempTo));
                }}
                onFocus={() => {
                  setSelectingField("to");
                  if (tempTo) setRightMonth(startOfMonth(tempTo));
                }}
                placeholder={dateFormat.toLowerCase()}
                className={cn(
                  "flex-1",
                  toInput && !tempTo
                    ? "border-red-500 focus:ring-2 focus:ring-red-500/20"
                    : selectingField === "to" && "border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                )}
              />
            </div>

            {/* Two calendars side by side */}
            <div className="flex gap-4">
              <CalendarMonth
                month={leftMonth}
                from={tempFrom}
                to={tempTo}
                onDayClick={handleDayClick}
                onMonthChange={handleLeftMonthChange}
                onYearChange={handleLeftYearChange}
              />
              <CalendarMonth
                month={rightMonth}
                from={tempFrom}
                to={tempTo}
                onDayClick={handleDayClick}
                onMonthChange={handleRightMonthChange}
                onYearChange={handleRightYearChange}
              />
            </div>

            {/* Action buttons — style matches FiltersDialog */}
            <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={handleCancel}
                className="h-9 px-4 rounded-md text-sm font-bold bg-secondary-100 hover:bg-secondary-200 focus:bg-secondary-300 text-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApply}
                className="h-9 px-4 rounded-md text-sm font-bold bg-primary-50 hover:bg-primary-100 focus:bg-primary-200 text-primary transition-colors"
              >
                Apply
              </button>
            </div>
          </div>,
          document.body
        )}
      </div>
    );

    if (label || error || helperText) {
      return (
        <FormField
          label={label}
          error={hasError ? error : undefined}
          helperText={!hasError ? helperText : undefined}
          required={required}
          className={fieldClassName}
          labelClassName={cn(
            "transition-colors",
            hasError
              ? "text-red-600"
              : "text-slate-700 group-focus-within:text-primary-600"
          )}
        >
          {inputElement}
        </FormField>
      );
    }

    return inputElement;
  }
);

DateRangeInput.displayName = "DateRangeInput";
