import LandingFigure from "@/assets/backgrounds/landing-figure.svg?react";
import BreedSpaceImage from "@/assets/images/breed-space.jpeg";
import KennelSpaceImage from "@/assets/images/kennel-space.jpeg";
import PetSpaceImage from "@/assets/images/pet-space.jpeg";
import { AchievementsSection } from "@/components/sections/AchievementsSection";
import { BreedProgressSection } from "@/components/sections/BreedProgressSection";
import { CtaSection } from "@/components/sections/CtaSection";
import { HeroSection } from "@/components/sections/HeroSection";
import { StatisticsSection } from "@/components/sections/StatisticsSection";
// Mock data - replace with API calls when ready
import {
  achievements,
  specialAchievements,
  statisticsData,
  topAchievementBreeds,
  topRatingBreeds,
} from "@/constants/landingMockData";
import { usePageTitle } from "@/hooks/usePageTitle";
import LandingLayout from "@/layouts/LandingLayout";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

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
        <div className="right-[-30vw] top-[-13vw] w-full md:right-[-47vw] md:top-[-17vw] lg:right-[-28vw] lg:top-[-26vw] 2xl:right-[-35vw] xxl:top-[-25vw] 3xl:top-[-32vw] absolute">
          <LandingFigure className="w-[100%] lg:w-[90%] 2xl:w-[80%]" />
        </div>
        {/* Page space */}
        <div className="max-w-11xl relative mt-24 flex w-full min-w-0 flex-auto flex-col items-center px-6 md:px-10 lg:px-20 xl:px-28 lg:mt-32">
          {/* General info */}
          <HeroSection
            petSpaceImage={PetSpaceImage}
            topAchievementBreeds={topAchievementBreeds}
          />

          {/* Key indicators */}
          <StatisticsSection statisticsData={statisticsData} />

          <BreedProgressSection
            activeTab={openTab}
            breedSpaceImage={BreedSpaceImage}
            kennelSpaceImage={KennelSpaceImage}
            onTabChange={setOpenTab}
            petSpaceImage={PetSpaceImage}
          />

          <AchievementsSection
            achievements={achievements}
            activeTab={openBreedTab}
            onTabChange={setOpenBreedTab}
            specialAchievements={specialAchievements}
            topAchievementBreeds={topAchievementBreeds}
            topRatingBreeds={topRatingBreeds}
          />

          {/* Call to Action Section */}
          <CtaSection FigureComponent={LandingFigure} />
        </div>
      </div>
    </LandingLayout>
  );
}
