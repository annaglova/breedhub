import { cn } from "@ui/lib/utils";

interface SkipLink {
  id: string;
  label: string;
  targetId: string;
}

interface SkipLinksProps {
  links?: SkipLink[];
  className?: string;
}

const defaultLinks: SkipLink[] = [
  { id: "skip-to-main", label: "Skip to main content", targetId: "main-content" },
  { id: "skip-to-nav", label: "Skip to navigation", targetId: "navigation" },
  { id: "skip-to-footer", label: "Skip to footer", targetId: "footer" },
];

export function SkipLinks({ links = defaultLinks, className }: SkipLinksProps) {
  const handleSkip = (targetId: string) => {
    const target = document.getElementById(targetId);
    if (target) {
      target.focus();
      target.scrollIntoView();
    }
  };

  return (
    <div className={cn("sr-only focus-within:not-sr-only", className)}>
      <div className="absolute top-0 left-0 z-50 bg-white p-2 shadow-lg">
        <ul className="space-y-1">
          {links.map((link) => (
            <li key={link.id}>
              <a
                href={`#${link.targetId}`}
                onClick={(e) => {
                  e.preventDefault();
                  handleSkip(link.targetId);
                }}
                className={cn(
                  "block px-4 py-2 text-sm font-medium text-slate-700",
                  "hover:bg-slate-100 hover:text-slate-900",
                  "focus:bg-primary-100 focus:text-primary-700 focus:outline-none",
                  "rounded-md transition-colors"
                )}
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}