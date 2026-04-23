import { LoadingButton } from "@/components/LoadingButton";
import { TabHeader } from "@/components/TabHeader";

interface BreedProgressSectionProps {
  activeTab: number;
  breedSpaceImage: string;
  kennelSpaceImage: string;
  onTabChange: (value: number) => void;
  petSpaceImage: string;
}

export function BreedProgressSection({
  activeTab,
  breedSpaceImage,
  kennelSpaceImage,
  onTabChange,
  petSpaceImage,
}: BreedProgressSectionProps) {
  return (
    <>
      {/* Tabs — мобільна версія */}
      <ul
        className="mt-20 flex list-none overflow-x-auto scrollbar-hide lg:hidden"
        role="tablist"
      >
        <li>
          <TabHeader
            value={1}
            name="Pedigree"
            activeTab={activeTab}
            onTabChange={onTabChange}
            isFirst={true}
          />
        </li>
        <li>
          <TabHeader
            value={2}
            name="Site"
            activeTab={activeTab}
            onTabChange={onTabChange}
          />
        </li>
        <li>
          <TabHeader
            value={3}
            name="Kennel"
            activeTab={activeTab}
            onTabChange={onTabChange}
            isLast={true}
          />
        </li>
      </ul>
      {/* Tabs — десктоп */}
      <div className="border-primary-50 mt-10 flex w-full flex-col overflow-hidden rounded-[3rem] border bg-purple-50/50 pt-8 shadow-lg shadow-slate-200 lg:mt-20 lg:pt-12 xl:pt-16">
        <div className="px-8 pb-8 lg:px-20 lg:pb-10 xl:px-32 xl:pb-16">
          <ul
            className="hidden list-none flex-wrap pb-4 pt-3 lg:flex"
            role="tablist"
          >
            <li>
              <TabHeader
                value={1}
                name="Pedigree"
                activeTab={activeTab}
                onTabChange={onTabChange}
                isFirst={true}
              />
            </li>
            <li>
              <TabHeader
                value={2}
                name="Site"
                activeTab={activeTab}
                onTabChange={onTabChange}
              />
            </li>
            <li>
              <TabHeader
                value={3}
                name="Kennel"
                activeTab={activeTab}
                onTabChange={onTabChange}
                isLast={true}
              />
            </li>
          </ul>
          {/* Tab content */}
          <div className="flex w-full min-w-0 flex-col">
            {/* Tab 1 */}
            <div
              id="tabpanel-1"
              role="tabpanel"
              aria-labelledby="tab-1"
              className={`xl:space-x-10 ${
                activeTab !== 1 ? "hidden" : "flex flex-col xl:flex-row"
              }`}
            >
              <div className="order-2 flex flex-col space-y-8 xl:order-1">
                <p className="mt-8 text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-tight">
                  <span className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-600 bg-clip-text text-transparent">
                    Professional pedigrees
                  </span>{" "}
                  <span className="bg-gradient-to-r from-primary-500 to-accent-500 bg-clip-text text-transparent">
                    simplified
                  </span>
                </p>
                <p className="text-lg leading-relaxed tracking-wide">
                  Create, manage, and share detailed pedigrees with just a few
                  clicks. Access your complete breeding history from any device,
                  anytime.
                  <br />
                  <br />
                  Track bloodlines, health records, and achievements in one
                  centralized platform designed for serious breeders.
                </p>
              </div>
              <div className="order-1 h-[400px] min-w-[50%] overflow-hidden rounded-2xl border shadow-lg transition-shadow duration-300 hover:shadow-xl xl:order-2 group">
                <img
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  src={petSpaceImage}
                  alt="Pedigree management interface"
                  loading="lazy"
                />
              </div>
            </div>
            {/* Tab 2 */}
            <div
              id="tabpanel-2"
              role="tabpanel"
              aria-labelledby="tab-2"
              className={`xl:space-x-10 ${
                activeTab !== 2 ? "hidden" : "flex flex-col xl:flex-row"
              }`}
            >
              <div className="order-2 flex flex-col space-y-8 xl:order-1">
                <p className="mt-8 text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-tight">
                  <span className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-600 bg-clip-text text-transparent">
                    Your kennel's
                  </span>{" "}
                  <span className="bg-gradient-to-r from-primary-500 to-accent-500 bg-clip-text text-transparent">
                    online presence
                  </span>{" "}
                  <span className="bg-gradient-to-r from-slate-600 via-slate-700 to-slate-800 bg-clip-text text-transparent">
                    made easy
                  </span>
                </p>
                <p className="text-lg leading-relaxed tracking-wide">
                  Get a professional website for your kennel in minutes. Choose
                  from beautiful templates or customize your own design.
                  <br />
                  <br />
                  Showcase your dogs, upcoming litters, and achievements.
                  Control exactly what information you share with the public.
                </p>
              </div>
              <div className="order-1 h-[400px] min-w-[50%] overflow-hidden rounded-2xl border shadow-lg transition-shadow duration-300 hover:shadow-xl xl:order-2 group">
                <img
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  src={kennelSpaceImage}
                  alt="Kennel website management"
                  loading="lazy"
                />
              </div>
            </div>
            {/* Tab 3 */}
            <div
              id="tabpanel-3"
              role="tabpanel"
              aria-labelledby="tab-3"
              className={`xl:space-x-10 ${
                activeTab !== 3 ? "hidden" : "flex flex-col xl:flex-row"
              }`}
            >
              <div className="order-2 flex flex-col space-y-8 xl:order-1">
                <p className="mt-8 text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-tight">
                  <span className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-600 bg-clip-text text-transparent">
                    Breeding management
                  </span>{" "}
                  <span className="bg-gradient-to-r from-primary-500 to-accent-500 bg-clip-text text-transparent">
                    reimagined
                  </span>
                </p>
                <p className="text-lg leading-relaxed tracking-wide">
                  Streamline your entire breeding program from planning to
                  puppies. Track heat cycles, manage matings, and monitor litter
                  progress all in one place.
                  <br />
                  <br />
                  Spend less time on paperwork and more time doing what you
                  love.
                </p>
              </div>
              <div className="order-1 h-[400px] min-w-[50%] overflow-hidden rounded-2xl border shadow-lg transition-shadow duration-300 hover:shadow-xl xl:order-2 group">
                <img
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  src={breedSpaceImage}
                  alt="Breeding work management"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
          {/* Action button */}
          <LoadingButton
            to="/product"
            className="landing-raised-button landing-raised-button-primary mt-3 min-w-[180px] px-6 md:mt-5 xl:mt-0"
            loadingText="Loading features..."
          >
            See All Features
          </LoadingButton>
        </div>
        <div className="bg-primary-100/50 w-full py-14"></div>
      </div>
    </>
  );
}
