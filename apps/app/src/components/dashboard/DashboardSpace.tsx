import { ContentPageLayout } from "@/layouts/ContentPageLayout";
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
    <ContentPageLayout>
      <div className="flex flex-col gap-6 lg:gap-8">
        <h1 className="text-2xl font-semibold">Dashboard</h1>

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
    </ContentPageLayout>
  );
}
