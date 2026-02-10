import LogoText from "@shared/icons/logo/logo-text.svg?react";
import { Link } from "react-router-dom";

interface AuthHeaderProps {
  rightButtonText?: string;
  rightButtonLink?: string;
  rightButtonLabel?: string;
  rightContent?: React.ReactNode;
}

export function AuthHeader({
  rightContent,
}: AuthHeaderProps) {
  return (
    <div className="relative z-10 flex w-full items-center justify-between px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
      <div className="flex items-center">
        <Link
          to="/"
          className="flex items-center cursor-pointer relative z-10 rounded p-2 -m-2"
          aria-label="Go to homepage"
          style={{ border: "none", outline: "none", boxShadow: "none" }}
        >
          <LogoText
            className="h-10 w-auto cursor-pointer"
            style={{
              marginTop: "6px",
              border: "none",
              outline: "none",
              boxShadow: "none",
            }}
          />
        </Link>
      </div>
      {rightContent}
    </div>
  );
}
