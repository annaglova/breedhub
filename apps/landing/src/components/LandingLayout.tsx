// apps/landing/src/components/LandingLayout.tsx

import React from "react";
import Footer from "./Footer";

interface LandingLayoutProps {
  children: React.ReactNode;
}

export default function LandingLayout({ children }: LandingLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 flex flex-col">{children}</main>
      <Footer />
    </div>
  );
}
