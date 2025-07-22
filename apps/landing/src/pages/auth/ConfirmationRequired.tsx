import HeaderFigure from "@/assets/backgrounds/header-figure.svg?react";
import { Button } from "@ui/components/button";
import { Link } from "react-router-dom";

export default function ConfirmationRequired() {
  return (
    <div className="relative flex min-h-screen w-full flex-col bg-gradient-to-br from-primary-50 via-white to-primary-50">
      {/* Background SVG */}
      <div className="absolute bottom-0 left-0 w-full h-full pointer-events-none overflow-hidden opacity-10">
        <HeaderFigure className="absolute bottom-[-50%] left-[-20%] w-[140%] h-auto" />
      </div>

      {/* Header */}
      <div className="relative z-10 flex w-full items-center justify-between p-8 sm:px-14">
        <Link to="/" className="flex items-center">
          <img
            className="h-10"
            src="/assets/images/logo/logo-text.svg"
            alt="BreedHub logo"
          />
        </Link>
        <div className="flex items-center gap-4">
          <span className="hidden text-gray-600 sm:block">Return to</span>
          <Link to="/sign-in">
            <Button className="landing-raised-button landing-raised-button-pink">
              Login page
            </Button>
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-1 items-center justify-center px-6 pb-8 pt-8 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-10">
            {/* Icon */}
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary-100">
              <svg
                className="h-8 w-8 text-primary-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76"
                />
              </svg>
            </div>

            {/* Title */}
            <div className="mt-6 text-center">
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                Confirmation required
              </h1>
              <p className="mt-4 text-gray-600">
                A confirmation mail with instructions has been sent to your email
                address. Follow those instructions to confirm your email address
                and activate your account.
              </p>
            </div>

            {/* Tips */}
            <div className="mt-8 rounded-lg bg-gray-50 p-4">
              <h3 className="text-sm font-medium text-gray-900">
                Didn't receive an email?
              </h3>
              <ul className="mt-2 space-y-1 text-sm text-gray-600">
                <li>• Check your spam or junk folder</li>
                <li>• Verify that you entered the correct email address</li>
                <li>• Wait a few minutes for the email to arrive</li>
              </ul>
            </div>

            {/* Resend button */}
            <button
              type="button"
              className="mt-6 w-full text-center text-sm text-primary-600 hover:text-primary-500"
            >
              Resend confirmation email
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 flex h-20 w-full items-center px-6 sm:h-24 md:px-8">
        <span className="text-sm text-gray-600">BreedHub &copy; 2024</span>
      </div>
    </div>
  );
}