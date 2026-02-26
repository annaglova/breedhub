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

  return (
    <div className="flex-1 min-w-[240px]">
      {/* Month/Year selectors */}
      <div className="flex gap-2 mb-3 justify-center">
        <CustomDropdown
          value={month.getMonth()}
          options={monthOptions}
          onChange={(v) => onMonthChange(v as number)}
          className="min-w-[110px] text-sm"
        />
        <CustomDropdown
          value={month.getFullYear()}
          options={yearOptions}
          onChange={(v) => onYearChange(v as number)}
          className="min-w-[75px] text-sm"
        />
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-1">
        {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((day) => (
          <div key={day} className="text-center text-xs text-slate-500 py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Days */}
      <div className="grid grid-cols-7">
        {days.map((day, idx) => {
          const isCurrentMonth = isSameMonth(day, month);
          const isToday = isSameDay(day, today);
          const isFrom = from && isSameDay(day, from);
          const isTo = to && isSameDay(day, to);
          const isEndpoint = isFrom || isTo;

          // Check if day is in range
          let inRange = false;
          if (from && to) {
            const rangeStart = isBefore(from, to) ? from : to;
            const rangeEnd = isAfter(from, to) ? from : to;
            inRange = isWithinInterval(day, { start: rangeStart, end: rangeEnd }) && !isEndpoint;
          }

          return (
            <button
              key={idx}
              onClick={() => onDayClick(day)}
              className={cn(
                "h-8 w-full text-sm transition-colors relative",
                "hover:bg-slate-100",
                "focus:outline-none",
                !isCurrentMonth && "text-slate-300",
                isCurrentMonth && "text-slate-900",
                isToday && !isEndpoint && "text-primary-700 font-bold",
                isEndpoint && "bg-primary-600 text-white font-bold rounded-full hover:bg-primary-700 z-10",
                inRange && isCurrentMonth && "bg-primary-50",
                inRange && !isCurrentMonth && "bg-primary-50/50",
              )}
              type="button"
            >
              {format(day, "d")}
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
  }, ref) => {
    const { from: committedFrom, to: committedTo } = parseRangeValue(value);

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
    }, [value, dateFormat]);

    const rightMonth = addMonths(leftMonth, 1);

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
        setFromInput(newFrom ? format(newFrom, dateFormat) : "");
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

    const handleFromInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setFromInput(val);
      if (val === "") {
        setTempFrom(null);
      } else {
        const parsed = parse(val, dateFormat, new Date());
        if (isValid(parsed)) {
          setTempFrom(parsed);
          setLeftMonth(startOfMonth(parsed));
        }
      }
    }, [dateFormat]);

    const handleToInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setToInput(val);
      if (val === "") {
        setTempTo(null);
      } else {
        const parsed = parse(val, dateFormat, new Date());
        if (isValid(parsed)) {
          setTempTo(parsed);
        }
      }
    }, [dateFormat]);

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
      // Right month change → compute left = right - 1
      setLeftMonth(() => {
        const d = new Date(rightMonth);
        d.setMonth(monthIdx);
        return subMonths(d, 1);
      });
    }, [rightMonth]);

    const handleRightYearChange = useCallback((year: number) => {
      setLeftMonth(() => {
        const d = new Date(rightMonth);
        d.setFullYear(year);
        return subMonths(d, 1);
      });
    }, [rightMonth]);

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
      <div className="relative" ref={triggerRef}>
        {/* Main trigger input */}
        <div className="relative cursor-pointer" onClick={handleOpen}>
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
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
              "pl-10 cursor-pointer",
              hasValue ? "pr-8" : "pr-3",
              className
            )}
          />
          {hasValue && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Dropdown panel — rendered via portal to escape overflow clipping */}
        {isOpen && !disabled && createPortal(
          <div
            ref={dropdownRef}
            className="fixed z-[9999] bg-white rounded-lg border border-slate-200 shadow-lg p-4"
            style={{ top: dropdownPos.top, left: dropdownPos.left }}
          >
            {/* Date text inputs */}
            <div className="flex items-center gap-2 mb-4">
              <Input
                type="text"
                value={fromInput}
                onChange={handleFromInputChange}
                onFocus={() => setSelectingField("from")}
                placeholder={dateFormat.toLowerCase()}
                className={cn(
                  "text-sm h-9 flex-1",
                  selectingField === "from" && "border-primary-500 ring-1 ring-primary-500/20"
                )}
              />
              <span className="text-slate-400 shrink-0">—</span>
              <Input
                type="text"
                value={toInput}
                onChange={handleToInputChange}
                onFocus={() => setSelectingField("to")}
                placeholder={dateFormat.toLowerCase()}
                className={cn(
                  "text-sm h-9 flex-1",
                  selectingField === "to" && "border-primary-500 ring-1 ring-primary-500/20"
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

            {/* Action buttons */}
            <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={handleCancel}
                className={cn(
                  "px-4 py-1.5 rounded-md text-sm",
                  "bg-slate-100 text-slate-700 hover:bg-slate-200",
                  "transition-colors"
                )}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApply}
                className={cn(
                  "px-4 py-1.5 rounded-md text-sm",
                  "bg-primary-50 text-primary-700 hover:bg-primary-100",
                  "transition-colors"
                )}
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

DateRangeInput.displayName = "DateRangeInput";
