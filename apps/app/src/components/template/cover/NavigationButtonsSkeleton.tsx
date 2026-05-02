interface NavigationButtonsSkeletonProps {
  /** Mirrors the real `NavigationButtons` mode prop. `white` for cover
   *  overlays (the cover background is slate-200, so the pills use
   *  `bg-slate-300/50` to stay visible). `default` for the white
   *  card-ground (sticky NameOutlet) — flat `bg-slate-200` matches the
   *  rest of the card-ground skeletons. */
  mode?: "white" | "default";
  className?: string;
}

/**
 * NavigationButtonsSkeleton - shape-accurate placeholder for NavigationButtons
 *
 * Two grouped pill halves whose dimensions are inherited from the live
 * button classes (`flex items-center justify-center px-2.5 text-xl`) plus a
 * 20px spacer instead of an icon — so width and height auto-match the real
 * NavigationButtons, eliminating the position jump on hand-off.
 */
export function NavigationButtonsSkeleton({
  mode = "white",
  className = "",
}: NavigationButtonsSkeletonProps) {
  // Border on every side except the inner edge — matches the live
  // NavigationButtons' 1px border, keeps both halves the exact same height
  // as the real buttons, and preserves the hairline gap between halves.
  const fillClass =
    mode === "white"
      ? "bg-slate-300/50 dark:bg-slate-600/50 border-slate-300/50 dark:border-slate-600/50"
      : "bg-slate-200 dark:bg-slate-700 border-slate-200 dark:border-slate-700";
  const baseHalf = `flex items-center justify-center px-2.5 text-xl ${fillClass}`;

  return (
    <div
      role="presentation"
      aria-hidden="true"
      className={`flex shrink-0 animate-pulse ${className}`}
    >
      <div
        className={`${baseHalf} border-y border-l`}
        style={{ borderRadius: "2rem 0 0 2rem" }}
      >
        <div className="size-5" aria-hidden="true" />
      </div>
      <div className="w-px bg-transparent" aria-hidden="true" />
      <div
        className={`${baseHalf} border-y border-r`}
        style={{ borderRadius: "0 2rem 2rem 0" }}
      >
        <div className="size-5" aria-hidden="true" />
      </div>
    </div>
  );
}
