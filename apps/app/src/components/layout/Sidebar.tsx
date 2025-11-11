import { Button } from "@ui/components/button";
import { cn, getIconComponent } from "@ui/lib/utils";
import { X } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useWorkspaceSpaces } from "@/hooks/useAppStore";

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
      icon: getIconComponent(space.icon),
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
