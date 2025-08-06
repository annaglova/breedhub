import { cn } from "@ui/lib/utils";

interface FooterProps {
  className?: string;
}

export function Footer({ className }: FooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      className={cn("px-8 py-2 text-white z-10 cursor-default", className)}
    >
      Breedhub © {currentYear}
    </footer>
  );
}
