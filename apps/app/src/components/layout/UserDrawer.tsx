import { Button } from "@ui/components/button";
import { cn, getIconComponent } from "@ui/lib/utils";
import { LogOut, User, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useUserMenu } from "@/hooks/useUserMenu";
import { useAuth } from "@/core/auth";

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
          <div className="h-10 w-10 shrink-0 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden">
            {authenticated && user.avatar ? (
              <img src={user.avatar} alt="" className="h-10 w-10 rounded-full object-cover" />
            ) : (
              <User className="h-5 w-5 text-slate-600" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold truncate">{authenticated ? user.name : "Guest User"}</div>
            <div className="text-sm text-slate-600 truncate">
              {authenticated ? user.email : "Not signed in"}
            </div>
          </div>
          <Button
            variant="ghost-secondary"
            onClick={onClose}
            className="size-[2.25rem] shrink-0 rounded-full p-0"
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
                      "hover:bg-slate-100"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {Icon && <Icon className="h-5 w-5 text-slate-600" />}
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
            <Button
              className="w-full"
              variant="outline-secondary"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          ) : (
            <>
              <Link to="/sign-in" onClick={onClose}>
                <Button className="w-full" variant="default">
                  Sign In
                </Button>
              </Link>
              <Link to="/sign-up" onClick={onClose}>
                <Button className="w-full" variant="outline-secondary">
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
