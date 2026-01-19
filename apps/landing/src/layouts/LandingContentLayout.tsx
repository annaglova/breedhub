// apps/landing/src/layouts/LandingContentLayout.tsx
import LandingFigure from "@/assets/backgrounds/landing-figure.svg?react";
import LandingLayout from "@/layouts/LandingLayout";
import { ReactNode } from "react";

interface LandingContentLayoutProps {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  /** Wrap children in landing-content-card (default: true) */
  useContentCard?: boolean;
}

export default function LandingContentLayout({
  title,
  subtitle,
  children,
  useContentCard = true,
}: LandingContentLayoutProps) {
  return (
    <LandingLayout>
      <div className="pb-20 relative overflow-hidden">
        {/* Background container - 4/5 screen height, left aligned with content, right to edge */}
        <div className="absolute top-0 right-0 h-[80vh] -z-1 left-[max(1.5rem,calc(50%-30.5rem))] overflow-hidden">
          <LandingFigure
            className="absolute inset-0 w-full h-full"
            preserveAspectRatio="xMidYMax slice"
          />
        </div>

        <div className="flex flex-col items-center justify-center pt-14 sm:pt-32">
          <div className="landing-content-container">
            {/* Page header */}
            <div className="relative space-y-3 text-center">
              <h1 className="text-white tracking-tight leading-tight">{title}</h1>
              {subtitle && (
                <p className="text-2xl text-slate-600 xl:text-white max-w-3xl mx-auto mt-2 tracking-wide leading-relaxed">
                  {subtitle}
                </p>
              )}
            </div>
            {useContentCard ? (
              <div className="landing-content-card">{children}</div>
            ) : (
              children
            )}
          </div>
        </div>
      </div>
    </LandingLayout>
  );
}
