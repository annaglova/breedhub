interface NavigationButtonsSkeletonProps {
  className?: string;
}

/**
 * NavigationButtonsSkeleton - shape-accurate placeholder for NavigationButtons
 *
 * Two grouped pill halves whose dimensions are inherited from the live
 * button classes (`flex items-center justify-center px-2.5 text-xl`) plus a
 * 20px spacer instead of an icon — so width and height auto-match the real
 * NavigationButtons, eliminating the position jump on hand-off. Fill tint
 * matches the legacy cover-skeleton circles (`bg-slate-300/50`), since the
 * cover background is slate-200 and a flat slate-200 pill would disappear.
 */
export function NavigationButtonsSkeleton({
  className = "",
}: NavigationButtonsSkeletonProps) {
  // Border on every side except the inner edge — matches the live
  // NavigationButtons' 1px border, keeps both halves the exact same height
  // as the real buttons, and preserves the hairline gap between halves.
  const baseHalf =
    "flex items-center justify-center px-2.5 text-xl bg-slate-300/50 dark:bg-slate-600/50 border-slate-300/50 dark:border-slate-600/50";

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
