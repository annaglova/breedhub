import { Icon } from "@/components/shared/Icon";
import { useWorkspaceSpaces } from "@/hooks/useAppStore";
import type { IconConfig } from "@breedhub/rxdb-store";
import { Button } from "@ui/components/button";
import { cn } from "@ui/lib/utils";
import { X } from "lucide-react";
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
  const { workspace, spaces } = useWorkspaceSpaces();

  // Helper to normalize icon to IconConfig format (same as Header.tsx)
  const normalizeIcon = (icon: string | IconConfig): IconConfig => {
    if (typeof icon === 'string') {
      // Legacy string format - assume it's Lucide
      return { name: icon, source: 'lucide' };
    }
    return icon;
  };

  // Sort spaces by order parameter, then convert to menu items format
  const menuItems = spaces
    .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
    .map((space: any) => {
    // Determine the full path based on workspace
    const basePath = workspace?.path === '/' ? '' : workspace?.path || '';
    const spacePath = space.path?.startsWith('/') ? space.path : `/${space.path || space.id}`;
    const fullPath = `${basePath}${spacePath}`;

    return {
      id: space.id,
      icon: normalizeIcon(space.icon),
      label: space.label || space.id,
      path: fullPath
    };
  });

  return (
    <aside className={cn("h-full flex flex-col", className)}>
      {/* Logo and close button */}
      {!asMenu && (
        <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
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
      <nav className="flex-1 p-4">
        <h2 className="text-primary font-bold text-lg mb-6 mt-6">SPACES</h2>
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);

            return (
              <li key={item.id}>
                <Link
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                    "text-gray-900 hover:bg-gray-200",
                    isActive && "bg-gray-200 font-semibold",
                    isCollapsed && "justify-center"
                  )}
                  onClick={onClose}
                >
                  <Icon
                    icon={item.icon}
                    size={20}
                    className={cn(
                      "flex-shrink-0",
                      isActive ? "text-gray-600" : "text-gray-400"
                    )}
                  />
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
