"use client";

import { cn } from "@ui/lib/utils";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import * as React from "react";
import { CustomDropdown } from "./custom-dropdown";

interface CustomCalendarProps {
  selected?: Date;
  onSelect?: (date: Date | undefined) => void;
  fromYear?: number;
  toYear?: number;
  disabled?: (date: Date) => boolean;
  className?: string;
}

const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function CustomCalendar({
  selected,
  onSelect,
  fromYear = 1900,
  toYear = 2030,
  disabled,
  className,
}: CustomCalendarProps) {
  const [currentDate, setCurrentDate] = React.useState(selected || new Date());

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const years = Array.from(
    { length: toYear - fromYear + 1 },
    (_, i) => fromYear + i
  );

  const monthOptions = months.map((month, idx) => ({
    value: idx,
    label: month,
  }));

  const yearOptions = years.map((year) => ({
    value: year,
    label: year.toString(),
  }));

  const handleMonthChange = (value: string | number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(value as number);
    setCurrentDate(newDate);
  };

  const handleYearChange = (value: string | number) => {
    const newDate = new Date(currentDate);
    newDate.setFullYear(value as number);
    setCurrentDate(newDate);
  };

  const handleDayClick = (day: Date) => {
    if (disabled && disabled(day)) return;
    onSelect?.(day);
  };

  const handleTodayClick = () => {
    const today = new Date();
    setCurrentDate(today);
    onSelect?.(today);
  };

  return (
    <div
      className={cn(
        "px-4 bg-white rounded-lg border border-slate-200",
        className
      )}
    >
      {/* Header with navigation */}
      <div className="flex items-center justify-between py-4">
        <button
          onClick={() => setCurrentDate(subMonths(currentDate, 1))}
          className="p-1.5 rounded hover:bg-slate-100 transition-colors"
          type="button"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="flex gap-2 mx-2">
          {/* Month dropdown */}
          <CustomDropdown
            value={currentDate.getMonth()}
            options={monthOptions}
            onChange={handleMonthChange}
            className="min-w-[120px]"
          />

          {/* Year dropdown */}
          <CustomDropdown
            value={currentDate.getFullYear()}
            options={yearOptions}
            onChange={handleYearChange}
            className="min-w-[80px]"
          />
        </div>

        <button
          onClick={() => setCurrentDate(addMonths(currentDate, 1))}
          className="p-1.5 rounded hover:bg-slate-100 transition-colors"
          type="button"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-2 ">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
          <div
            key={day}
            className="text-center text-xs font-medium text-slate-500 py-1"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar days */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, idx) => {
          const isDisabled = disabled && disabled(day);
          const isSelected = selected && isSameDay(day, selected);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isToday = isSameDay(day, new Date());

          return (
            <button
              key={idx}
              onClick={() => handleDayClick(day)}
              disabled={isDisabled}
              className={cn(
                "h-9 w-9 rounded-full text-sm transition-colors",
                "hover:bg-slate-100",
                "focus:outline-none focus:ring-2 focus:ring-primary-500/20",
                isCurrentMonth ? "text-slate-900" : "text-slate-400",
                isSelected &&
                  "bg-primary-50 text-primary-700 font-bold hover:bg-primary-50",
                isToday && !isSelected && "text-primary-700 font-bold",
                isDisabled &&
                  "opacity-50 cursor-not-allowed hover:bg-transparent"
              )}
              type="button"
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>

      {/* Today button */}
      <div className="mt-2 px-4 mb-4">
        <button
          onClick={handleTodayClick}
          className={cn(
            "w-full py-2 px-4",
            "bg-primary-50 border border-primary-50 rounded-md",
            "text-sm font-medium text-slate-700",
            "hover:primary-100 hover:border-primary-500",
            "focus:outline-none focus:ring-2 focus:ring-primary-500/20",
            "transition-all"
          )}
          type="button"
        >
          Today
        </button>
      </div>
    </div>
  );
}
