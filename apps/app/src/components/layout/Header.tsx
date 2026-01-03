import { useTheme } from "@/hooks/useTheme";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useAppWorkspaces } from "@/hooks/useAppStore";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { Button } from "@ui/components/button";
import { AvatarWithStatus } from "@ui/components/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@ui/components/tooltip";
import { cn } from "@ui/lib/utils";
import { Menu } from "lucide-react";
import { useState, forwardRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { UserDrawer } from "./UserDrawer";
import { Icon } from "@/components/shared/Icon";
import type { IconConfig } from "@breedhub/rxdb-store";

interface HeaderProps {
  onMenuClick?: () => void;
  isMobileSidebarOpen?: boolean;
  isHome?: boolean;
}

export const Header = forwardRef<HTMLElement, HeaderProps>(
  ({ onMenuClick, isHome = false }, ref) => {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [isUserDrawerOpen, setIsUserDrawerOpen] = useState(false);
  const isOnline = useOnlineStatus();
  const isMD = useMediaQuery("(min-width: 768px)");

  // Icon size: 20px on < md, 24px on md+
  const navIconSize = isMD ? 24 : 20;

  // TODO: In production, workspaces should be loaded statically to prevent flashing
  // See docs/UNIVERSAL_STORE_IMPLEMENTATION.md for details
  const { workspaces, loading, error, isDataLoaded } = useAppWorkspaces();

  // Helper to normalize icon to IconConfig format
  const normalizeIcon = (icon: string | IconConfig): IconConfig => {
    if (typeof icon === 'string') {
      // Legacy string format - assume it's Lucide kebab-case
      return { name: icon, source: 'lucide' };
    }
    return icon;
  };

  // Sort workspaces by order parameter, then map to navigation items
  const navItems = workspaces
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map(workspace => ({
      id: workspace.id,
      icon: normalizeIcon(workspace.icon),
      label: workspace.label,
      path: workspace.path
    }));

  return (
    <TooltipProvider>
      <header
        ref={ref}
        className="w-full"
      >
        <div className="flex items-center justify-between w-full h-14 md:h-16 px-4 md:px-6">
          {/* Logo - only on 3xl when sidebar is hidden */}
          <Link to="/" className="hidden 3xl:flex items-center ml-3">
            <img src="/logo-text.svg" alt="BreedHub" className="h-10 w-auto" />
          </Link>

          {/* Mobile menu button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="topbar-menubutton lg:hidden ml-3"
                onClick={onMenuClick}
                aria-label="Menu"
              >
                <Menu className="h-5 w-5 text-sub-header-color" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Menu</p>
            </TooltipContent>
          </Tooltip>

          {/* Navigation tabs - only show if not home, hidden on mobile (shown in footer) */}
          {!isHome && (
            <nav className="hidden sm:flex flex-1 justify-center">
              <div className="flex items-center min-h-[1.5rem]">
                {error ? (
                  // Show error state
                  <div className="text-red-500 text-sm">Failed to load workspaces</div>
                ) : (
                  // Always show workspaces (either default or from DB)
                  navItems.map((item) => {
                    const isActive =
                      location.pathname === item.path ||
                      (item.path === "/" &&
                        location.pathname.startsWith("/breeds"));

                    return (
                      <Tooltip key={item.id}>
                        <TooltipTrigger asChild>
                          <Link
                            to={item.path}
                            className={cn(
                              "flex items-center justify-center",
                              "px-6 sm:px-10 md:px-16 lg:px-22",
                              "py-3 transition-colors"
                            )}
                          >
                            <Icon
                              icon={item.icon}
                              size={navIconSize}
                              className={cn(
                                isActive
                                  ? "text-primary"
                                  : "text-sub-header-color"
                              )}
                            />
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                          <p>{item.label}</p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })
                )}
              </div>
            </nav>
          )}

          {/* Right side menu */}
          <div className="flex items-center gap-3 mr-3 md:mr-0">
            {/* Dark mode toggle */}
            {/* <Button
              variant="default"
              size="sm"
              onClick={toggleTheme}
              className="bg-primary"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
              <span className="ml-2">Dark</span>
            </Button> */}

            {/* User menu with online/offline status */}
            <button
              className="focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-full"
              aria-label="Profile"
              onClick={() => setIsUserDrawerOpen(true)}
            >
              <AvatarWithStatus
                size={isMD ? "default" : "sm"}
                isOnline={isOnline}
                showStatus={true}
                statusPosition="top-right"
                className="border"
              />
            </button>
          </div>
        </div>
      </header>

      <UserDrawer
        isOpen={isUserDrawerOpen}
        onClose={() => setIsUserDrawerOpen(false)}
      />
    </TooltipProvider>
  );
});

Header.displayName = "Header";
