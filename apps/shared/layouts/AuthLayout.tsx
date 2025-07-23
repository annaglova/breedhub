import { MobileOptimizations } from "@shared/components/auth/MobileOptimizations";
import "@shared/styles/animations.css";
import "primeicons/primeicons.css";
import React from "react";

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen min-h-[100dvh]" data-theme="prime">
      <MobileOptimizations />
      {children}
    </div>
  );
}