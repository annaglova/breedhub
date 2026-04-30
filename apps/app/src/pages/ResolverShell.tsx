/**
 * ResolverShell — neutral placeholder rendered while a route resolver is
 * still figuring out which entity the URL maps to. Replaces `return null`
 * (blank stage) per SKELETON_LOADING_ARCHITECTURE §P5 / §10 W1.2.
 *
 * Intentionally generic: at this stage we don't yet know the entity type,
 * so we cannot draw a structurally-aware page skeleton. A single calm
 * rounded surface bridges the gap until SpacePage takes over and renders
 * the entity-typed skeleton via its outlets.
 */
export function ResolverShell() {
  return (
    <div
      role="status"
      aria-busy="true"
      className="h-full min-h-[60vh] w-full rounded-3xl bg-slate-100 dark:bg-slate-800/60 animate-pulse"
    />
  );
}
