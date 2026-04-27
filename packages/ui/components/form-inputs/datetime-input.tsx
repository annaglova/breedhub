import React, { forwardRef } from "react";
import { format } from "date-fns";
import { DateInput } from "./date-input";
import { TimeInput } from "./time-input";
import { cn } from "@ui/lib/utils";

interface DateTimeInputProps {
  value?: Date | string | null;
  /** Combined ISO 8601 string (or null when cleared) */
  onValueChange?: (iso: string | null) => void;
  disabled?: boolean;
  className?: string;
  dateFormat?: string;
  /** TimeInput step in minutes (default 1 — every minute selectable) */
  timeStep?: number;
  /** TimeInput 24h format (default true) */
  use24Hour?: boolean;
  placeholder?: string;
}

function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * DateTimeInput — composes our existing DateInput + TimeInput so the user
 * can pick a date and an hour/minute. Emits a single ISO 8601 string via
 * onValueChange. Use this whenever a field requires precision finer than
 * "day" (e.g., pet_measurement.date with weighing time-of-day).
 */
export const DateTimeInput = forwardRef<HTMLInputElement, DateTimeInputProps>(
  (
    {
      value,
      onValueChange,
      disabled,
      className,
      dateFormat = "dd.MM.yyyy",
      timeStep = 1,
      use24Hour = true,
      placeholder,
    },
    ref,
  ) => {
    const candidate = value
      ? value instanceof Date
        ? value
        : new Date(value)
      : null;
    const safe = candidate && !isNaN(candidate.getTime()) ? candidate : null;

    const dateStr = safe ? toLocalDateString(safe) : null;
    const timeStr = safe ? format(safe, "HH:mm") : "";

    const compose = (nextDate: string | null, nextTime: string) => {
      if (!nextDate) {
        onValueChange?.(null);
        return;
      }
      const t = nextTime || "00:00";
      const combined = new Date(`${nextDate}T${t}:00`);
      if (isNaN(combined.getTime())) return;
      onValueChange?.(combined.toISOString());
    };

    return (
      <div className={cn("flex gap-2", className)}>
        <DateInput
          ref={ref}
          value={safe}
          onValueChange={(next) => compose(next, timeStr)}
          dateFormat={dateFormat}
          disabled={disabled}
          placeholder={placeholder}
          className="flex-1"
        />
        <TimeInput
          value={timeStr}
          onValueChange={(next) =>
            compose(dateStr || toLocalDateString(new Date()), next)
          }
          use24Hour={use24Hour}
          step={timeStep}
          disabled={disabled}
          className="flex-1"
        />
      </div>
    );
  },
);

DateTimeInput.displayName = "DateTimeInput";
