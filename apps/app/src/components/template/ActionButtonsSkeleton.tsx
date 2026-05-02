import type { PageMenuItemWithId } from "@/hooks/usePageMenu";

interface ActionButtonsSkeletonProps {
  /** Button items resolved from page-config (e.g. `usePageMenuButtons` /
   *  `usePageMenuDropdown` / `usePageMenu`). The skeleton renders one
   *  placeholder per item — and each placeholder borrows the item's label as
   *  an `invisible` text node, so its width auto-matches what the real
   *  button will measure to. No more N-vs-2 mismatch and no width jump on
   *  hand-off. */
  buttonItems: PageMenuItemWithId[];
  /** True when a `⋮` dropdown will be rendered next to the buttons. Adds a
   *  fixed 36×36 circle placeholder on the right. */
  hasDropdown: boolean;
  className?: string;
}

/**
 * Config-driven action-buttons skeleton.
 *
 * Mirrors the live action-button row shape used by AvatarOutlet (and
 * eventually NameOutlet sticky bar / any other action row) so the
 * placeholder count and widths track whatever the page config will render.
 * Drop into the same flex slot as the real buttons under an `isLoading`
 * branch — no absolute positioning needed, no jump on swap.
 */
export function ActionButtonsSkeleton({
  buttonItems,
  hasDropdown,
  className = "",
}: ActionButtonsSkeletonProps) {
  if (buttonItems.length === 0 && !hasDropdown) {
    return null;
  }

  return (
    <div
      role="presentation"
      aria-hidden="true"
      className={`flex gap-2 ${className}`}
    >
      {buttonItems.map((item) => (
        <div
          key={item.id}
          // Shape mirrors the real button (`rounded-full h-[2.25rem]
          // w-[2.25rem] sm:w-auto sm:px-4 text-base`). Inner spacers — a
          // 16px icon-sized box and an invisible label — drive the same
          // measured width so swapping skeleton ↔ real causes no shift.
          className="flex items-center justify-center rounded-full h-[2.25rem] w-[2.25rem] sm:w-auto sm:px-4 bg-slate-200 dark:bg-slate-700 animate-pulse"
        >
          <div className="size-4 shrink-0" aria-hidden="true" />
          <span className="hidden sm:inline ml-2 invisible text-base font-semibold">
            {item.label}
          </span>
        </div>
      ))}
      {hasDropdown && (
        <div
          className="size-[2.25rem] rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse shrink-0"
          aria-hidden="true"
        />
      )}
    </div>
  );
}
