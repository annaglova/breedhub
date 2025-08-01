// apps/landing/src/layouts/LandingLayout.tsx

import Footer from "@/components/Footer";
import LandingMenu from "@/components/LandingMenu";
import React from "react";

interface LandingLayoutProps {
  children: React.ReactNode;
}

export default function LandingLayout({ children }: LandingLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col w-full landing-cursor">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <LandingMenu />
      <main id="main-content" className="flex-1 flex flex-col" tabIndex={-1}>
        {children}
      </main>
      <Footer />
    </div>
  );
}
