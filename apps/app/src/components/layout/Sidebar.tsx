import { Button } from "@ui/components/button";
import { cn } from "@ui/lib/utils";
import {
  Baby,
  Calendar,
  Cat,
  Dog,
  MessageSquare,
  Users,
  X,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";

interface SidebarProps {
  isCollapsed?: boolean;
  onClose?: () => void;
  className?: string;
  asMenu?: boolean;
}

export function Sidebar({
  isCollapsed = false,
  onClose,
  className,
  asMenu = false,
}: SidebarProps) {
  const location = useLocation();

  // Determine active section based on current path
  const getActiveSection = () => {
    if (location.pathname.startsWith("/marketplace")) {
      return "marketplace";
    } else if (location.pathname.startsWith("/mating")) {
      return "mating";
    }
    return "home";
  };

  const activeSection = getActiveSection();

  // Menu items based on active section
  const menuItems = [
    // Home section items
    {
      id: "breeds",
      icon: Dog,
      label: "Breeds",
      path: "/breeds",
      section: "home",
    },
    {
      id: "pets",
      icon: Cat,
      label: "Pets",
      path: "/pets",
      section: "home",
    },
    {
      id: "litters",
      icon: Baby,
      label: "Litters",
      path: "/litters",
      section: "home",
    },
    {
      id: "kennels",
      icon: Users,
      label: "Kennels",
      path: "/kennels",
      section: "home",
    },
    {
      id: "contacts",
      icon: MessageSquare,
      label: "Contacts",
      path: "/contacts",
      section: "home",
    },
    {
      id: "events",
      icon: Calendar,
      label: "Events",
      path: "/events",
      section: "home",
    },
    // Marketplace section items
    {
      id: "marketplace-pets",
      icon: Cat,
      label: "Pets",
      path: "/marketplace/pets",
      section: "marketplace",
    },
    // Test mating section items
    {
      id: "mating-pets",
      icon: Cat,
      label: "Pets",
      path: "/mating/pets",
      section: "mating",
    },
  ];

  const visibleMenuItems = menuItems.filter(
    (item) => item.section === activeSection
  );

  return (
    <aside className={cn("h-full flex flex-col", className)}>
      {/* Logo and close button */}
      {!asMenu && (
        <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8 border border-red-500">
          <Link to="/" className="flex items-center relative z-10">
            <img src="/logo-text.svg" alt="BreedHub" className="h-10 w-auto" />
          </Link>
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="lg:hidden"
            >
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>
      )}

      {/* Navigation menu */}
      <nav className="flex-1 p-4 border">
        <h2 className="text-primary font-bold text-lg mb-4">SPACES</h2>
        <ul className="space-y-1">
          {visibleMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);

            return (
              <li key={item.id}>
                <Link
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                    "hover:bg-gray-200",
                    isActive && "bg-gray-200 text-gray-900 font-medium",
                    isCollapsed && "justify-center"
                  )}
                  onClick={onClose}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  {!isCollapsed && <span>{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
