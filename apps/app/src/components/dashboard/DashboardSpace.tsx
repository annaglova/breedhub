import { ToolPageLayout } from "@/layouts/ToolPageLayout";
import { useMemo, useState } from "react";
import { mockActivity, mockEvents, mockRanking, mockStats } from "./mock-data";
import { QuickActions } from "./widgets/QuickActions";
import { RecentActivity } from "./widgets/RecentActivity";
import { ScheduleCalendar } from "./widgets/ScheduleCalendar";
import { StatsCards } from "./widgets/StatsCards";
import { SubscribeHero } from "./widgets/SubscribeHero";
import { TopKennelsBanner } from "./widgets/TopKennelsBanner";
import { UpcomingEvents } from "./widgets/UpcomingEvents";

interface DashboardSpaceProps {
  /**
   * Whether the current breeder is on a paid (patron) plan.
   * When true, the Subscribe hero is hidden and the top-kennels banner
   * stretches across the hero row.
   */
  isPaid?: boolean;
}

/** Uppercase section eyebrow above each card group. Fixed height so rows
 *  align even when only some sections have an action link. */
function SectionLabel({
  children,
  action,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex h-6 items-center justify-between gap-3 px-1">
      <span className="text-xs font-bold uppercase tracking-wider text-primary-700">
        {children}
      </span>
      {action}
    </div>
  );
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * `my` workspace landing dashboard.
 * Uses mock data — composition is the deliverable, data wiring is deferred
 * until BREEDING_CYCLE / PET_TREATMENTS / contact subscription surfaces land.
 */
export function DashboardSpace({ isPaid = false }: DashboardSpaceProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  const filteredEvents = useMemo(() => {
    if (!selectedDate) return mockEvents;
    return mockEvents.filter((evt) => isSameDay(evt.date, selectedDate));
  }, [selectedDate]);

  return (
    <ToolPageLayout>
      <div className="flex flex-col gap-6 lg:gap-8">
        {/* Hero row — top kennels (left) + subscribe CTA (right, wider).
            When patron, subscribe disappears and top kennels takes full width. */}
        <div
          className={
            isPaid
              ? "grid grid-cols-1"
              : "grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8"
          }
        >
          <div className={isPaid ? "" : "lg:col-span-1"}>
            <TopKennelsBanner ranking={mockRanking} />
          </div>
          {!isPaid && (
            <div className="lg:col-span-2">
              <SubscribeHero isPaid={isPaid} />
            </div>
          )}
        </div>

        <section>
          <SectionLabel>At a glance</SectionLabel>
          <StatsCards stats={mockStats} />
        </section>

        {/* Row 3 — Schedule + Calendar (quick navigation) */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
          <section className="flex flex-col lg:col-span-2">
            <SectionLabel>Schedule</SectionLabel>
            <div className="flex-1">
              <UpcomingEvents
                events={filteredEvents}
                filterDate={selectedDate}
                onClearFilter={() => setSelectedDate(undefined)}
              />
            </div>
          </section>

          <section className="flex flex-col">
            <SectionLabel>Calendar</SectionLabel>
            <div className="flex-1">
              <ScheduleCalendar selected={selectedDate} onSelect={setSelectedDate} />
            </div>
          </section>
        </div>

        {/* Row 4 — Activity + Quick Actions */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
          <section className="flex flex-col lg:col-span-2">
            <SectionLabel
              action={
                <button
                  type="button"
                  className="text-sm font-bold text-primary-700 transition hover:text-primary-800"
                >
                  See all →
                </button>
              }
            >
              Activity
            </SectionLabel>
            <div className="flex-1">
              <RecentActivity entries={mockActivity} />
            </div>
          </section>

          <section className="flex flex-col">
            <SectionLabel>Quick actions</SectionLabel>
            <div className="flex-1">
              <QuickActions />
            </div>
          </section>
        </div>
      </div>
    </ToolPageLayout>
  );
}
