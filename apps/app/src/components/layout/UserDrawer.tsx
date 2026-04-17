import { Button } from "@ui/components/button";
import { AvatarWithFallback } from "@ui/components/avatar";
import { cn, getIconComponent } from "@ui/lib/utils";
import { LogOut, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useUserMenu } from "@/hooks/useUserMenu";
import { useAuth } from "@shared/core/auth";

interface UserDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UserDrawer({ isOpen, onClose }: UserDrawerProps) {
  if (!isOpen) return null;

  const { menuItems, loading } = useUserMenu();
  const { authenticated, user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    onClose();
    navigate("/sign-in");
  };

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 z-60" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-80 bg-white shadow-xl z-70 flex flex-col user-drawer-enter">
        {/* Header */}
        <div className="flex items-center gap-4 px-4 py-3 border-b">
          <AvatarWithFallback
            size="default"
            src={authenticated ? (user.avatar ?? undefined) : undefined}
            name={authenticated ? (user.name ?? undefined) : undefined}
            className="shrink-0 border border-slate-300"
          />
          <div className="flex-1 min-w-0">
            <div className="font-semibold truncate">{authenticated ? user.name : "Guest User"}</div>
            <div className="text-sm text-slate-600 truncate">
              {authenticated ? user.email : "Not signed in"}
            </div>
          </div>
          <Button
            variant="ghost-secondary"
            onClick={onClose}
            className="size-7 shrink-0 rounded-full p-0 focus-visible:ring-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Menu items */}
        <nav className="flex-1 p-4 overflow-y-auto">
          {loading ? (
            <div className="text-center text-slate-500 py-4">Loading menu...</div>
          ) : (
            <div className="space-y-1">
              {menuItems.map((item, index) => {
                if (item.type === 'separator') {
                  return (
                    <div
                      key={`sep-${index}`}
                      className="my-3 border-t border-slate-200"
                    />
                  );
                }

                const Icon = getIconComponent(item.icon);
                return (
                  <Link
                    key={item.id || item.path}
                    to={item.path || "#"}
                    onClick={onClose}
                    className={cn(
                      "flex items-center justify-between px-3 py-2 rounded-lg transition-colors",
                      "text-slate-800 hover:bg-primary-50 hover:font-semibold"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {Icon && <Icon className="h-5 w-5 text-slate-400" />}
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <div
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-bold uppercase text-white",
                          (item.badgeVariant === "accent" || item.badgeType === "accent") ? "bg-accent" : "bg-primary"
                        )}
                      >
                        {item.badge}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </nav>

        {/* Footer actions — auth buttons */}
        <div className="p-4 border-t flex flex-col gap-2">
          {authenticated ? (
            <button
              className="w-full h-9 rounded-md text-sm font-bold px-4 text-primary-600 bg-transparent transition-all duration-300 flex items-center justify-center gap-2"
              style={{ border: '2px solid rgb(var(--primary-500) / 0.3)' }}
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          ) : (
            <>
              <Link to="/sign-in" onClick={onClose}>
                <button
                  className="w-full h-9 rounded-md text-sm font-bold px-4 text-primary-600 bg-transparent transition-all duration-300"
                  style={{ border: '2px solid rgb(var(--primary-500) / 0.3)' }}
                >
                  Sign In
                </button>
              </Link>
              <Link to="/sign-up" onClick={onClose}>
                <Button className="w-full font-bold" variant="default">
                  Register
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </>
  );
}
