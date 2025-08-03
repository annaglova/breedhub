// landing/src/pages/About.tsx
import LandingFigure from "@/assets/backgrounds/landing-figure.svg?react";
import { usePageTitle } from "@/hooks/usePageTitle";
import LandingLayout from "@/layouts/LandingLayout";

export default function About() {
  usePageTitle("About Us");

  return (
    <LandingLayout>
      <div className="pb-20 relative overflow-hidden">
        {/* Background */}
        <div className="xxl:top-[-64vw] absolute right-[-7vw] top-[-23vw] w-full md:right-[-10vw] md:top-[-47vw] lg:top-[-59vw] -z-1">
          <LandingFigure style={{ width: "100vw" }} />
        </div>

        <div className="flex flex-col items-center justify-center pt-14 sm:pt-32">
          <div className="landing-content-container">
            {/* Page header */}
            <div className="relative space-y-3 text-center">
              <h1 className="text-white tracking-tight leading-tight">Hello, from the Breedhub team!</h1>
              <p className="text-2xl text-gray-600 xl:text-white max-w-3xl mx-auto mt-2 tracking-wide leading-relaxed">
                We're passionate breeders and developers united by a common
                mission - making professional breeding accessible and enjoyable
                for everyone
              </p>
            </div>
            <div className="landing-content-card">
              <p className="leading-relaxed tracking-wide">
                We are a team of passionate developers and professional breeders
                who came together with a shared vision - to revolutionize how
                breeding communities connect and manage their programs. As
                breeders ourselves, we understand the challenges you face daily,
                from pedigree management to health tracking, from finding the
                right breeding partners to showcasing your achievements.
              </p>
              <h2 className="pb-4 pt-8 text-center text-3xl font-semibold tracking-tight">
                <span className="text-primary">Our mission:</span>{" "}
                <span className="bg-gradient-to-r from-primary-500 to-accent-500 bg-clip-text text-transparent">
                  Elevating professional breeding worldwide
                </span>
              </h2>
              <p className="leading-relaxed tracking-wide">
                We believe that professional breeding deserves professional
                tools. That's why we've built BreedHub - a comprehensive
                platform that brings together everything you need in one place.
                But we're more than just software; we're a community-driven
                platform that evolves with your needs.
              </p>
              <p className="leading-relaxed tracking-wide mt-6">
                Your feedback shapes our future. We actively listen to our users
                and implement the features that matter most to you. Whether
                you're a seasoned breeder with decades of experience or just
                starting your journey, BreedHub is designed to grow with you.
              </p>
              <p className="leading-relaxed tracking-wide mt-6 text-center font-semibold text-primary">
                Welcome to BreedHub - where passion meets professionalism.
              </p>
            </div>
          </div>
        </div>
      </div>
    </LandingLayout>
  );
}
