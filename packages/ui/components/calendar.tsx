"use client";

import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { DayPicker, type DayPickerProps } from "react-day-picker";

import { cn } from "@ui/lib/utils";

const calendarVariants = cva(
  "p-3",
  {
    variants: {
      variant: {
        default: "",
        bordered: "border border-border rounded-md",
        ghost: "",
      },
      size: {
        sm: "text-xs",
        default: "text-sm",
        lg: "text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface CalendarProps 
  extends DayPickerProps,
    VariantProps<typeof calendarVariants> {}

function Calendar({
  className,
  classNames,
  variant,
  size,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(calendarVariants({ variant, size }), className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell: "text-muted-foreground rounded-md w-8 font-normal text-[0.8rem]",
        row: "flex w-full mt-2",
        cell: cn(
          "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-accent [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected].day-range-end)]:rounded-r-md",
          props.mode === "range"
            ? "[&:has(>.day-range-end)]:rounded-r-md [&:has(>.day-range-start)]:rounded-l-md first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md"
            : "[&:has([aria-selected])]:rounded-md"
        ),
        day: cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
          "h-8 w-8 p-0 font-normal aria-selected:opacity-100"
        ),
        day_range_start: "day-range-start",
        day_range_end: "day-range-end",
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "bg-accent text-accent-foreground",
        day_outside:
          "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ...props }) => (
          <svg
            width="15"
            height="15"
            viewBox="0 0 15 15"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            {...props}
          >
            <path
              d="M8.84182 3.13514C9.04327 3.32401 9.05348 3.64042 8.86462 3.84188L5.43521 7.49991L8.86462 11.1579C9.05348 11.3594 9.04327 11.6758 8.84182 11.8647C8.64036 12.0535 8.32394 12.0433 8.13508 11.8419L4.38508 7.84188C4.20477 7.64955 4.20477 7.35027 4.38508 7.15794L8.13508 3.15794C8.32394 2.95648 8.64036 2.94628 8.84182 3.13514Z"
              fill="currentColor"
              fillRule="evenodd"
              clipRule="evenodd"
            />
          </svg>
        ),
        IconRight: ({ ...props }) => (
          <svg
            width="15"
            height="15"
            viewBox="0 0 15 15"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            {...props}
          >
            <path
              d="M6.1584 3.13508C6.35985 2.94621 6.67627 2.95642 6.86514 3.15788L10.6151 7.15788C10.7954 7.3502 10.7954 7.64949 10.6151 7.84182L6.86514 11.8418C6.67627 12.0433 6.35985 12.0535 6.1584 11.8646C5.95694 11.6757 5.94673 11.3593 6.1356 11.1579L9.565 7.49985L6.1356 3.84182C5.94673 3.64036 5.95694 3.32394 6.1584 3.13508Z"
              fill="currentColor"
              fillRule="evenodd"
              clipRule="evenodd"
            />
          </svg>
        ),
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

// Date Picker component built on top of Calendar
interface DatePickerProps {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  calendarProps?: CalendarProps;
}

const DatePicker = React.forwardRef<HTMLDivElement, DatePickerProps>(
  ({ value, onChange, placeholder = "Pick a date", disabled, className, calendarProps }, ref) => {
    const [isOpen, setIsOpen] = React.useState(false);
    
    return (
      <div ref={ref} className={cn("relative", className)}>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            !value && "text-muted-foreground"
          )}
        >
          <span>
            {value ? value.toLocaleDateString() : placeholder}
          </span>
          <svg
            width="15"
            height="15"
            viewBox="0 0 15 15"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 opacity-50"
          >
            <path
              d="M4.5 1C4.77614 1 5 1.22386 5 1.5V2H10V1.5C10 1.22386 10.2239 1 10.5 1C10.7761 1 11 1.22386 11 1.5V2H12.5C13.3284 2 14 2.67157 14 3.5V12.5C14 13.3284 13.3284 14 12.5 14H2.5C1.67157 14 1 13.3284 1 12.5V3.5C1 2.67157 1.67157 2 2.5 2H4V1.5C4 1.22386 4.22386 1 4.5 1ZM10 3H11V3.5C11 3.77614 10.7761 4 10.5 4C10.2239 4 10 3.77614 10 3.5V3ZM5 3V3.5C5 3.77614 4.77614 4 4.5 4C4.22386 4 4 3.77614 4 3.5V3H2.5C2.22386 3 2 3.22386 2 3.5V5H13V3.5C13 3.22386 12.7761 3 12.5 3H11ZM2 6V12.5C2 12.7761 2.22386 13 2.5 13H12.5C12.7761 13 13 12.7761 13 12.5V6H2Z"
              fill="currentColor"
              fillRule="evenodd"
              clipRule="evenodd"
            />
          </svg>
        </button>
        {isOpen && (
          <div className="absolute top-full z-50 mt-1 rounded-md border bg-popover p-0 text-popover-foreground shadow-md">
            <Calendar
              mode="single"
              selected={value}
              onSelect={(date) => {
                onChange?.(date);
                setIsOpen(false);
              }}
              variant="bordered"
              {...calendarProps}
            />
          </div>
        )}
      </div>
    );
  }
);
DatePicker.displayName = "DatePicker";

// Date Range Picker
interface DateRangePickerProps {
  value?: { from: Date | undefined; to: Date | undefined };
  onChange?: (range: { from: Date | undefined; to: Date | undefined } | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  calendarProps?: CalendarProps;
}

const DateRangePicker = React.forwardRef<HTMLDivElement, DateRangePickerProps>(
  ({ value, onChange, placeholder = "Pick a date range", disabled, className, calendarProps }, ref) => {
    const [isOpen, setIsOpen] = React.useState(false);
    
    const formatRange = (range: { from: Date | undefined; to: Date | undefined } | undefined) => {
      if (!range || !range.from) return placeholder;
      if (!range.to) return range.from.toLocaleDateString();
      return `${range.from.toLocaleDateString()} - ${range.to.toLocaleDateString()}`;
    };
    
    return (
      <div ref={ref} className={cn("relative", className)}>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            !value?.from && "text-muted-foreground"
          )}
        >
          <span>{formatRange(value)}</span>
          <svg
            width="15"
            height="15"
            viewBox="0 0 15 15"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 opacity-50"
          >
            <path
              d="M4.5 1C4.77614 1 5 1.22386 5 1.5V2H10V1.5C10 1.22386 10.2239 1 10.5 1C10.7761 1 11 1.22386 11 1.5V2H12.5C13.3284 2 14 2.67157 14 3.5V12.5C14 13.3284 13.3284 14 12.5 14H2.5C1.67157 14 1 13.3284 1 12.5V3.5C1 2.67157 1.67157 2 2.5 2H4V1.5C4 1.22386 4.22386 1 4.5 1ZM10 3H11V3.5C11 3.77614 10.7761 4 10.5 4C10.2239 4 10 3.77614 10 3.5V3ZM5 3V3.5C5 3.77614 4.77614 4 4.5 4C4.22386 4 4 3.77614 4 3.5V3H2.5C2.22386 3 2 3.22386 2 3.5V5H13V3.5C13 3.22386 12.7761 3 12.5 3H11ZM2 6V12.5C2 12.7761 2.22386 13 2.5 13H12.5C12.7761 13 13 12.7761 13 12.5V6H2Z"
              fill="currentColor"
              fillRule="evenodd"
              clipRule="evenodd"
            />
          </svg>
        </button>
        {isOpen && (
          <div className="absolute top-full z-50 mt-1 rounded-md border bg-popover p-0 text-popover-foreground shadow-md">
            <Calendar
              mode="range"
              selected={value}
              onSelect={(range) => {
                onChange?.(range);
                if (range?.from && range?.to) {
                  setIsOpen(false);
                }
              }}
              variant="bordered"
              numberOfMonths={2}
              {...calendarProps}
            />
          </div>
        )}
      </div>
    );
  }
);
DateRangePicker.displayName = "DateRangePicker";

export { 
  Calendar, 
  DatePicker, 
  DateRangePicker,
  calendarVariants,
};