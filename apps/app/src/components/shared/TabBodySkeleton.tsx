/**
 * TabBodySkeleton — shared body placeholder for tab content while it loads.
 *
 * Used in two places:
 * 1. tab-registry.ts Suspense fallback while a lazy tab chunk is downloading
 *    (keeps each tab section occupying consistent vertical space so scroll-mode
 *    visibility tracking in useTabNavigation can pick the correct active tab).
 * 2. Inside individual tab components for their own data-loading state
 *    (W2.2 progressive adoption — single source of truth for body skeleton shape).
 */
export function TabBodySkeleton() {
  return (
    <div className="space-y-5 animate-pulse px-5">
      <div className="h-32 w-full rounded-lg bg-slate-200 dark:bg-slate-700" />
      <div className="h-32 w-full rounded-lg bg-slate-200 dark:bg-slate-700" />
      <div className="h-32 w-full rounded-lg bg-slate-200 dark:bg-slate-700" />
    </div>
  );
}
