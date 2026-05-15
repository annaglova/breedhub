import { CustomCalendar } from "@ui/components/custom-calendar";

interface ScheduleCalendarProps {
  selected?: Date;
  onSelect?: (date: Date | undefined) => void;
}

/**
 * Mini calendar that acts as quick navigation for the Schedule list.
 * Click a date → DashboardSpace filters Schedule to events on that day.
 * Re-click the same date (or the Clear chip above the list) resets.
 *
 * v2 TODO: event-dot indicators per day. Requires forking CustomCalendar
 * to accept a `renderDay` prop or merging this widget with its own grid.
 */
export function ScheduleCalendar({ selected, onSelect }: ScheduleCalendarProps) {
  return (
    <div className="h-full">
      <CustomCalendar
        selected={selected}
        onSelect={(date) => {
          // re-clicking the selected day clears the filter
          if (selected && date && selected.toDateString() === date.toDateString()) {
            onSelect?.(undefined);
            return;
          }
          onSelect?.(date);
        }}
        className="h-full border-primary-100/70 shadow-[0_1px_1px_rgba(17,17,26,0.04),0_2px_6px_rgba(17,17,26,0.03)]"
      />
    </div>
  );
}
