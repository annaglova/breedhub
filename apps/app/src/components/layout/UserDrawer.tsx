import { Button } from "@ui/components/button";
import { cn } from "@ui/lib/utils";
import {
  Baby,
  Calendar,
  Cat,
  CreditCard,
  FileText,
  Gift,
  Globe,
  Home,
  Image,
  Layers,
  LogOut,
  Search,
  Settings,
  ShoppingBag,
  User,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";

interface UserDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface MenuItem {
  icon?: any;
  label: string;
  path?: string;
  badge?: string;
  badgeType?: "primary" | "accent";
  isSeparator?: boolean;
}

export function UserDrawer({ isOpen, onClose }: UserDrawerProps) {
  if (!isOpen) return null;

  const menuItems: MenuItem[] = [
    { icon: Home, label: "Welcome", path: "/welcome" },
    {
      icon: Globe,
      label: "Site constructor",
      path: "/site-constructor",
      badge: "Prime",
      badgeType: "accent",
    },
    { icon: Users, label: "My kennel", path: "/my/kennel" },
    { icon: Cat, label: "Pets", path: "/my/pets" },
    { icon: Baby, label: "Litters", path: "/my/litters" },
    { icon: Calendar, label: "Calendar", path: "/my/calendar" },
    { icon: ShoppingBag, label: "Marketplace", path: "/my/marketplace" },
    { icon: Image, label: "Covers", path: "/my/covers" },
    { icon: FileText, label: "Notes", path: "/my/notes" },
    { icon: Layers, label: "Collections", path: "/my/collections" },
    { isSeparator: true },
    { icon: CreditCard, label: "Billing", path: "/billing" },
    { icon: UserPlus, label: "Referral", path: "/referral" },
    { icon: Gift, label: "Gift", path: "/gift" },
    { isSeparator: true },
    { icon: Settings, label: "Settings", path: "/settings" },
    { icon: Search, label: "Lookup", path: "/lookup" },
    { isSeparator: true },
    { icon: LogOut, label: "Sign Out", path: "/sign-out" },
  ];

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 z-60" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-80 bg-white shadow-xl z-70 flex flex-col user-drawer-enter">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
              <User className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <div className="font-semibold">Guest User</div>
              <div className="text-sm text-gray-600">Not signed in</div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Menu items */}
        <nav className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-1">
            {menuItems.map((item, index) => {
              if (item.isSeparator) {
                return (
                  <div
                    key={`sep-${index}`}
                    className="my-3 border-t border-gray-200"
                  />
                );
              }

              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path || "#"}
                  onClick={onClose}
                  className={cn(
                    "flex items-center justify-between px-3 py-2 rounded-lg transition-colors",
                    "hover:bg-gray-100"
                  )}
                >
                  <div className="flex items-center gap-3">
                    {Icon && <Icon className="h-5 w-5 text-gray-600" />}
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <div
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-bold uppercase text-white",
                        item.badgeType === "accent" ? "bg-accent" : "bg-primary"
                      )}
                    >
                      {item.badge}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Footer actions */}
        <div className="p-4 border-t space-y-2">
          <Button className="w-full" variant="default">
            Sign In
          </Button>
          <Button className="w-full" variant="outline">
            Register
          </Button>
        </div>
      </div>
    </>
  );
}
