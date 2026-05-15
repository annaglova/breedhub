import type { DashboardEvent, EventCategory } from "../mock-data";

interface UpcomingEventsProps {
  events: DashboardEvent[];
  /** When set, indicates the list is filtered to a single date. */
  filterDate?: Date;
  onClearFilter?: () => void;
}

const CATEGORY_LABEL: Record<EventCategory, string> = {
  litter: "Litter",
  health: "Health",
  heat: "Heat",
  show: "Show",
  mating: "Mating",
};

/**
 * Color per semantic category — applied to both the date-block on the left
 * AND the category pill on the right so the row reads in one colour.
 * - litter, mating → primary (core breeding lifecycle)
 * - heat → red (matches the Discard button tone in EditPageTemplate)
 * - health → emerald (clinical/wellbeing)
 * - show → amber (achievement adjacent, gold accent)
 */
const CATEGORY_TINT: Record<EventCategory, string> = {
  litter: "bg-primary-100 text-primary-800",
  mating: "bg-primary-100 text-primary-800",
  heat: "bg-red-100 text-red-700",
  health: "bg-emerald-100 text-emerald-700",
  show: "bg-amber-100 text-amber-800",
};

const MONTH_SHORT = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
];

export function UpcomingEvents({ events, filterDate, onClearFilter }: UpcomingEventsProps) {
  const filterLabel = filterDate
    ? filterDate.toLocaleDateString(undefined, { month: "short", day: "numeric" })
    : null;

  return (
    <section
      aria-label="Upcoming events"
      className="h-full rounded-2xl border border-primary-100/70 bg-white p-5 shadow-[0_1px_1px_rgba(17,17,26,0.04),0_2px_6px_rgba(17,17,26,0.03)]"
    >
      {filterLabel && (
        <div className="mb-3 flex items-center gap-2 rounded-lg bg-primary-50/70 px-3 py-2 text-xs text-slate-700">
          <span>
            Showing <span className="font-bold text-primary-800">{filterLabel}</span>
          </span>
          <button
            type="button"
            onClick={onClearFilter}
            className="ml-auto text-xs font-bold text-primary-700 transition hover:text-primary-800"
          >
            Clear
          </button>
        </div>
      )}

      {events.length === 0 ? (
        <p className="rounded-xl bg-primary-50/60 p-6 text-center text-sm text-slate-600">
          {filterDate
            ? "No events on this date."
            : "Nothing scheduled. Plan a mating or add a treatment to fill this list."}
        </p>
      ) : (
        <ul className="space-y-2">
          {events.map((evt) => {
            const month = MONTH_SHORT[evt.date.getMonth()];
            const day = String(evt.date.getDate()).padStart(2, "0");

            return (
              <li key={evt.id}>
                <button
                  type="button"
                  className={`flex w-full items-center gap-4 rounded-xl border-l-4 px-3 py-3 text-left transition hover:bg-primary-50/40 ${
                    evt.imminent
                      ? "border-l-primary-700 bg-primary-50/60"
                      : "border-l-primary-200 bg-white"
                  }`}
                >
                  <div
                    className={`flex w-12 shrink-0 flex-col items-center rounded-lg px-2 py-1.5 ${
                      CATEGORY_TINT[evt.category]
                    }`}
                  >
                    <span className="text-[10px] font-bold uppercase tracking-wider">
                      {month}
                    </span>
                    <span className="text-lg font-bold leading-none tabular-nums">
                      {day}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-900">
                      {evt.title}
                    </p>
                    {evt.subtitle && (
                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {evt.subtitle}
                      </p>
                    )}
                  </div>

                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${
                      CATEGORY_TINT[evt.category]
                    }`}
                  >
                    {CATEGORY_LABEL[evt.category]}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
