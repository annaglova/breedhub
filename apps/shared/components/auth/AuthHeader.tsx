import LogoText from "@shared/icons/logo/logo-text.svg?react";
import { Link } from "react-router-dom";

interface AuthHeaderProps {
  rightButtonText?: string;
  rightButtonLink?: string;
  rightButtonLabel?: string;
  rightContent?: React.ReactNode;
}

export function AuthHeader({
  rightButtonText = "Sign in",
  rightButtonLink = "/sign-in",
  rightButtonLabel = "Return to",
  rightContent,
}: AuthHeaderProps) {
  return (
    <div className="relative z-10 flex w-full items-center justify-between px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
      <div className="flex items-center">
        <Link
          to="/"
          className="flex items-center cursor-pointer relative z-10 rounded p-2 -m-2"
          aria-label="Go to homepage"
          style={{ border: 'none', outline: 'none', boxShadow: 'none' }}
        >
          <LogoText
            className="h-10 w-auto cursor-pointer"
            style={{ marginTop: "6px", border: 'none', outline: 'none', boxShadow: 'none' }}
          />
        </Link>
      </div>
      {rightContent
        ? rightContent
        : rightButtonLink && (
            <div className="flex items-center gap-2 sm:gap-4">
              <span className="hidden text-slate-600 sm:block text-sm sm:text-base">
                {rightButtonLabel}
              </span>
              <Link to={rightButtonLink}>
                <button
                  className="rounded-full font-medium text-base px-6 py-2.5 transform transition-all duration-300 hover:scale-105 text-white relative overflow-hidden bg-primary-500 hover:bg-primary-600 border-2 border-primary-500 hover:border-primary-600"
                  aria-label={rightButtonText}
                >
                  {rightButtonText}
                </button>
              </Link>
            </div>
          )}
    </div>
  );
}
