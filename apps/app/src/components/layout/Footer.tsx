import { Icon } from "@/components/shared/Icon";
import { useAppWorkspaces } from "@/hooks/useAppStore";
import type { IconConfig } from "@breedhub/rxdb-store";
import { cn } from "@ui/lib/utils";
import { forwardRef } from "react";
import { Link, useLocation } from "react-router-dom";

interface FooterProps {
  className?: string;
}

/**
 * Footer - App footer with mobile navigation
 *
 * Shows workspace navigation on small screens (< sm).
 * On sm+ screens shows empty footer (navigation is in Header).
 */
export const Footer = forwardRef<HTMLElement, FooterProps>(
  ({ className }, ref) => {
    const location = useLocation();

    // Load workspaces for navigation
    const { workspaces, error } = useAppWorkspaces();

    // Helper to normalize icon to IconConfig format
    const normalizeIcon = (icon: string | IconConfig): IconConfig => {
      if (typeof icon === "string") {
        return { name: icon, source: "lucide" };
      }
      return icon;
    };

    // Helper to get space slugs from workspace config
    const getSpaceSlugs = (spaces: any): string[] => {
      if (!spaces) return [];
      const spacesArray = Array.isArray(spaces) ? spaces : Object.values(spaces);
      return spacesArray
        .map((space: any) => space?.slug)
        .filter((slug): slug is string => typeof slug === 'string');
    };

    // Sort workspaces by order parameter
    const navItems = workspaces
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((workspace) => ({
        id: workspace.id,
        icon: normalizeIcon(workspace.icon),
        label: workspace.label,
        path: workspace.path,
        spaceSlugs: getSpaceSlugs(workspace.spaces),
      }));

    const currentYear = new Date().getFullYear();

    return (
      <footer
        ref={ref}
        className={cn(
          "z-10 cursor-default",
          // Mobile: centered nav, taller
          "flex items-center justify-center h-14 px-4",
          // Desktop: left-aligned text, original padding
          "sm:block sm:h-auto sm:px-8 sm:py-2",
          className
        )}
      >
        {/* Copyright text - only on sm+ */}
        <span className="hidden sm:inline text-sm text-secondary">
          Breedhub © {currentYear}
        </span>

        {/* Workspace navigation - only on mobile (< sm) */}
        <nav className="flex sm:hidden items-center gap-8">
          {error ? (
            <span className="text-red-400 text-xs">Error</span>
          ) : (
            navItems.map((item) => {
              // Workspace is active if:
              // 1. Path exactly matches workspace path (e.g., /my)
              // 2. Path starts with workspace path + "/" (e.g., /my/notes for workspace /my)
              // 3. For root workspace ("/"), check if path matches any space slug
              const isActive =
                location.pathname === item.path ||
                (item.path !== '/' && location.pathname.startsWith(item.path + '/')) ||
                (item.path === '/' && item.spaceSlugs.some((slug: string) =>
                  location.pathname.startsWith(`/${slug}`)
                ));

              return (
                <Link
                  key={item.id}
                  to={item.path}
                  className={cn(
                    "flex items-center justify-center",
                    "w-12 h-10 rounded-lg transition-colors",
                    isActive ? "bg-white/20" : "hover:bg-white/10"
                  )}
                  aria-label={item.label}
                >
                  <Icon
                    icon={item.icon}
                    size={22}
                    className={cn(isActive ? "text-white" : "text-white/60")}
                  />
                </Link>
              );
            })
          )}
        </nav>
      </footer>
    );
  }
);

Footer.displayName = "Footer";
