import { useTheme } from "@/hooks/useTheme";
import { useAppWorkspaces } from "@/hooks/useAppStore";
import { Button } from "@ui/components/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@ui/components/tooltip";
import { cn } from "@ui/lib/utils";
import { Menu, User, Home, ShoppingBag, Heart, Settings, Search } from "lucide-react";
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
  const { workspaces, loading, error } = useAppWorkspaces();

  // Icon mapping
  const iconMap: Record<string, any> = {
    'Home': Home,
    'ShoppingBag': ShoppingBag,
    'Heart': Heart,
    'User': User,
    'Settings': Settings,
    'Search': Search,
    'Menu': Menu
  };

  // Map workspaces to navigation items with icon components
  const navItems = workspaces.map(workspace => ({
    id: workspace.id,
    icon: iconMap[workspace.icon] || Home, // Default to Home if not found
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
              <div className="flex items-center">
                {loading ? (
                  // Show skeleton while loading
                  <div className="flex items-center gap-8">
                    <div className="w-6 h-6 bg-gray-200 rounded animate-pulse" />
                    <div className="w-6 h-6 bg-gray-200 rounded animate-pulse" />
                    <div className="w-6 h-6 bg-gray-200 rounded animate-pulse" />
                  </div>
                ) : error ? (
                  // Show error state
                  <div className="text-red-500 text-sm">Failed to load workspaces</div>
                ) : (
                  // Show workspaces
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
