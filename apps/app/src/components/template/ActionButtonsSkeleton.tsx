export interface ActionSkeletonItem {
  id: string;
  /** Used as an `invisible` text spacer — the placeholder ends up the same
   *  width the real button will measure to once it renders. */
  label: string;
  /** Real button stays a 36×36 icon-only circle on every breakpoint
   *  (e.g. NameOutlet's Patronate button outside xl+fullscreen). When set,
   *  the placeholder doesn't expand on `sm`. */
  iconOnly?: boolean;
  /** Extra Tailwind classes for the placeholder — used when the real button
   *  has bespoke margins (e.g. NameOutlet's Edit button has `mr-4`). */
  extraClassName?: string;
}

interface ActionButtonsSkeletonProps {
  /** Items the action row will render once data loads. The skeleton
   *  produces one placeholder per item with a width matching the live
   *  button shape (icon + invisible label). */
  items: ActionSkeletonItem[];
  /** True when a `⋮` dropdown will sit at the end of the row — adds a
   *  36×36 circle placeholder. */
  hasDropdown: boolean;
}

/**
 * Config-driven action-buttons skeleton — Fragment-only.
 *
 * Renders the placeholder buttons themselves; the surrounding flex/gap
 * wrapper is the caller's responsibility. That way the skeleton drops into
 * the SAME flex slot as the real buttons (AvatarOutlet's
 * `mb-1 ml-auto flex gap-2`, NameOutlet's `flex gap-1`, etc.) and
 * inherits the exact spacing — no swap drift, no duplicate wrapper math.
 */
export function ActionButtonsSkeleton({
  items,
  hasDropdown,
}: ActionButtonsSkeletonProps) {
  if (items.length === 0 && !hasDropdown) {
    return null;
  }

  return (
    <>
      {items.map((item) => {
        // Shape mirrors the real button (`rounded-full h-[2.25rem]
        // w-[2.25rem] sm:w-auto sm:px-4 text-base`). Inner spacers — a
        // 16px icon-sized box and an invisible label — drive the same
        // measured width so swapping skeleton ↔ real causes no shift.
        const widthClass = item.iconOnly
          ? "w-[2.25rem]"
          : "w-[2.25rem] sm:w-auto sm:px-4";
        return (
          <div
            key={item.id}
            role="presentation"
            aria-hidden="true"
            className={`flex items-center justify-center rounded-full h-[2.25rem] bg-slate-200 dark:bg-slate-700 animate-pulse ${widthClass} ${item.extraClassName ?? ""}`}
          >
            <div className="size-4 shrink-0" aria-hidden="true" />
            {!item.iconOnly && (
              <span className="hidden sm:inline ml-2 invisible text-base font-semibold">
                {item.label}
              </span>
            )}
          </div>
        );
      })}
      {hasDropdown && (
        <div
          role="presentation"
          aria-hidden="true"
          className="size-[2.25rem] rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse shrink-0"
        />
      )}
    </>
  );
}
