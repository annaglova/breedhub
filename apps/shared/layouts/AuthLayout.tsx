import "@shared/styles/animations.css";
import "primeicons/primeicons.css";
import React from "react";

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen" data-theme="prime">
      {children}
    </div>
  );
}