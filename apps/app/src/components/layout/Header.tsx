import { useTheme } from "@/hooks/useTheme";
import { useAppWorkspaces } from "@/hooks/useAppStore";
import { Button } from "@ui/components/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@ui/components/tooltip";
import { cn, getIconComponent } from "@ui/lib/utils";
import { Menu, User } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { UserDrawer } from "./UserDrawer";

interface HeaderProps {
  onMenuClick?: () => void;
  isMobileSidebarOpen?: boolean;
  isHome?: boolean;
}

export function Header({ onMenuClick, isHome = false }: HeaderProps) {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [isUserDrawerOpen, setIsUserDrawerOpen] = useState(false);

  // TODO: In production, workspaces should be loaded statically to prevent flashing
  // See docs/UNIVERSAL_STORE_IMPLEMENTATION.md for details
  const { workspaces, loading, error, isDataLoaded } = useAppWorkspaces();

  // Map workspaces to navigation items with icon components
  const navItems = workspaces.map(workspace => ({
    id: workspace.id,
    icon: getIconComponent(workspace.icon),
    label: workspace.label,
    path: workspace.path
  }));

  return (
    <TooltipProvider>
      <header
        className={cn(
          "w-full flex items-center justify-between",

          "3xl:justify-center"
        )}
      >
        <div className="flex items-center justify-between w-full h-16 px-4 md:px-6">
          {/* Mobile menu button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="topbar-menubutton lg:hidden ml-3 "
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

          {/* Navigation tabs - only show if not home */}
          {!isHome && (
            <nav className="flex-1 flex justify-center">
              <div className="flex items-center min-h-[1.5rem]">
                {error ? (
                  // Show error state
                  <div className="text-red-500 text-sm">Failed to load workspaces</div>
                ) : (
                  // Always show workspaces (either default or from DB)
                  navItems.map((item) => {
                    const Icon = item.icon;
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
                              className={cn(
                                "h-6 w-6",
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
          <div
            className={cn(
              "flex items-center gap-3 mr-3 md:mr-0",
              "3xl:absolute 3xl:right-[2.15rem]"
            )}
          >
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

            {/* User menu */}
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full border overflow-hidden p-0"
              aria-label="Profile"
              onClick={() => setIsUserDrawerOpen(true)}
            >
              <div className="h-full w-full bg-gray-200 flex items-center justify-center">
                <User className="h-5 w-5 text-gray-600" />
              </div>
            </Button>
          </div>
        </div>
      </header>

      <UserDrawer
        isOpen={isUserDrawerOpen}
        onClose={() => setIsUserDrawerOpen(false)}
      />
    </TooltipProvider>
  );
}
