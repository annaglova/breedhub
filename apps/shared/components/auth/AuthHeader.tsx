import LogoText from "@shared/icons/logo/logo-text.svg?react";
import { Link } from "react-router-dom";
import { BackButton } from "./BackButton";
import { Breadcrumb, BreadcrumbItem } from "./Breadcrumb";

interface AuthHeaderProps {
  rightButtonText?: string;
  rightButtonLink?: string;
  rightButtonLabel?: string;
  rightContent?: React.ReactNode;
  showBackButton?: boolean;
  backButtonTo?: string;
  breadcrumbs?: BreadcrumbItem[];
}

export function AuthHeader({
  rightButtonText = "Sign in",
  rightButtonLink = "/sign-in",
  rightButtonLabel = "Return to",
  rightContent,
  showBackButton = false,
  backButtonTo,
  breadcrumbs,
}: AuthHeaderProps) {
  return (
    <div className="relative z-10 w-full px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {showBackButton && (
            <BackButton to={backButtonTo} variant="icon" />
          )}
          <Link
            to="/"
            className="flex items-center cursor-pointer relative z-10 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded"
            aria-label="Go to homepage"
          >
            <LogoText
              className="h-10 w-auto cursor-pointer"
              style={{ marginTop: "6px" }}
            />
          </Link>
        </div>
      {rightContent
        ? rightContent
        : rightButtonLink && (
            <div className="flex items-center gap-2 sm:gap-4">
              <span className="hidden text-gray-600 sm:block text-sm sm:text-base">
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
      {breadcrumbs && breadcrumbs.length > 0 && (
        <div className="mt-2">
          <Breadcrumb items={breadcrumbs} className="text-xs sm:text-sm" />
        </div>
      )}
    </div>
  );
}
