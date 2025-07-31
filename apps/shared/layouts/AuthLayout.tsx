import { MobileOptimizations } from "@shared/components/auth/MobileOptimizations";
import "@shared/styles/animations.css";
import { Toaster } from "@ui/components/toaster";
import React from "react";

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen min-h-[100dvh] select-none">
      <MobileOptimizations />
      {children}
      <Toaster />
    </div>
  );
}