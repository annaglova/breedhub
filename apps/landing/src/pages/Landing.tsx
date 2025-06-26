import LandingFigure from "@/assets/landing-figure.svg?react";

import { useState } from "react";

// Заглушки для даних. Замінюй на API чи store, коли треба
const topAchievementBreeds = [
  { name: "Labrador" },
  { name: "Pug" },
  { name: "Shiba" },
];
const topRatingBreeds = [
  { name: "Beagle" },
  { name: "Boxer" },
  { name: "Bulldog" },
];
const achievements = [
  { Name: "First Level", IntValue: 100, Description: "Description for first" },
  { Name: "Second Level", IntValue: 300, Description: "Second desc" },
];
const specialAchivenmentns = [
  { IntValue: 50, Description: "First goal" },
  { IntValue: 100, Description: "Second goal" },
];

export default function Landing() {
  // Tabs for main and breeds section
  const [openTab, setOpenTab] = useState(1);
  const [openBreedTab, setOpenBreedTab] = useState(1);

  // Tab Header Component
  const TabHeader = ({ value, tabForm, name }: any) => (
    <div className="mr-2 flex shrink-0 text-center last:mr-0">
      <button
        className={`block px-5 py-3 font-bold uppercase leading-normal ${
          (tabForm === 1 ? openTab : openBreedTab) === value
            ? "text-primary border-b-2 border-primary"
            : "text-slate-400"
        }`}
        tabIndex={0}
        onClick={() =>
          tabForm === 2 ? setOpenBreedTab(value) : setOpenTab(value)
        }
      >
        {name}
      </button>
    </div>
  );

  // BreedProgress (заглушка, підключиш потім)
  const BreedProgress = ({ breed, mode }: any) => (
    <div className="mt-1">
      {/* breed.name або твій компонент */}
      {breed.name}
    </div>
  );

  // Footer (заглушка, підключиш потім)
  const Footer = () => (
    <footer className="p-8 text-center text-slate-400">Footer</footer>
  );

  return (
    <div className="pb-26 relative flex w-full min-w-[100vw] flex-col items-center justify-center overflow-hidden bg-white">
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
              {topAchievementBreeds.slice(0, 3).map((item, i) => (
                <BreedProgress breed={item} key={i} mode="row" />
              ))}
            </div>
            {/* Action button */}
            <div className="flex items-center space-x-3">
              <a href="/pricing">
                <button
                  type="button"
                  className="w-36 rounded-xl bg-pink-500 px-6 py-4 font-bold leading-tight text-white shadow-lg shadow-pink-300 transition duration-150 ease-in-out active:bg-pink-700 active:shadow-xl active:shadow-pink-300 focus:bg-pink-600 focus:shadow-xl focus:shadow-pink-300 hover:bg-pink-600 hover:shadow-xl hover:shadow-pink-300"
                >
                  Get Started
                </button>
              </a>
              <div className="text-sm font-bold uppercase text-slate-300">
                <p>Free forever</p>
                <p>No credit card</p>
              </div>
            </div>
          </div>
          {/* Image */}
          <div className="order-1 mb-6 flex h-auto w-full overflow-hidden rounded-2xl shadow-xl md:order-2 md:mt-0">
            <img
              className="min-h-[100%] min-w-[100%] shrink-0"
              src="https://mdbootstrap.com/img/new/standard/city/047.jpg"
              alt="City view"
            />
          </div>
        </div>

        {/* Key indicators */}
        <div className="mt-18 flex w-full flex-col items-center xl:flex-row">
          <div className="text-secondary mb-6 shrink-0 text-start text-4xl font-semibold xl:mb-0 xl:mr-6">
            Best pet's knowledge base
          </div>
          <div className="grid w-full gap-3 md:grid-cols-3 sm:grid-cols-2">
            {/* Заглушки замість ng-template */}
            <a
              href="/pets"
              className="flex flex-col items-center rounded-l-full bg-gradient-to-r to-transparent px-4 py-3 from-purple-100"
            >
              <span className="text-3xl">1000</span>
              <span className="text-secondary text-lg font-semibold uppercase">
                Pet profiles
              </span>
            </a>
            <a
              href="/kennels"
              className="flex flex-col items-center rounded-l-full bg-gradient-to-r to-transparent px-4 py-3 from-blue-100"
            >
              <span className="text-3xl">250</span>
              <span className="text-secondary text-lg font-semibold uppercase">
                Kennels
              </span>
            </a>
            <a
              href="/events"
              className="flex flex-col items-center rounded-l-full bg-gradient-to-r to-transparent px-4 py-3 from-orange-100"
            >
              <span className="text-3xl">36</span>
              <span className="text-secondary text-lg font-semibold uppercase">
                Events
              </span>
            </a>
          </div>
        </div>

        {/* Tabs — мобільна версія */}
        <ul className="mt-18 flex list-none overflow-x-auto md:hidden">
          <li>
            <TabHeader value={1} tabForm={1} name="Pedigree" />
          </li>
          <li>
            <TabHeader value={2} tabForm={1} name="Site" />
          </li>
          <li>
            <TabHeader value={3} tabForm={1} name="Kennel" />
          </li>
        </ul>
        {/* Tabs — десктоп */}
        <div className="border-primary-50 mt-6 flex w-full flex-col overflow-hidden rounded-[3rem] border bg-purple-50/50 pt-6 shadow-md shadow-slate-200 md:mt-18 sm:pt-8 xl:pt-16">
          <div className="px-6 pb-6 md:px-18 sm:px-8 sm:pb-8 xl:px-32 xl:pb-12">
            <ul className="hidden w-[50%] list-none flex-wrap pb-4 pt-3 md:flex">
              <li>
                <TabHeader value={1} tabForm={1} name="Pedigree" />
              </li>
              <li>
                <TabHeader value={2} tabForm={1} name="Site" />
              </li>
              <li>
                <TabHeader value={3} tabForm={1} name="Kennel" />
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
                <div className="oreder-1 h-auto min-w-[50%] overflow-hidden rounded-2xl border shadow-lg xl:order-2">
                  <img
                    className="min-h-[100%] min-w-[100%] shrink-0"
                    src="https://mdbootstrap.com/img/new/standard/city/047.jpg"
                    alt="City view"
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
                    <span className="text-primary">up-to-date</span> information
                    on it
                  </p>
                  <p className="text-lg leading-8">
                    Save your time and effort. Your site is{" "}
                    <span className="decoration-primary-400 underline decoration-2">
                      here
                    </span>{" "}
                    already!
                    <br />
                    Change different styles of your site or make your one.
                    Control what public data you want to show. Manage your site
                    quickly and easily.
                  </p>
                </div>
                <div className="oreder-1 h-auto w-full overflow-hidden rounded-2xl xl:order-2">
                  <img
                    className="min-h-[100%] min-w-[100%] shrink-0"
                    src="https://mdbcdn.b-cdn.net/img/new/standard/city/041.webp"
                    alt="City view"
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
                <div className="oreder-1 h-auto w-full overflow-hidden rounded-2xl xl:order-2">
                  <img
                    className="min-h-[100%] min-w-[100%] shrink-0"
                    src="https://mdbcdn.b-cdn.net/img/new/standard/city/042.webp"
                    alt="City view"
                  />
                </div>
              </div>
            </div>
            {/* Action button */}
            <a href="/pricing">
              <button
                type="button"
                className="bg-primary-400 shadow-primary-300 mt-3 w-36 rounded-xl px-6 py-4 font-bold leading-tight text-white shadow-lg transition duration-150 ease-in-out active:bg-primary-600 active:shadow-primary-300 active:shadow-xl focus:bg-primary focus:shadow-primary-300 focus:shadow-xl hover:bg-primary hover:shadow-primary-300 hover:shadow-xl sm:mt-5 xl:mt-0"
              >
                Get Started
              </button>
            </a>
          </div>
          <div className="bg-primary-100/50 w-full py-10"></div>
        </div>

        {/* Top breeds by rating */}
        <div className="mt-22 max-w-screen mb-5 w-full lg:px-0 md:max-w-4xl md:px-6 sm:px-10">
          <div className="text-secondary mb-6 w-full text-center text-4xl font-semibold xl:mb-0 xl:mr-6">
            Top Breeds by Pets Profiles
          </div>
          {topRatingBreeds.slice(0, 5).map((item, i) => (
            <BreedProgress breed={item} key={i} simpleView={false} />
          ))}
        </div>

        {/* Далі таби і секції для Breed Promotion, все аналогічно як вище */}
        {/* ... скорочено для першої ітерації, можна винести таби у окремий компонент */}
      </div>
      {/* Footer */}
      <Footer />
    </div>
  );
}
