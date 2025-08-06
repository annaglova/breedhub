import { useTheme } from "@/hooks/useTheme";
import { Button } from "@ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@ui/components/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@ui/components/tooltip";
import { cn } from "@ui/lib/utils";
import { Heart, Home, Menu, Moon, ShoppingBag, Sun, User } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

interface HeaderProps {
  onMenuClick?: () => void;
  isMobileSidebarOpen?: boolean;
  isHome?: boolean;
}

export function Header({ onMenuClick, isHome = false }: HeaderProps) {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  const navItems = [
    { id: "home", icon: Home, label: "Home", path: "/" },
    {
      id: "marketplace",
      icon: ShoppingBag,
      label: "Marketplace",
      path: "/marketplace",
    },
    { id: "mating", icon: Heart, label: "Test mating", path: "/mating" },
  ];

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
                {navItems.map((item) => {
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
                              "h-5 w-5",
                              isActive
                                ? "text-sub-header-active"
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
                })}
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
            <Button
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
            </Button>

            {/* User menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-full border overflow-hidden p-0"
                  aria-label="Profile"
                >
                  <div className="h-full w-full bg-gray-200 flex items-center justify-center">
                    <User className="h-5 w-5 text-gray-600" />
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem>Sign In</DropdownMenuItem>
                <DropdownMenuItem>Register</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
    </TooltipProvider>
  );
}
