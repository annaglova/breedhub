import { LoadingButton } from "@/components/LoadingButton";
import type { ComponentType } from "react";
import { Link } from "react-router-dom";

interface CtaSectionProps {
  FigureComponent: ComponentType<{ className?: string }>;
}

export function CtaSection({ FigureComponent }: CtaSectionProps) {
  return (
    <div className="mt-24 mb-20 w-full lg:mt-32">
      <div className="relative overflow-hidden rounded-3xl">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-500 to-accent-500 opacity-90"></div>

        {/* Background SVG Pattern */}
        <div className="absolute inset-0 opacity-10">
          <FigureComponent className="absolute -right-1/4 -top-1/4 w-full h-full transform rotate-12" />
          <FigureComponent className="absolute -left-1/4 -bottom-1/4 w-full h-full transform -rotate-12" />
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
            Join thousands of professional breeders who trust BreedHub to manage
            their breeding programs efficiently.
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
  );
}
