import { BreedProgress, type Breed } from "@/components/BreedProgress";
import { LoadingButton } from "@/components/LoadingButton";
import { TabHeader } from "@/components/TabHeader";
import type { AchievementLevel } from "@/constants/landingMockData";
import { AlternatingTimeline } from "@ui/components/timeline";
import { Check } from "lucide-react";

interface AchievementsSectionProps {
  achievements: AchievementLevel[];
  activeTab: number;
  onTabChange: (value: number) => void;
  specialAchievements: AchievementLevel[];
  topAchievementBreeds: Breed[];
  topRatingBreeds: Breed[];
}

export function AchievementsSection({
  achievements,
  activeTab,
  onTabChange,
  specialAchievements,
  topAchievementBreeds,
  topRatingBreeds,
}: AchievementsSectionProps) {
  return (
    <>
      {/* Top breeds by rating */}
      <div className="mt-20 max-w-screen mb-10 w-full lg:px-0 md:max-w-4xl md:px-6 lg:mt-24">
        <div className="text-secondary-600 mb-10 w-full text-center text-4xl font-semibold">
          Top Breeds by Pet Profiles
        </div>
        <div className="space-y-3">
          {topRatingBreeds.slice(0, 5).map((breed, i) => (
            <BreedProgress breed={breed} key={i} simpleView={false} />
          ))}
        </div>
      </div>

      {/* Breed promotion */}
      <ul
        className="mt-24 flex list-none overflow-x-auto scrollbar-hide lg:hidden"
        role="tablist"
      >
        <li>
          <TabHeader
            value={1}
            name="Breed's rating"
            activeTab={activeTab}
            onTabChange={onTabChange}
            variant="pink"
            isFirst={true}
            idPrefix="-breed"
          />
        </li>
        <li>
          <TabHeader
            value={2}
            name="Breed's goals"
            activeTab={activeTab}
            onTabChange={onTabChange}
            variant="pink"
            idPrefix="-breed"
          />
        </li>
        <li>
          <TabHeader
            value={3}
            name="Breed's support level"
            activeTab={activeTab}
            onTabChange={onTabChange}
            variant="pink"
            isLast={true}
            idPrefix="-breed"
          />
        </li>
      </ul>
      <div className="mt-10 flex w-full flex-col rounded-[3rem] border border-pink-100 bg-pink-50/50 px-8 pb-24 pt-8 shadow-lg shadow-slate-200 lg:mt-20 lg:px-20 lg:pt-12 xl:px-32 xl:pt-16">
        <ul
          className="hidden list-none flex-wrap pb-4 pt-3 lg:flex"
          role="tablist"
        >
          <li>
            <TabHeader
              value={1}
              name="Breed's rating"
              activeTab={activeTab}
              onTabChange={onTabChange}
              variant="pink"
              isFirst={true}
              idPrefix="-breed"
            />
          </li>
          <li>
            <TabHeader
              value={2}
              name="Breed's goals"
              activeTab={activeTab}
              onTabChange={onTabChange}
              variant="pink"
              idPrefix="-breed"
            />
          </li>
          <li>
            <TabHeader
              value={3}
              name="Breed's support level"
              activeTab={activeTab}
              onTabChange={onTabChange}
              variant="pink"
              isLast={true}
              idPrefix="-breed"
            />
          </li>
        </ul>

        {/* Tab content */}
        <div className="flex w-full min-w-0 flex-col">
          {/* Tab 1 - Breed's rating */}
          <div
            id="tabpanel-breed-1"
            role="tabpanel"
            aria-labelledby="tab-breed-1"
            className={`xl:space-x-10 ${
              activeTab !== 1 ? "hidden" : "flex flex-col xl:flex-row"
            }`}
          >
            <div className="order-2 flex flex-col space-y-8 xl:order-1">
              <p className="mt-8 text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-tight">
                <span className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-600 bg-clip-text text-transparent">
                  Power up your
                </span>{" "}
                <span className="bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
                  favorite breed
                </span>
              </p>
              <p className="text-lg leading-relaxed tracking-wide">
                Join a community of passionate breeders who share your
                dedication. When more breeders support a breed, everyone
                benefits with enhanced features and specialized tools.
                <br />
                <br />
                Your subscription unlocks{" "}
                <span className="underline decoration-pink-500 decoration-2">
                  premium features
                </span>{" "}
                while helping us prioritize development for the breeds that
                matter most to our community.
              </p>
            </div>

            {/* Breeds rating */}
            <div className="order-1 relative text-secondary-600 flex h-[500px] w-full flex-col items-end rounded-2xl border bg-white shadow-lg transition-shadow duration-300 hover:shadow-xl xl:order-2 xl:min-w-[50%]">
              <div className="h-full w-full overflow-y-auto overflow-x-hidden p-8">
                <p className="mb-3 font-semibold">Top-supported breeds</p>
                <div className="space-y-3">
                  {topAchievementBreeds.slice(0, 7).map((breed, i) => (
                    <BreedProgress breed={breed} key={i} />
                  ))}
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent pointer-events-none rounded-b-2xl"></div>
            </div>
          </div>

          {/* Tab 2 - Breed's goals */}
          <div
            id="tabpanel-breed-2"
            role="tabpanel"
            aria-labelledby="tab-breed-2"
            className={`xl:space-x-10 ${
              activeTab !== 2 ? "hidden" : "flex flex-col xl:flex-row"
            }`}
          >
            <div className="order-2 flex flex-col space-y-8 xl:order-1">
              <p className="mt-8 text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-tight">
                <span className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-600 bg-clip-text text-transparent">
                  Unlock new
                </span>{" "}
                <span className="bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
                  breed features
                </span>
              </p>
              <p className="text-lg leading-relaxed tracking-wide">
                Watch your breed evolve with community-driven milestones. As
                support grows, we unlock powerful new features for{" "}
                <span className="underline decoration-pink-500 decoration-2">
                  everyone
                </span>{" "}
                in that breed community.
                <br />
                <br />
                Every contribution counts towards reaching the next milestone
                and enhancing the platform for all breed enthusiasts.
              </p>
            </div>

            {/* Goals info */}
            <div className="order-1 relative flex h-[500px] min-w-[50%] flex-col rounded-2xl border bg-white shadow-lg transition-shadow duration-300 hover:shadow-xl xl:order-2">
              <div className="h-full overflow-auto p-8">
                {/* Header */}
                <div className="grid grid-cols-[42px_auto] md:grid-cols-[104px_auto] items-center gap-3 border-b pb-2 font-semibold">
                  <div className="hidden text-center md:block">
                    $ per month *
                  </div>
                  <div className="text-center md:hidden">$ *</div>
                  <div>Goals</div>
                </div>

                <div className="flex space-x-3">
                  <div className="hidden space-x-2 md:flex">
                    <div className="flex w-1 items-end pb-2 pt-5">
                      <div className="h-[20%] w-full rounded-full bg-fuchsia-300"></div>
                    </div>
                    <div className="flex w-1 items-end pb-2 pt-5">
                      <div className="h-[40%] w-full rounded-full bg-orange-300"></div>
                    </div>
                    <div className="flex w-1 items-end pb-2 pt-5">
                      <div className="h-[60%] w-full rounded-full bg-pink-300"></div>
                    </div>
                    <div className="flex w-1 items-end pb-2 pt-5">
                      <div className="h-[80%] w-full rounded-full bg-blue-300"></div>
                    </div>
                    <div className="flex w-1 items-end pb-2 pt-5">
                      <div className="h-[100%] w-full rounded-full bg-primary-300"></div>
                    </div>
                  </div>

                  {/* Rows */}
                  <div className="grid grid-cols-[42px_auto] md:grid-cols-[52px_auto] grid-rows-[94px_94px_82px_132px_122px] md:grid-rows-[56px_56px_56px_56px_56px] items-center pt-3">
                    {specialAchievements.map((achievement) => (
                      <>
                        <div
                          className="font-semibold"
                          key={`${achievement.Name}-value`}
                        >
                          {achievement.IntValue}
                        </div>
                        <div key={`${achievement.Name}-desc`}>
                          {achievement.Description}
                        </div>
                      </>
                    ))}
                  </div>
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent pointer-events-none rounded-b-2xl"></div>
              <p className="mt-3 text-sm px-8">
                * The table shows the <b>total amount per month</b> from the
                breed's community
              </p>
            </div>
          </div>

          {/* Tab 3 - Breed's support level */}
          <div
            id="tabpanel-breed-3"
            role="tabpanel"
            aria-labelledby="tab-breed-3"
            className={`xl:space-x-10 ${
              activeTab !== 3 ? "hidden" : "flex flex-col xl:flex-row"
            }`}
          >
            <div className="order-2 flex flex-col space-y-8 xl:order-1">
              <p className="mt-8 text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-tight">
                <span className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-600 bg-clip-text text-transparent">
                  Growing
                </span>{" "}
                <span className="bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
                  together
                </span>
              </p>
              <p className="text-lg leading-relaxed tracking-wide">
                We believe in rewarding active communities. Our six-tier support
                system ensures that breeds with the most{" "}
                <span className="underline decoration-pink-500 decoration-2">
                  engaged members
                </span>{" "}
                get priority features and dedicated support.
                <br />
                <br />
                Every breed starts with{" "}
                <span className="underline decoration-pink-500 decoration-2">
                  essential features
                </span>{" "}
                and can unlock advanced tools as the community grows and
                thrives.
              </p>
            </div>

            {/* Timeline info */}
            <div className="order-1 relative flex h-[500px] w-full flex-col rounded-2xl border bg-white shadow-lg transition-shadow duration-300 hover:shadow-xl xl:order-2 xl:min-w-[50%]">
              <div className="h-full overflow-y-auto overflow-x-hidden p-6 md:p-10">
                <AlternatingTimeline
                  items={achievements.map((achievement) => ({
                    id: achievement.Name,
                    title: achievement.Name,
                    description: achievement.Description,
                    date: `$${achievement.IntValue} per month`,
                    icon: achievement.Active ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <div className="w-2 h-2 bg-current rounded-full" />
                    ),
                    variant: achievement.Active ? "primary" : "inactive",
                  }))}
                  connectorVariant="primary"
                  showCards={true}
                  size="default"
                  layout="left"
                />
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent pointer-events-none rounded-b-2xl"></div>
            </div>
          </div>
        </div>

        {/* Action button */}
        <LoadingButton
          to="/breeds"
          className="landing-raised-button landing-raised-button-pink mt-3 w-fit px-6 md:mt-5 xl:mt-0"
          loadingText="Loading breeds..."
        >
          Choose Your Breed
        </LoadingButton>
        <div className="mt-6 w-full rounded-full bg-pink-100 py-1 md:mt-8 xl:mt-10"></div>
      </div>
    </>
  );
}
