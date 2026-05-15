import { ToolPageLayout } from "@/layouts/ToolPageLayout";
import { mockActivity, mockEvents, mockRanking, mockStats } from "./mock-data";
import { QuickActions } from "./widgets/QuickActions";
import { RecentActivity } from "./widgets/RecentActivity";
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

/**
 * `my` workspace landing dashboard.
 * Uses mock data — composition is the deliverable, data wiring is deferred
 * until BREEDING_CYCLE / PET_TREATMENTS / contact subscription surfaces land.
 */
export function DashboardSpace({ isPaid = false }: DashboardSpaceProps) {
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
    </ToolPageLayout>
  );
}
