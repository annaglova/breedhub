import { cn } from "@ui/lib/utils";
import type { CSSProperties } from "react";

interface DrawerWidthResolved {
  side: string;
  sideXl: string;
  sideTransparent: string;
}

interface SpaceDrawerProps {
  children: React.ReactNode;
  drawerMode: "over" | "side" | "side-transparent";
  isDrawerOpen: boolean;
  isGridView: boolean;
  needCardClass: boolean;
  showFullscreen: boolean;
  /**
   * Resolved per-breakpoint drawer widths (defaults applied upstream).
   * Drives the inline `width` style for the two "side*" modes — the legacy
   * Tailwind `w-[70%] xl:w-[60%]` / `w-[45rem]` classes are replaced so
   * spaces can override widths from config (e.g. /my/pets uses 85%/75%/70%).
   */
  drawerWidth: DrawerWidthResolved;
}

export function SpaceDrawer({
  children,
  drawerMode,
  isDrawerOpen,
  isGridView,
  needCardClass,
  showFullscreen,
  drawerWidth,
}: SpaceDrawerProps) {
  const shouldRender = isGridView
    ? showFullscreen
    : showFullscreen || isDrawerOpen || drawerMode === "side-transparent";

  if (!shouldRender) {
    return null;
  }

  // Width is inline-styled when not fullscreen / over so the resolved
  // config-driven value wins. For `side` we keep the xl breakpoint via
  // a CSS variable so xl-only override (`sideXl`) still kicks in at
  // viewport ≥ 1280 — see the style below.
  const widthStyle: CSSProperties = {};
  if (!showFullscreen) {
    if (drawerMode === "side") {
      (widthStyle as CSSProperties & Record<string, string>)["--drawer-w"] =
        drawerWidth.side;
      (widthStyle as CSSProperties & Record<string, string>)["--drawer-w-xl"] =
        drawerWidth.sideXl;
    } else if (drawerMode === "side-transparent") {
      widthStyle.width = drawerWidth.sideTransparent;
    }
  }

  return (
    <div
      className={cn(
        "absolute top-0 bottom-0 right-0 z-40",
        "transition-all duration-300 ease-out",
        (showFullscreen || drawerMode === "over") && "w-full",
        !showFullscreen && drawerMode === "side" && "w-[var(--drawer-w)] xl:w-[var(--drawer-w-xl)]",
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
      style={widthStyle}
    >
      <div className="h-full overflow-auto">{children}</div>
    </div>
  );
}
