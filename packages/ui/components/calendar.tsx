"use client"

import * as React from "react"
import { DayPicker } from "react-day-picker"
import "react-day-picker/dist/style.css"

import { cn } from "@ui/lib/utils"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      className={cn(className)}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }