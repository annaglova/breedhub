import { BreedProgress, type Breed } from "@/components/BreedProgress";
import { LoadingButton } from "@/components/LoadingButton";

interface HeroSectionProps {
  petSpaceImage: string;
  topAchievementBreeds: Breed[];
}

export function HeroSection({
  petSpaceImage,
  topAchievementBreeds,
}: HeroSectionProps) {
  return (
    <div className="flex flex-col w-full 2xl:flex-row 2xl:space-x-16 2xl:pl-24 2xl:border-l">
      {/* Left column at 2xl, full width otherwise */}
      <div className="flex flex-col w-full 2xl:w-auto 2xl:flex-1">
        {/* Title - full width at lg/xl */}
        <div className="flex w-full flex-col order-2 lg:order-1">
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

        {/* Content row: left side + image at lg/xl, just content at 2xl */}
        <div className="flex flex-col lg:flex-row 2xl:flex-col lg:space-x-16 2xl:space-x-0 lg:mt-10 order-1 lg:order-2">
          {/* Left content: breeds, button, benefits */}
          <div className="order-2 lg:order-1 flex flex-col space-y-10 lg:w-[55%] 2xl:w-full">
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
            <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
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
            <div className="flex flex-wrap gap-3">
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
          {/* Image - visible up to xl, hidden at 2xl */}
          <div className="order-1 mb-10 lg:mb-0 2xl:hidden flex h-auto w-full lg:w-[45%] overflow-hidden rounded-2xl shadow-xl transition-shadow duration-300 hover:shadow-2xl group">
            <img
              className="min-h-[100%] min-w-[100%] shrink-0 object-cover transition-transform duration-700 group-hover:scale-105"
              src={petSpaceImage}
              alt="Pet management dashboard"
              loading="eager"
            />
          </div>
        </div>
      </div>

      {/* Image for 2xl only - appears as right column */}
      <div className="hidden 2xl:flex h-[500px] w-[45%] overflow-hidden rounded-2xl shadow-xl transition-shadow duration-300 hover:shadow-2xl group">
        <img
          className="min-h-[100%] min-w-[100%] shrink-0 object-cover transition-transform duration-700 group-hover:scale-105"
          src={petSpaceImage}
          alt="Pet management dashboard"
          loading="eager"
        />
      </div>
    </div>
  );
}
