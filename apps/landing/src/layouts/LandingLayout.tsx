// apps/landing/src/layouts/LandingLayout.tsx

import Footer from "@/components/Footer";
import LandingMenu from "@/components/LandingMenu";
import React from "react";

interface LandingLayoutProps {
  children: React.ReactNode;
}

export default function LandingLayout({ children }: LandingLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col w-full">
      <LandingMenu />
      <main className="flex-1 flex flex-col ">{children}</main>
      <Footer />
    </div>
  );
}
