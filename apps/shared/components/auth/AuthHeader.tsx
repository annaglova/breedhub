import LogoText from "@shared/icons/logo/logo-text.svg?react";
import { Button } from "@ui/components/button";
import { Link } from "react-router-dom";

interface AuthHeaderProps {
  rightButtonText?: string;
  rightButtonLink?: string;
  rightButtonLabel?: string;
}

export function AuthHeader({
  rightButtonText = "Sign in",
  rightButtonLink = "/sign-in",
  rightButtonLabel = "Return to",
}: AuthHeaderProps) {
  return (
    <div className="relative z-10 flex w-full items-center justify-between px-4 sm:px-6 lg:px-8 py-4">
      <div className="flex items-center">
        <Link 
          to="/" 
          className="flex items-center cursor-pointer relative z-10 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded"
          aria-label="Go to homepage"
        >
          <LogoText className="h-10 w-auto cursor-pointer mt-0.5" />
        </Link>
      </div>
      {rightButtonLink && (
        <div className="flex items-center gap-4">
          <span className="hidden text-gray-600 sm:block text-base">
            {rightButtonLabel}
          </span>
          <Link to={rightButtonLink}>
            <Button 
              className="landing-raised-button landing-raised-button-pink"
              aria-label={rightButtonText}
            >
              {rightButtonText}
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}