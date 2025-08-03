import LandingFigure from "@/assets/backgrounds/landing-figure.svg?react";
import BreedSpaceImage from "@/assets/images/breed-space.jpeg";
import KennelSpaceImage from "@/assets/images/kennel-space.jpeg";
import PetSpaceImage from "@/assets/images/pet-space.jpeg";
import { BreedProgress, type Breed } from "@/components/BreedProgress";
import { LoadingButton } from "@/components/LoadingButton";
import { TabHeader } from "@/components/TabHeader";
import { usePageTitle } from "@/hooks/usePageTitle";
import LandingLayout from "@/layouts/LandingLayout";
import { AlternatingTimeline } from "@ui/components/timeline";
import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";

// Mock data - replace with API calls when ready
const topAchievementBreeds: Breed[] = [
  {
    Name: "Labrador Retriever",
    PetProfileCount: 1240,
    KennelCount: 45,
    PatronCount: 89,
    AchievementProgress: 85,
    LastAchievement: { Name: "Gold Standard" },
  },
  {
    Name: "German Shepherd",
    PetProfileCount: 980,
    KennelCount: 38,
    PatronCount: 72,
    AchievementProgress: 78,
    LastAchievement: { Name: "Silver Elite" },
  },
  {
    Name: "Golden Retriever",
    PetProfileCount: 856,
    KennelCount: 32,
    PatronCount: 65,
    AchievementProgress: 72,
    LastAchievement: { Name: "Silver Elite" },
  },
];

const topRatingBreeds: Breed[] = [
  {
    Name: "Beagle",
    PetProfileCount: 567,
    KennelCount: 24,
    PatronCount: 41,
    AchievementProgress: 65,
    LastAchievement: { Name: "Bronze Champion" },
  },
  {
    Name: "Boxer",
    PetProfileCount: 445,
    KennelCount: 19,
    PatronCount: 35,
    AchievementProgress: 58,
    LastAchievement: { Name: "Bronze Champion" },
  },
  {
    Name: "Bulldog",
    PetProfileCount: 398,
    KennelCount: 16,
    PatronCount: 28,
    AchievementProgress: 52,
    LastAchievement: { Name: "Rising Star" },
  },
  {
    Name: "Poodle",
    PetProfileCount: 334,
    KennelCount: 14,
    PatronCount: 24,
    AchievementProgress: 45,
    LastAchievement: { Name: "Rising Star" },
  },
  {
    Name: "Rottweiler",
    PetProfileCount: 289,
    KennelCount: 12,
    PatronCount: 19,
    AchievementProgress: 38,
    LastAchievement: { Name: "Newcomer" },
  },
];

// Achievement levels data
const achievements = [
  {
    Active: true,
    Date: "2024-01-01",
    Description: "Basic breed support with community access",
    IntValue: 0,
    Name: "Zero support level",
    Position: 0,
  },
  {
    Active: true,
    Date: "2024-01-01",
    Description: "Priority bug fixes and basic breed features",
    IntValue: 50,
    Name: "Bronze Support",
    Position: 1,
  },
  {
    Active: true,
    Date: "2024-01-01",
    Description: "Enhanced breed features and dedicated support",
    IntValue: 150,
    Name: "Silver Support",
    Position: 2,
  },
  {
    Active: true,
    Date: "2024-01-01",
    Description: "Advanced analytics and breeding tools",
    IntValue: 300,
    Name: "Gold Support",
    Position: 3,
  },
  {
    Active: true,
    Date: "2024-01-01",
    Description: "Premium features and priority development",
    IntValue: 500,
    Name: "Platinum Support",
    Position: 4,
  },
  {
    Active: true,
    Date: "2024-01-01",
    Description: "Full custom development and white-label options",
    IntValue: 1000,
    Name: "Diamond Support",
    Position: 5,
  },
];

const specialAchievements = achievements
  .slice(1)
  .sort((a, b) => (a.Position > b.Position ? -1 : 1));

const statisticsData = [
  {
    value: "2,450+",
    label: "Pet profiles",
    color: "from-purple-100",
    href: "/pets",
  },
  {
    value: "180+",
    label: "Kennels",
    color: "from-blue-100",
    href: "/kennels",
  },
  {
    value: "120+",
    label: "Events",
    color: "from-orange-100",
    href: "/events",
  },
];

export default function Landing() {
  usePageTitle("Home");
  const location = useLocation();

  const [openTab, setOpenTab] = useState(1);
  const [openBreedTab, setOpenBreedTab] = useState(1);

  // Scroll to top when navigating to this page
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // Preload critical images for better performance
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.href = PetSpaceImage;
    document.head.appendChild(link);

    return () => {
      document.head.removeChild(link);
    };
  }, []);

  // Prepare tabs content for first tabs section
  const mainTabs = [
    {
      value: 1,
      label: "Pedigree",
      content: (
        <>
          <div className="order-2 flex flex-col space-y-8 xl:order-1">
            <p className="mt-8 text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-tight">
              <span className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-600 bg-clip-text text-transparent">
                Common data in a
              </span>{" "}
              <span className="bg-gradient-to-r from-primary-500 to-accent-500 bg-clip-text text-transparent">
                convenient
              </span>{" "}
              <span className="bg-gradient-to-r from-slate-600 via-slate-700 to-slate-800 bg-clip-text text-transparent">
                format
              </span>
            </p>
            <p className="text-lg leading-relaxed tracking-wide">
              View and change the pedigree of your pet from any device. We've
              made it comfortable for you.
              <br />
              <br />
              The convenient format of all data is in your hands. Add or edit
              data is fast and easy.
            </p>
          </div>
          <div className="order-1 h-[400px] min-w-[50%] overflow-hidden rounded-2xl border xl:order-2">
            <img
              className="h-full w-full object-cover"
              src={PetSpaceImage}
              alt="Pedigree management interface"
              loading="lazy"
            />
          </div>
        </>
      ),
    },
    {
      value: 2,
      label: "Site",
      content: (
        <>
          <div className="order-2 flex flex-col space-y-8 xl:order-1">
            <p className="mt-8 text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-tight">
              <span className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-600 bg-clip-text text-transparent">
                Fantastic site for your kennel with
              </span>{" "}
              <span className="bg-gradient-to-r from-primary-500 to-accent-500 bg-clip-text text-transparent">
                up-to-date
              </span>{" "}
              <span className="bg-gradient-to-r from-slate-600 via-slate-700 to-slate-800 bg-clip-text text-transparent">
                information on it
              </span>
            </p>
            <p className="text-lg leading-relaxed tracking-wide">
              Save your time and effort. Your site is{" "}
              <span className="decoration-primary-400 underline decoration-2">
                here
              </span>{" "}
              already!
              <br />
              Change different styles of your site or make your one. Control
              what public data you want to show. Manage your site quickly and
              easily.
            </p>
          </div>
          <div className="order-1 h-[400px] min-w-[50%] overflow-hidden rounded-2xl border xl:order-2">
            <img
              className="h-full w-full object-cover"
              src={KennelSpaceImage}
              alt="Kennel website management"
              loading="lazy"
            />
          </div>
        </>
      ),
    },
    {
      value: 3,
      label: "Kennel",
      content: (
        <>
          <div className="order-2 flex flex-col space-y-8 xl:order-1">
            <p className="mt-8 text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-tight">
              <span className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-600 bg-clip-text text-transparent">
                Your breeding work is the
              </span>{" "}
              <span className="bg-gradient-to-r from-primary-500 to-accent-500 bg-clip-text text-transparent">
                foundation
              </span>
            </p>
            <p className="text-lg leading-relaxed tracking-wide">
              Manage your breeding work in one app. Make less iterative manual
              work and routine. We stand for saving your time for more
              interesting and important work - breeding.
            </p>
          </div>
          <div className="order-1 h-[400px] min-w-[50%] overflow-hidden rounded-2xl border xl:order-2">
            <img
              className="h-full w-full object-cover"
              src={BreedSpaceImage}
              alt="Breeding work management"
              loading="lazy"
            />
          </div>
        </>
      ),
    },
  ];

  return (
    <LandingLayout>
      <style>{`
        /* Active tab button styles */
        .active-tab-button:hover:not(:disabled) {
          background-color: transparent !important;
          background: transparent !important;
        }
        
        .active-tab-button:focus:not(:disabled) {
          background-color: transparent !important;
          background: transparent !important;
          outline: none !important;
          box-shadow: none !important;
        }
        
        .active-tab-button:active:not(:disabled) {
          background-color: transparent !important;
          background: transparent !important;
        }
        
        /* Preserve border-bottom for active tabs */
        .active-tab-button.border-primary {
          border-bottom-color: rgb(var(--primary-500)) !important;
        }
        
        .active-tab-button.border-pink-600 {
          border-bottom-color: rgb(var(--pink-600)) !important;
        }
        
        /* Preserve border color on hover for active tabs */
        .active-tab-button.border-primary:hover:not(:disabled) {
          border-bottom-color: rgb(var(--primary-500)) !important;
        }
        
        .active-tab-button.border-pink-600:hover:not(:disabled) {
          border-bottom-color: rgb(var(--pink-600)) !important;
        }
        
        /* Specific styles for active tabs */
        .active-tab-button {
          background-color: transparent !important;
          background: transparent !important;
        }
      `}</style>
      <div className="relative flex w-full min-w-[100vw] flex-col items-center justify-center overflow-hidden">
        {/* SVG/фон */}
        <div className="right-[-30vw] top-[-13vw] w-full md:right-[-47vw] md:top-[-17vw] xxl:top-[-25vw] xxxl:top-[-32vw] absolute">
          <LandingFigure style={{ width: "80%" }} />
        </div>
        {/* Page space */}
        <div className="max-w-11xl relative mt-24 flex w-full min-w-0 flex-auto flex-col items-center px-6 lg:px-40 sm:px-10 md:mt-32">
          {/* General info */}
          <div className="flex flex-col md:space-x-24 md:pl-24 md:flex-row md:border-l">
            <div className="order-2 flex w-[100%] flex-col justify-center space-y-10 md:order-1 md:w-[70%] sm:space-y-14">
              <div className="flex w-full flex-col">
                <h1 className="tracking-tight leading-tight">
                  Elevating
                  <span className="bg-gradient-to-r from-primary-500 to-accent-500 bg-clip-text text-transparent">
                    {" "}
                    professional{" "}
                  </span>
                  breeding
                </h1>
                <em className="text-secondary-600 mt-4 text-lg tracking-wide leading-relaxed">
                  All necessary for a professional breeder in one app
                </em>
              </div>
              {/* Breeds rating */}
              <div className="text-secondary-600 flex flex-col">
                <p className="mb-5 font-semibold uppercase tracking-wider">
                  Top-supported breeds
                </p>
                {topAchievementBreeds.slice(0, 3).map((breed, i) => (
                  <BreedProgress breed={breed} key={i} mode="row" />
                ))}
              </div>
              {/* Action button */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <LoadingButton
                  to="/pricing"
                  className="landing-raised-button landing-raised-button-pink px-10 py-4 text-lg min-w-[180px]"
                  loadingText="Getting started..."
                >
                  Start for Free
                </LoadingButton>
                <div className="flex items-center gap-2 text-sm text-secondary-600">
                  <svg
                    className="w-5 h-5 text-green-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>Free forever • No credit card required</span>
                </div>
              </div>
              {/* Benefits list */}
              <div className="flex flex-wrap gap-3 mt-8">
                <div className="flex items-center gap-2 text-sm text-secondary-600">
                  <svg
                    className="w-5 h-5 text-primary-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span>All-in-one platform</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-secondary-600">
                  <svg
                    className="w-5 h-5 text-primary-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span>No setup required</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-secondary-600">
                  <svg
                    className="w-5 h-5 text-primary-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span>Cancel anytime</span>
                </div>
              </div>
            </div>
            {/* Image */}
            <div className="order-1 mb-10 flex h-auto w-full overflow-hidden rounded-2xl shadow-xl transition-shadow duration-300 hover:shadow-2xl md:order-2 md:mt-0 md:mb-0 group">
              <img
                className="min-h-[100%] min-w-[100%] shrink-0 object-cover transition-transform duration-700 group-hover:scale-105"
                src={PetSpaceImage}
                alt="Pet management dashboard"
                loading="eager"
              />
            </div>
          </div>

          {/* Key indicators */}
          <div className="mt-24 flex w-full flex-col items-center xl:flex-row md:mt-32">
            <div className="text-secondary-600 mb-8 shrink-0 text-start text-4xl font-semibold xl:mb-0 xl:mr-12">
              Best pet's knowledge base
            </div>
            <div className="grid w-full gap-3 md:grid-cols-3 sm:grid-cols-2">
              {statisticsData.map((stat, index) => (
                <div key={index}>
                  {stat.href ? (
                    <Link
                      to={stat.href}
                      className={`flex flex-col items-center rounded-l-full bg-gradient-to-r to-transparent px-4 py-3 transition-transform hover:scale-105 ${stat.color}`}
                    >
                      <span className="text-3xl font-bold">{stat.value}</span>
                      <span className="text-secondary-600 text-lg font-semibold uppercase">
                        {stat.label}
                      </span>
                    </Link>
                  ) : (
                    <div
                      className={`flex flex-col items-center rounded-l-full bg-gradient-to-r to-transparent px-4 py-3 ${stat.color}`}
                    >
                      <span className="text-3xl font-bold">{stat.value}</span>
                      <span className="text-secondary-600 text-lg font-semibold uppercase">
                        {stat.label}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Tabs — мобільна версія */}
          <ul
            className="mt-24 flex list-none overflow-x-auto scrollbar-hide md:hidden"
            role="tablist"
          >
            <li>
              <TabHeader
                value={1}
                name="Pedigree"
                activeTab={openTab}
                onTabChange={setOpenTab}
                isFirst={true}
              />
            </li>
            <li>
              <TabHeader
                value={2}
                name="Site"
                activeTab={openTab}
                onTabChange={setOpenTab}
              />
            </li>
            <li>
              <TabHeader
                value={3}
                name="Kennel"
                activeTab={openTab}
                onTabChange={setOpenTab}
                isLast={true}
              />
            </li>
          </ul>
          {/* Tabs — десктоп */}
          <div className="border-primary-50 mt-10 flex w-full flex-col overflow-hidden rounded-[3rem] border bg-purple-50/50 pt-8 shadow-xl shadow-slate-300 md:mt-24 sm:pt-12 xl:pt-16">
            <div className="px-8 pb-8 md:px-20 sm:px-10 sm:pb-10 xl:px-32 xl:pb-16">
              <ul
                className="hidden w-[50%] list-none flex-wrap pb-4 pt-3 md:flex"
                role="tablist"
              >
                <li>
                  <TabHeader
                    value={1}
                    name="Pedigree"
                    activeTab={openTab}
                    onTabChange={setOpenTab}
                    isFirst={true}
                  />
                </li>
                <li>
                  <TabHeader
                    value={2}
                    name="Site"
                    activeTab={openTab}
                    onTabChange={setOpenTab}
                  />
                </li>
                <li>
                  <TabHeader
                    value={3}
                    name="Kennel"
                    activeTab={openTab}
                    onTabChange={setOpenTab}
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
                    openTab !== 1 ? "hidden" : "flex flex-col xl:flex-row"
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
                      Create, manage, and share detailed pedigrees with just a
                      few clicks. Access your complete breeding history from any
                      device, anytime.
                      <br />
                      <br />
                      Track bloodlines, health records, and achievements in one
                      centralized platform designed for serious breeders.
                    </p>
                  </div>
                  <div className="order-1 h-[400px] min-w-[50%] overflow-hidden rounded-2xl border shadow-lg transition-shadow duration-300 hover:shadow-xl xl:order-2 group">
                    <img
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      src={PetSpaceImage}
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
                    openTab !== 2 ? "hidden" : "flex flex-col xl:flex-row"
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
                      Get a professional website for your kennel in minutes.
                      Choose from beautiful templates or customize your own
                      design.
                      <br />
                      <br />
                      Showcase your dogs, upcoming litters, and achievements.
                      Control exactly what information you share with the
                      public.
                    </p>
                  </div>
                  <div className="order-1 h-[400px] min-w-[50%] overflow-hidden rounded-2xl border shadow-lg transition-shadow duration-300 hover:shadow-xl xl:order-2 group">
                    <img
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      src={KennelSpaceImage}
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
                    openTab !== 3 ? "hidden" : "flex flex-col xl:flex-row"
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
                      puppies. Track heat cycles, manage matings, and monitor
                      litter progress all in one place.
                      <br />
                      <br />
                      Spend less time on paperwork and more time doing what you
                      love.
                    </p>
                  </div>
                  <div className="order-1 h-[400px] min-w-[50%] overflow-hidden rounded-2xl border shadow-lg transition-shadow duration-300 hover:shadow-xl xl:order-2 group">
                    <img
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      src={BreedSpaceImage}
                      alt="Breeding work management"
                      loading="lazy"
                    />
                  </div>
                </div>
              </div>
              {/* Action button */}
              <LoadingButton
                to="/product"
                className="landing-raised-button landing-raised-button-primary mt-3 min-w-[180px] px-6 sm:mt-5 xl:mt-0"
                loadingText="Loading features..."
              >
                See All Features
              </LoadingButton>
            </div>
            <div className="bg-primary-100/50 w-full py-14"></div>
          </div>

          {/* Top breeds by rating */}
          <div className="mt-32 max-w-screen mb-10 w-full lg:px-0 md:max-w-4xl md:px-6 sm:px-10 md:mt-40">
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
            className="mt-32 flex list-none overflow-x-auto scrollbar-hide md:hidden md:mt-40"
            role="tablist"
          >
            <li>
              <TabHeader
                value={1}
                name="Breed's rating"
                activeTab={openBreedTab}
                onTabChange={setOpenBreedTab}
                variant="pink"
                isFirst={true}
                idPrefix="-breed"
              />
            </li>
            <li>
              <TabHeader
                value={2}
                name="Breed's goals"
                activeTab={openBreedTab}
                onTabChange={setOpenBreedTab}
                variant="pink"
                idPrefix="-breed"
              />
            </li>
            <li>
              <TabHeader
                value={3}
                name="Breed's support level"
                activeTab={openBreedTab}
                onTabChange={setOpenBreedTab}
                variant="pink"
                isLast={true}
                idPrefix="-breed"
              />
            </li>
          </ul>
          <div className="mt-10 flex w-full flex-col rounded-[3rem] border border-pink-100 bg-pink-50/50 px-8 pb-24 pt-8 shadow-xl shadow-slate-300 md:mt-24 md:px-20 sm:px-10 sm:pt-12 xl:px-32 xl:pt-16">
            <ul
              className="hidden w-[70%] list-none flex-wrap pb-4 pt-3 md:flex xl:w-[65%]"
              role="tablist"
            >
              <li>
                <TabHeader
                  value={1}
                  name="Breed's rating"
                  activeTab={openBreedTab}
                  onTabChange={setOpenBreedTab}
                  variant="pink"
                  isFirst={true}
                  idPrefix="-breed"
                />
              </li>
              <li>
                <TabHeader
                  value={2}
                  name="Breed's goals"
                  activeTab={openBreedTab}
                  onTabChange={setOpenBreedTab}
                  variant="pink"
                  idPrefix="-breed"
                />
              </li>
              <li>
                <TabHeader
                  value={3}
                  name="Breed's support level"
                  activeTab={openBreedTab}
                  onTabChange={setOpenBreedTab}
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
                  openBreedTab !== 1 ? "hidden" : "flex flex-col xl:flex-row"
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
                  openBreedTab !== 2 ? "hidden" : "flex flex-col xl:flex-row"
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
                    Every contribution counts towards reaching the next
                    milestone and enhancing the platform for all breed
                    enthusiasts.
                  </p>
                </div>

                {/* Goals info */}
                <div className="order-1 relative flex h-[500px] min-w-[50%] flex-col rounded-2xl border bg-white shadow-lg transition-shadow duration-300 hover:shadow-xl xl:order-2">
                  <div className="h-full overflow-auto p-8">
                    {/* Header */}
                    <div className="grid grid-cols-[42px_auto] sm:grid-cols-[104px_auto] items-center gap-3 border-b pb-2 font-semibold">
                      <div className="hidden text-center sm:block">
                        $ per month *
                      </div>
                      <div className="text-center sm:hidden">$ *</div>
                      <div>Goals</div>
                    </div>

                    <div className="flex space-x-3">
                      <div className="hidden space-x-2 sm:flex">
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
                      <div className="grid grid-cols-[42px_auto] sm:grid-cols-[52px_auto] grid-rows-[94px_94px_82px_132px_122px] sm:grid-rows-[76px_76px_76px_96px_76px] md:grid-rows-[56px_56px_56px_56px_56px] items-center pt-3">
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
                  openBreedTab !== 3 ? "hidden" : "flex flex-col xl:flex-row"
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
                    We believe in rewarding active communities. Our six-tier
                    support system ensures that breeds with the most{" "}
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
                <div className="order-1 relative flex h-[500px] w-full flex-col rounded-2xl border bg-gray-50 shadow-lg transition-shadow duration-300 hover:shadow-xl xl:order-2 xl:min-w-[50%]">
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
                  <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-gray-50 to-transparent pointer-events-none rounded-b-2xl"></div>
                </div>
              </div>
            </div>

            {/* Action button */}
            <LoadingButton
              to="/breeds"
              className="landing-raised-button landing-raised-button-pink mt-3 w-fit px-6 sm:mt-5 xl:mt-0"
              loadingText="Loading breeds..."
            >
              Choose Your Breed
            </LoadingButton>
            <div className="mt-6 w-full rounded-full bg-pink-100 py-1 sm:mt-8 xl:mt-10"></div>
          </div>

          {/* Call to Action Section */}
          <div className="mt-32 mb-20 w-full md:mt-40">
            <div className="relative overflow-hidden rounded-3xl">
              <div className="absolute inset-0 bg-gradient-to-br from-primary-500 to-accent-500 opacity-90"></div>

              {/* Background SVG Pattern */}
              <div className="absolute inset-0 opacity-10">
                <LandingFigure className="absolute -right-1/4 -top-1/4 w-full h-full transform rotate-12" />
                <LandingFigure className="absolute -left-1/4 -bottom-1/4 w-full h-full transform -rotate-12" />
              </div>

              <div className="relative z-10 p-16 text-center md:p-20 lg:p-24">
                {/* Icon */}
                <div className="mb-6 inline-flex items-center justify-center w-20 h-20 bg-white/20 rounded-full backdrop-blur-sm shadow-md">
                  <svg
                    className="w-10 h-10 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                    />
                  </svg>
                </div>

                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-8 tracking-tight leading-tight">
                  Ready to start your breeding journey?
                </h2>
                <p className="text-xl text-white/90 mb-12 max-w-2xl mx-auto leading-relaxed tracking-wide">
                  Join thousands of professional breeders who trust BreedHub to
                  manage their breeding programs efficiently.
                </p>
                <div className="flex justify-center items-center gap-4">
                  <LoadingButton
                    to="/pricing"
                    className="group landing-cta-button landing-cta-button-primary"
                    loadingText="Getting started..."
                  >
                    <span className="text-lg">Start for Free</span>
                    <svg
                      className="w-5 h-5 group-hover:translate-x-1 transition-transform"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 8l4 4m0 0l-4 4m4-4H3"
                      />
                    </svg>
                  </LoadingButton>
                  <Link to="/product">
                    <button className="group landing-cta-button landing-cta-button-outline">
                      <span className="text-lg">Learn More</span>
                      <svg
                        className="w-5 h-5 group-hover:translate-x-1 transition-transform"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </LandingLayout>
  );
}
