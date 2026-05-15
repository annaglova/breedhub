import { Icon } from "@/components/shared/Icon";
import { useWorkspaceSpaces } from "@/hooks/useAppStore";
import { getWorkspaceItems, resolveItemPath } from "@/utils/workspace-items";
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
  hideMenu?: boolean; // Hide menu but keep logo
}

export function Sidebar({
  isCollapsed = false,
  onClose,
  className,
  asMenu = false,
  hideMenu = false,
}: SidebarProps) {
  const location = useLocation();
  const { workspace } = useWorkspaceSpaces();

  // Helper to normalize icon to IconConfig format (same as Header.tsx)
  const normalizeIcon = (icon: string | IconConfig | undefined): IconConfig => {
    if (!icon) return { name: 'Circle', source: 'lucide' };
    if (typeof icon === 'string') {
      return { name: icon, source: 'lucide' };
    }
    return icon as IconConfig;
  };

  // Unified menu = spaces + slug-bearing pages (sidebar can't link to a
  // slug-less tool page — those are reached via top nav). Sorted by order.
  const items = getWorkspaceItems(workspace);
  const workspacePath = workspace?.path || '/';
  const menuItems = items
    .filter((item) => !!item.slug)
    .map((item) => ({
      id: item.id,
      icon: normalizeIcon(item.icon as string | IconConfig | undefined),
      label: item.label || item.id,
      path: resolveItemPath(workspacePath, item),
    }));

  return (
    <aside className={cn("h-full flex flex-col", className)}>
      {/* Logo and close button */}
      {!asMenu && (
        <div className="flex items-center justify-between h-16 px-4 sm:px-6 3xl:px-8">
          <Link to="/" className="flex items-center relative z-10">
            <img src="/logo-text.svg" alt="BreedHub" className="h-10 w-auto" />
          </Link>
          {onClose && (
            <Button
              variant="ghost-secondary"
              onClick={onClose}
              className="size-7 shrink-0 rounded-full p-0 focus-visible:ring-0 lg:hidden"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      {/* Navigation menu - hidden when hideMenu is true or no items */}
      {!hideMenu && menuItems.length > 0 && (
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
                      onClose ? "text-slate-800" : "text-slate-900",
                      !isActive &&
                        (onClose
                          ? "hover:bg-primary-50/60 hover:font-semibold"
                          : "hover:bg-slate-200/60"),
                      isActive &&
                        (onClose
                          ? "bg-primary-50 font-semibold cursor-default shadow-[0_1px_1px_rgba(17,17,26,0.09),0_1px_3px_rgba(17,17,26,0.04)]"
                          : "bg-slate-200 font-semibold cursor-default shadow-[0_1px_1px_rgba(17,17,26,0.09),0_1px_3px_rgba(17,17,26,0.04)]"),
                      isCollapsed && "justify-center"
                    )}
                    onClick={(e) => {
                      if (isActive) {
                        e.preventDefault();
                        return;
                      }
                      onClose?.();
                    }}
                  >
                    <Icon
                      icon={item.icon}
                      size={20}
                      className={cn(
                        "flex-shrink-0",
                        onClose ? "text-slate-400" : (isActive ? "text-slate-600" : "text-slate-400")
                      )}
                    />
                    {!isCollapsed && <span>{item.label}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </aside>
  );
}
