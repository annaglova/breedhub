import { cn } from "@ui/lib/utils";
import { forwardRef } from "react";

interface FooterProps {
  className?: string;
}

export const Footer = forwardRef<HTMLElement, FooterProps>(
  ({ className }, ref) => {
    const currentYear = new Date().getFullYear();

    return (
      <footer
        ref={ref}
        className={cn("px-8 py-2 text-white z-10 cursor-default", className)}
      >
        Breedhub © {currentYear}
      </footer>
    );
  }
);

Footer.displayName = "Footer";
