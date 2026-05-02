import { spaceStore } from "@breedhub/rxdb-store";
import { useSignals } from "@preact/signals-react/runtime";

/**
 * TabBodySkeleton — shared body placeholder for tab content while it loads.
 *
 * Used in two places:
 * 1. tab-registry.ts Suspense fallback while a lazy tab chunk is downloading
 *    (keeps each tab section occupying consistent vertical space so scroll-mode
 *    visibility tracking in useTabNavigation can pick the correct active tab).
 * 2. Inside individual tab components for their own data-loading state
 *    (W2.2 progressive adoption — single source of truth for body skeleton shape).
 *
 * In fullscreen tab mode (TabPageTemplate — single tab visible at a time)
 * the generic 3-rect placeholder is suppressed and we render nothing. The
 * fullscreen layout reserves no space we need to fill, and a default
 * placeholder before each tab's native skeleton creates a 3-stage flicker
 * (default → native → data) on tab switches. Tabs that ship a native
 * column-aware skeleton (e.g. PetHealthTab) keep showing it; tabs that
 * still use TabBodySkeleton render an empty area in fullscreen mode until
 * their data lands. Drawer/scroll mode keeps the placeholder so layout
 * reservation for visibility tracking stays consistent.
 */
export function TabBodySkeleton() {
  useSignals();
  if (spaceStore.isFullscreen.value) {
    return null;
  }
  return (
    <div className="space-y-5 animate-pulse px-5">
      <div className="h-32 w-full rounded-lg bg-slate-200 dark:bg-slate-700" />
      <div className="h-32 w-full rounded-lg bg-slate-200 dark:bg-slate-700" />
      <div className="h-32 w-full rounded-lg bg-slate-200 dark:bg-slate-700" />
    </div>
  );
}
