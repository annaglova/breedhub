import type { DashboardEvent, EventCategory } from "../mock-data";

interface UpcomingEventsProps {
  events: DashboardEvent[];
}

const CATEGORY_LABEL: Record<EventCategory, string> = {
  litter: "Litter",
  health: "Health",
  heat: "Heat",
  show: "Show",
  mating: "Mating",
};

/**
 * Pill colors per semantic category:
 * - litter, heat, mating → primary (core breeding lifecycle)
 * - health → primary-100 muted (recurring, routine)
 * - show → amber (achievement adjacent, gold accent)
 */
const CATEGORY_PILL: Record<EventCategory, string> = {
  litter: "bg-primary-100 text-primary-800",
  heat: "bg-primary-100 text-primary-800",
  mating: "bg-primary-100 text-primary-800",
  health: "bg-slate-100 text-slate-700",
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

export function UpcomingEvents({ events }: UpcomingEventsProps) {
  return (
    <section
      aria-label="Upcoming events"
      className="rounded-2xl border border-primary-100/70 bg-white p-5 shadow-[0_1px_1px_rgba(17,17,26,0.04),0_2px_6px_rgba(17,17,26,0.03)]"
    >
      {events.length === 0 ? (
        <p className="rounded-xl bg-primary-50/60 p-6 text-center text-sm text-slate-600">
          Nothing scheduled. Plan a mating or add a treatment to fill this list.
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
                  <div className="flex w-12 shrink-0 flex-col items-center rounded-lg bg-primary-50 px-2 py-1.5 text-primary-800">
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
                      CATEGORY_PILL[evt.category]
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
