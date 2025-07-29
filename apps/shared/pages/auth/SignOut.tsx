import FooterFigure from "@shared/assets/backgrounds/footer-figure.svg?react";
import { AuthFooter } from "@shared/components/auth/AuthFooter";
import { AuthHeader } from "@shared/components/auth/AuthHeader";
import { AuthButton } from "@shared/components/auth/AuthButton";
import AuthLayout from "@shared/layouts/AuthLayout";
import { Button } from "@ui/components/button";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function SignOut() {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    // TODO: Implement actual sign out logic
    // - Clear auth tokens
    // - Clear user data from store
    // - Call API to invalidate session
    
    // Countdown timer
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate("/");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  return (
    <AuthLayout>
      <div className="relative flex min-h-screen w-full flex-col">
        {/* Background SVG */}
        <div className="absolute bottom-0 w-full pointer-events-none z-0">
          <FooterFigure className="w-full h-auto" />
        </div>

        {/* Header */}
        <AuthHeader rightContent={
          <div className="flex items-center gap-4">
            <span className="hidden text-gray-600 sm:block">Go to</span>
            <AuthButton to="/">
              Homepage
            </AuthButton>
          </div>
        } />

        {/* Content */}
        <div className="relative z-10 flex flex-1 items-center justify-center px-6 pb-8 pt-8 sm:px-8">
          <div className="w-full max-w-md animate-scaleIn">
            <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-10">
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 shadow-sm">
                <svg
                  className="h-8 w-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h2 className="mt-4 text-2xl font-bold text-gray-900">
                You are signed out
              </h2>
              <p className="mt-2 text-base text-gray-600">
                Thank you for using Breedhub. Till next time!
              </p>
              <p className="mt-6 text-base text-gray-500">
                Redirecting to homepage in {countdown}...
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <AuthFooter />
    </div>
    </AuthLayout>
  );
}