import LandingFigure from "@/assets/backgrounds/landing-figure.svg?react";
import BreedSpaceImage from "@/assets/images/breed-space.jpeg";
import KennelSpaceImage from "@/assets/images/kennel-space.jpeg";
import PetSpaceImage from "@/assets/images/pet-space.jpeg";
import { BreedProgress, type Breed } from "@/components/BreedProgress";
import Footer from "@/components/Footer";
import {
  Timeline,
  TimelineContent,
  TimelineItem,
} from "@ui/components/timeline";
import { useState } from "react";
import { Link } from "react-router-dom";

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
    value: "850+",
    label: "Breeding records",
    color: "from-green-100",
  },
  {
    value: "120+",
    label: "Events",
    color: "from-orange-100",
    href: "/events",
  },
  {
    value: "45+",
    label: "Breeds supported",
    color: "from-pink-100",
    href: "/breeds",
  },
  {
    value: "320+",
    label: "Litters tracked",
    color: "from-indigo-100",
    href: "/litters",
  },
];

// Tab Header Component
interface TabHeaderProps {
  value: number;
  tabForm: number;
  name: string;
  activeTab: number;
  onTabChange: (value: number) => void;
}

function TabHeader({
  value,
  tabForm,
  name,
  activeTab,
  onTabChange,
}: TabHeaderProps) {
  return (
    <div className="mr-2 flex shrink-0 text-center last:mr-0">
      <button
        className={`block px-5 py-3 font-bold uppercase leading-normal transition-colors ${
          activeTab === value
            ? "text-primary border-b-2 border-primary"
            : "text-slate-400 hover:text-slate-600"
        }`}
        onClick={() => onTabChange(value)}
      >
        {name}
      </button>
    </div>
  );
}

export default function Landing() {
  // Tabs for main and breeds section
  const [openTab, setOpenTab] = useState(1);
  const [openBreedTab, setOpenBreedTab] = useState(1);

  return (
    <>
      <style>{`
        .customized-timeline .space-y-1 {
          padding: 0 0 5px 1rem !important;
        }
      `}</style>
      <div className="pb-20 relative flex w-full min-w-[100vw] flex-col items-center justify-center overflow-hidden">
        {/* SVG/фон */}
        <div className="right-[-30vw] top-[-13vw] w-full md:right-[-47vw] md:top-[-17vw] xxl:top-[-25vw] xxxl:top-[-32vw] absolute">
          <LandingFigure style={{ width: "80%" }} />
          {/* <LandingFigure className="w-4/5" /> */}
        </div>
        {/* Header */}
        <div className="z-49 max-w-11xl flex h-16 w-full items-center px-6 lg:px-40 sm:h-20 sm:px-10 xxl:px-60"></div>
        {/* Page space */}
        <div className="max-w-11xl relative mt-8 flex w-full min-w-0 flex-auto flex-col items-center px-6 lg:px-40 sm:px-10">
          {/* General info */}
          <div className="flex flex-col md:space-x-18 md:pl-22 md:flex-row md:border-l">
            <div className="order-2 flex w-[100%] flex-col justify-center space-y-8 md:order-1 md:w-[70%] sm:space-y-12">
              <div className="flex w-full flex-col">
                <p className="font-mono text-5xl font-extrabold tracking-wider md:text-6xl xl:text-7xl">
                  United by the popularization of
                  <span className="text-primary"> professional </span>
                  breeding
                </p>
                <em className="text-secondary mt-2">
                  All necessary for a professional breeder in one app
                </em>
              </div>
              {/* Breeds rating */}
              <div className="text-secondary flex flex-col">
                <p className="mb-5 font-semibold uppercase">
                  Top-supported breeds
                </p>
                {topAchievementBreeds.slice(0, 3).map((breed, i) => (
                  <BreedProgress breed={breed} key={i} mode="row" />
                ))}
              </div>
              {/* Action button */}
              <div className="flex items-center space-x-3">
                <Link to="/pricing">
                  <button
                    type="button"
                    className="w-36 rounded-xl bg-pink-500 px-6 py-4 font-bold leading-tight text-white shadow-lg shadow-pink-300 transition duration-150 ease-in-out active:bg-pink-700 active:shadow-xl active:shadow-pink-300 focus:bg-pink-600 focus:shadow-xl focus:shadow-pink-300 hover:bg-pink-600 hover:shadow-xl hover:shadow-pink-300"
                  >
                    Get Started
                  </button>
                </Link>
                <div className="text-sm font-bold uppercase text-slate-300">
                  <p>Free forever</p>
                  <p>No credit card</p>
                </div>
              </div>
            </div>
            {/* Image */}
            <div className="order-1 mb-6 flex h-auto w-full overflow-hidden rounded-2xl shadow-xl md:order-2 md:mt-0">
              <img
                className="min-h-[100%] min-w-[100%] shrink-0 object-cover"
                src={PetSpaceImage}
                alt="Pet management dashboard"
              />
            </div>
          </div>

          {/* Key indicators */}
          <div className="mt-18 flex w-full flex-col items-center xl:flex-row">
            <div className="text-secondary mb-6 shrink-0 text-start text-4xl font-semibold xl:mb-0 xl:mr-6">
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
                      <span className="text-secondary text-lg font-semibold uppercase">
                        {stat.label}
                      </span>
                    </Link>
                  ) : (
                    <div
                      className={`flex flex-col items-center rounded-l-full bg-gradient-to-r to-transparent px-4 py-3 ${stat.color}`}
                    >
                      <span className="text-3xl font-bold">{stat.value}</span>
                      <span className="text-secondary text-lg font-semibold uppercase">
                        {stat.label}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Tabs — мобільна версія */}
          <ul className="mt-18 flex list-none overflow-x-auto md:hidden">
            <li>
              <TabHeader
                value={1}
                tabForm={1}
                name="Pedigree"
                activeTab={openTab}
                onTabChange={setOpenTab}
              />
            </li>
            <li>
              <TabHeader
                value={2}
                tabForm={1}
                name="Site"
                activeTab={openTab}
                onTabChange={setOpenTab}
              />
            </li>
            <li>
              <TabHeader
                value={3}
                tabForm={1}
                name="Kennel"
                activeTab={openTab}
                onTabChange={setOpenTab}
              />
            </li>
          </ul>
          {/* Tabs — десктоп */}
          <div className="border-primary-50 mt-6 flex w-full flex-col overflow-hidden rounded-[3rem] border bg-purple-50/50 pt-6 shadow-md shadow-slate-200 md:mt-18 sm:pt-8 xl:pt-16">
            <div className="px-6 pb-6 md:px-18 sm:px-8 sm:pb-8 xl:px-32 xl:pb-12">
              <ul className="hidden w-[50%] list-none flex-wrap pb-4 pt-3 md:flex">
                <li>
                  <TabHeader
                    value={1}
                    tabForm={1}
                    name="Pedigree"
                    activeTab={openTab}
                    onTabChange={setOpenTab}
                  />
                </li>
                <li>
                  <TabHeader
                    value={2}
                    tabForm={1}
                    name="Site"
                    activeTab={openTab}
                    onTabChange={setOpenTab}
                  />
                </li>
                <li>
                  <TabHeader
                    value={3}
                    tabForm={1}
                    name="Kennel"
                    activeTab={openTab}
                    onTabChange={setOpenTab}
                  />
                </li>
              </ul>
              {/* Tab content */}
              <div className="flex w-full min-w-0 flex-col">
                {/* Tab 1 */}
                <div
                  className={`xl:space-x-10 ${
                    openTab !== 1 ? "hidden" : "flex flex-col xl:flex-row"
                  }`}
                >
                  <div className="order-2 flex flex-col space-y-8 xl:order-1">
                    <p className="mt-6 text-6xl font-semibold">
                      Common data in a{" "}
                      <span className="text-primary">convenient</span> format
                    </p>
                    <p className="text-lg leading-8">
                      View and change the pedigree of your pet from any device.
                      We've made it comfortable for you.
                      <br />
                      <br />
                      The convenient format of all data is in your hands. Add or
                      edit data is fast and easy.
                    </p>
                  </div>
                  <div className="order-1 h-auto min-w-[50%] overflow-hidden rounded-2xl border shadow-lg xl:order-2">
                    <img
                      className="min-h-[100%] min-w-[100%] shrink-0 object-cover"
                      src={PetSpaceImage}
                      alt="Pedigree management interface"
                    />
                  </div>
                </div>
                {/* Tab 2 */}
                <div
                  className={`xl:space-x-10 ${
                    openTab !== 2 ? "hidden" : "flex flex-col xl:flex-row"
                  }`}
                >
                  <div className="order-2 flex flex-col space-y-8 xl:order-1">
                    <p className="mt-6 text-6xl font-semibold">
                      Fantastic site for your kennel with{" "}
                      <span className="text-primary">up-to-date</span>{" "}
                      information on it
                    </p>
                    <p className="text-lg leading-8">
                      Save your time and effort. Your site is{" "}
                      <span className="decoration-primary-400 underline decoration-2">
                        here
                      </span>{" "}
                      already!
                      <br />
                      Change different styles of your site or make your one.
                      Control what public data you want to show. Manage your
                      site quickly and easily.
                    </p>
                  </div>
                  <div className="order-1 h-auto w-full overflow-hidden rounded-2xl xl:order-2">
                    <img
                      className="min-h-[100%] min-w-[100%] shrink-0 object-cover"
                      src={KennelSpaceImage}
                      alt="Kennel website management"
                    />
                  </div>
                </div>
                {/* Tab 3 */}
                <div
                  className={`xl:space-x-10 ${
                    openTab !== 3 ? "hidden" : "flex flex-col xl:flex-row"
                  }`}
                >
                  <div className="order-2 flex flex-col space-y-8 xl:order-1">
                    <p className="mt-6 text-6xl font-semibold">
                      Your breeding work is the{" "}
                      <span className="text-primary">foundation</span>
                    </p>
                    <p className="text-lg leading-8">
                      Manage your breeding work in one app. Make less iterative
                      manual work and routine. We stand for saving your time for
                      more interesting and important work - breeding.
                    </p>
                  </div>
                  <div className="order-1 h-auto w-full overflow-hidden rounded-2xl xl:order-2">
                    <img
                      className="min-h-[100%] min-w-[100%] shrink-0 object-cover"
                      src={BreedSpaceImage}
                      alt="Breeding work management"
                    />
                  </div>
                </div>
              </div>
              {/* Action button */}
              <Link to="/pricing">
                <button
                  type="button"
                  className="bg-primary-400 shadow-primary-300 mt-3 w-36 rounded-xl px-6 py-4 font-bold leading-tight text-white shadow-lg transition duration-150 ease-in-out active:bg-primary-600 active:shadow-primary-300 active:shadow-xl focus:bg-primary focus:shadow-primary-300 focus:shadow-xl hover:bg-primary hover:shadow-primary-300 hover:shadow-xl sm:mt-5 xl:mt-0"
                >
                  Get Started
                </button>
              </Link>
            </div>
            <div className="bg-primary-100/50 w-full py-10"></div>
          </div>

          {/* Top breeds by rating */}
          <div className="mt-22 max-w-screen mb-5 w-full lg:px-0 md:max-w-4xl md:px-6 sm:px-10">
            <div className="text-secondary mb-6 w-full text-center text-4xl font-semibold xl:mb-0 xl:mr-6">
              Top Breeds by Pet Profiles
            </div>
            <div className="space-y-3">
              {topRatingBreeds.slice(0, 5).map((breed, i) => (
                <BreedProgress breed={breed} key={i} simpleView={false} />
              ))}
            </div>
          </div>

          {/* Breed promotion */}
          <ul className="mt-18 flex list-none overflow-x-auto md:hidden">
            <li>
              <TabHeader
                value={1}
                tabForm={2}
                name="Breed's rating"
                activeTab={openBreedTab}
                onTabChange={setOpenBreedTab}
              />
            </li>
            <li>
              <TabHeader
                value={2}
                tabForm={2}
                name="Breed's goals"
                activeTab={openBreedTab}
                onTabChange={setOpenBreedTab}
              />
            </li>
            <li>
              <TabHeader
                value={3}
                tabForm={2}
                name="Breed's support level"
                activeTab={openBreedTab}
                onTabChange={setOpenBreedTab}
              />
            </li>
          </ul>
          <div className="mt-6 flex w-full flex-col rounded-[3rem] border border-pink-100 bg-pink-50/50 px-6 pb-20 pt-6 shadow-md shadow-slate-200 md:mt-18 md:px-18 sm:px-8 sm:pt-8 xl:px-32 xl:pt-16">
            <ul className="hidden w-[70%] list-none flex-wrap pb-4 pt-3 md:flex xl:w-[65%]">
              <li>
                <TabHeader
                  value={1}
                  tabForm={2}
                  name="Breed's rating"
                  activeTab={openBreedTab}
                  onTabChange={setOpenBreedTab}
                />
              </li>
              <li>
                <TabHeader
                  value={2}
                  tabForm={2}
                  name="Breed's goals"
                  activeTab={openBreedTab}
                  onTabChange={setOpenBreedTab}
                />
              </li>
              <li>
                <TabHeader
                  value={3}
                  tabForm={2}
                  name="Breed's support level"
                  activeTab={openBreedTab}
                  onTabChange={setOpenBreedTab}
                />
              </li>
            </ul>

            {/* Tab content */}
            <div className="flex w-full min-w-0 flex-col">
              {/* Tab 1 - Breed's rating */}
              <div
                className={`xl:space-x-10 ${
                  openBreedTab !== 1 ? "hidden" : "flex flex-col xl:flex-row"
                }`}
              >
                <div className="order-2 flex flex-col space-y-8 xl:order-1">
                  <p className="mt-6 text-6xl font-semibold">
                    Promote your favorite breed. Make it the{" "}
                    <span className="text-pink-600">top-supported</span> one
                  </p>
                  <p className="text-lg leading-8">
                    Stand for your breed - contribute to your breed's
                    development and promotion. The more Patreons (paid users) a
                    breed has - the more additional functional features and
                    privileges a breed has in your system.
                    <br />
                    <br />
                    You'll get our{" "}
                    <span className="underline decoration-pink-500 decoration-2">
                      professional/prime
                    </span>{" "}
                    product for your payment. And we'll get a response from you
                    - what breed we have to pay more attention to.
                  </p>
                </div>

                {/* Breeds rating */}
                <div className="order-1 text-secondary flex w-full min-w-[40%] flex-col items-end rounded-2xl border-slate-100 bg-white p-8 shadow-sm xl:order-2">
                  <p className="mb-3 font-semibold">Top-supported breeds</p>
                  {topAchievementBreeds.slice(0, 7).map((breed, i) => (
                    <div className="mt-3 flex w-full" key={i}>
                      <BreedProgress breed={breed} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Tab 2 - Breed's goals */}
              <div
                className={`xl:space-x-10 ${
                  openBreedTab !== 2 ? "hidden" : "flex flex-col xl:flex-row"
                }`}
              >
                <div className="order-2 flex flex-col space-y-8 xl:order-1">
                  <p className="mt-6 text-6xl font-semibold">
                    Main <span className="text-pink-600">goals</span> for a
                    breed
                  </p>
                  <p className="text-lg leading-8">
                    With each executed breed's goal, we open up new
                    opportunities for{" "}
                    <span className="underline decoration-pink-500 decoration-2">
                      all
                    </span>{" "}
                    members of the community in that breed.
                    <br />
                    <br />
                    The more interest per month you show closer the goal is.
                  </p>
                </div>

                {/* Goals info */}
                <div className="order-1 flex min-w-[60%] flex-col xl:order-2">
                  <div className="rounded-2xl border-slate-100 bg-white p-8 shadow-sm">
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
                  <p className="mt-3 text-sm">
                    * The table shows the <b>total amount per month</b> from the
                    breed's community
                  </p>
                </div>
              </div>

              {/* Tab 3 - Breed's support level */}
              <div
                className={`xl:space-x-10 ${
                  openBreedTab !== 3 ? "hidden" : "flex flex-col xl:flex-row"
                }`}
              >
                <div className="order-2 flex flex-col space-y-8 xl:order-1">
                  <p className="mt-6 text-6xl font-semibold">
                    Support <span className="text-pink-600">levels</span> for
                    the breeds
                  </p>
                  <p className="text-lg leading-8">
                    To be more{" "}
                    <span className="underline decoration-pink-500 decoration-2">
                      focused
                    </span>{" "}
                    on the needs of our active users, we have implemented six
                    levels of support. Each next level brings additional
                    features to breed users.
                    <br />
                    <br />
                    All breeds have{" "}
                    <span className="underline decoration-pink-500 decoration-2">
                      Zero support level
                    </span>{" "}
                    from the beginning. That means - using only common breed
                    functional without specific breed features and bug reports.
                  </p>
                </div>

                {/* Timeline info */}
                <div className="order-1 flex min-w-[65%] flex-col xl:order-2">
                  <div className="rounded-2xl border-slate-100 bg-white p-8 shadow-sm">
                    <Timeline className="customized-timeline">
                      {achievements.map((achievement, index) => (
                        <TimelineItem
                          key={achievement.Name}
                          dot={<i className="pi pi-check" />}
                          dotVariant="primary"
                          isLast={index === achievements.length - 1}
                        >
                          <TimelineContent>
                            <div className="flex flex-col px-5 py-3">
                              <div className="text-lg font-bold">
                                {achievement.Name}
                              </div>
                              <div className="text-secondary text-sm">
                                {achievement.IntValue} $ per month
                              </div>
                              <div className="">{achievement.Description}</div>
                            </div>
                          </TimelineContent>
                        </TimelineItem>
                      ))}
                    </Timeline>
                  </div>
                </div>
              </div>
            </div>

            {/* Action button */}
            <Link to="/pricing">
              <button
                type="button"
                className="mt-3 w-36 rounded-xl bg-pink-500 px-6 py-4 font-bold leading-tight text-white shadow-lg shadow-pink-300 transition duration-150 ease-in-out active:bg-pink-700 active:shadow-xl active:shadow-pink-300 focus:bg-pink-600 focus:shadow-xl focus:shadow-pink-300 hover:bg-pink-600 hover:shadow-xl hover:shadow-pink-300 sm:mt-5 xl:mt-0"
              >
                Get Started
              </button>
            </Link>
            <div className="mt-6 w-full rounded-full bg-pink-100 py-1 sm:mt-8 xl:mt-10"></div>
          </div>

          {/* Call to Action Section */}
          <div className="mt-20 mb-16 w-full text-center">
            <div className="bg-gradient-to-r from-primary-50 to-pink-50 rounded-3xl p-12">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                Ready to start your breeding journey?
              </h2>
              <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
                Join thousands of professional breeders who trust BreedHub to
                manage their breeding programs efficiently.
              </p>
              <div className="flex justify-center items-center space-x-4">
                <Link to="/pricing">
                  <button className="bg-primary-500 hover:bg-primary-600 text-white font-bold py-4 px-8 rounded-xl shadow-lg transition duration-200">
                    Get Started Free
                  </button>
                </Link>
                <Link to="/about">
                  <button className="border-2 border-primary-500 text-primary-500 hover:bg-primary-50 font-bold py-4 px-8 rounded-xl transition duration-200">
                    Learn More
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <Footer />
      </div>
    </>
  );
}
