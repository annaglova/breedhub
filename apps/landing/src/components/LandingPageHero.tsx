import LandingFigure from "@/assets/backgrounds/landing-figure.svg?react";
import { ReactNode } from "react";

interface LandingPageHeroProps {
  title: string | ReactNode;
  subtitle?: string | ReactNode;
  children?: ReactNode;
}

export default function LandingPageHero({
  title,
  subtitle,
  children,
}: LandingPageHeroProps) {
  return (
    <div className="relative overflow-hidden">
      {/* Background Figure - full width, no edges */}
      <div className="absolute top-0 left-0 right-0 bottom-0 flex items-center justify-center">
        <LandingFigure className="min-w-[150%] min-h-[150%]" />
      </div>

      {/* Content */}
      <div className="relative z-10 pt-14 pb-40 sm:pt-32 sm:pb-52">
        <div className="landing-content-container">
          <div className="text-center space-y-3">
            {typeof title === "string" ? (
              <h1 className="text-white tracking-tight leading-tight">
                {title}
              </h1>
            ) : (
              title
            )}
            {subtitle && (
              typeof subtitle === "string" ? (
                <p className="text-2xl text-white/90 max-w-3xl mx-auto mt-2 tracking-wide leading-relaxed">
                  {subtitle}
                </p>
              ) : (
                subtitle
              )
            )}
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
