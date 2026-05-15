import { mockActivity, mockEvents, mockStats } from "./mock-data";
import { QuickActions } from "./widgets/QuickActions";
import { RecentActivity } from "./widgets/RecentActivity";
import { StatsCards } from "./widgets/StatsCards";
import { SubscribeHero } from "./widgets/SubscribeHero";
import { UpcomingEvents } from "./widgets/UpcomingEvents";

interface DashboardSpaceProps {
  /**
   * Whether the current breeder is on a paid (patron) plan.
   * When true, the Subscribe hero is hidden.
   * Wire via app_config / contact tier signal once available.
   */
  isPaid?: boolean;
}

/**
 * `my` workspace landing dashboard.
 * Uses mock data — composition is the deliverable, data wiring is
 * deferred until BREEDING_CYCLE / PET_TREATMENTS / contact subscription
 * surfaces land.
 */
export function DashboardSpace({ isPaid = false }: DashboardSpaceProps) {
  return (
    <div className="min-h-full bg-primary-50/60">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:gap-8 lg:px-8">
        <header className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-primary-700">
              My kennel
            </p>
            <h1 className="mt-1 text-3xl font-bold text-slate-900 sm:text-4xl">
              Dashboard
            </h1>
          </div>
        </header>

        <SubscribeHero isPaid={isPaid} />

        <StatsCards stats={mockStats} />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
          <div className="lg:col-span-2">
            <UpcomingEvents events={mockEvents} />
          </div>
          <div className="flex flex-col gap-6 lg:gap-8">
            <QuickActions />
            <RecentActivity entries={mockActivity} />
          </div>
        </div>
      </div>
    </div>
  );
}
