import { MobileOptimizations } from "@shared/components/auth/MobileOptimizations";
import { SkipLinks } from "@shared/components/auth/SkipLinks";
import "@shared/styles/animations.css";
import { Toaster } from "@ui/components/toaster";
import React from "react";

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen min-h-[100dvh] select-none">
      <SkipLinks 
        links={[
          { id: "skip-to-form", label: "Skip to login form", targetId: "auth-form" },
          { id: "skip-to-footer", label: "Skip to footer", targetId: "auth-footer" },
        ]}
      />
      <MobileOptimizations />
      {children}
      <Toaster />
    </div>
  );
}