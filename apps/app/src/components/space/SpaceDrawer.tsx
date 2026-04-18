import { cn } from "@ui/lib/utils";

interface SpaceDrawerProps {
  children: React.ReactNode;
  drawerMode: "over" | "side" | "side-transparent";
  isDrawerOpen: boolean;
  isGridView: boolean;
  needCardClass: boolean;
  showFullscreen: boolean;
}

export function SpaceDrawer({
  children,
  drawerMode,
  isDrawerOpen,
  isGridView,
  needCardClass,
  showFullscreen,
}: SpaceDrawerProps) {
  const shouldRender = isGridView
    ? showFullscreen
    : showFullscreen || isDrawerOpen || drawerMode === "side-transparent";

  if (!shouldRender) {
    return null;
  }

  return (
    <div
      className={cn(
        "absolute top-0 bottom-0 right-0 z-40",
        "transition-all duration-300 ease-out",
        (showFullscreen || drawerMode === "over") && "w-full",
        !showFullscreen && drawerMode === "side" && "w-[70%] xl:w-[60%]",
        !showFullscreen && drawerMode === "side-transparent" && "w-[45rem]",
        showFullscreen
          ? needCardClass
            ? "fake-card"
            : "card-surface"
          : drawerMode === "side-transparent"
            ? needCardClass
              ? "fake-card"
              : "card-surface"
            : "bg-white",
        showFullscreen && "md:rounded-xl overflow-hidden",
        !showFullscreen &&
          drawerMode !== "over" &&
          (needCardClass
            ? "rounded-xl overflow-hidden"
            : "rounded-l-xl overflow-hidden"),
        !showFullscreen && drawerMode === "side" && "shadow-xl",
        showFullscreen || drawerMode === "side-transparent"
          ? "opacity-100"
          : isDrawerOpen
            ? "opacity-100"
            : "translate-x-full opacity-0 pointer-events-none",
      )}
    >
      <div className="h-full overflow-auto">{children}</div>
    </div>
  );
}
