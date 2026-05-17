import idleDogIllustration from "@/assets/images/pettypes/dog-logo-muted.svg";
import { cn } from "@ui/lib/utils";
import { Inbox } from "lucide-react";
import { useOutletContext } from "react-router-dom";

/**
 * Reads the `listIsEmpty` flag that `SpaceComponent` publishes on its drawer
 * Outlet context — true once the filtered list has settled with zero results.
 * Extracted so both PublicPageTemplate and EditPageTemplate can share the
 * same "show idle affordance" decision instead of re-implementing the
 * outletContext destructure.
 */
export function useDrawerListEmpty(): boolean {
  const ctx = useOutletContext<{ listIsEmpty?: boolean } | null>();
  return !!ctx?.listIsEmpty;
}

interface DrawerEmptyAffordanceProps {
  className?: string;
}

/**
 * "Nothing to show" idle state for the drawer pane. Renders when the list
 * pane has settled with zero results so the right side stops looking like a
 * perpetual loader. Caller wraps it in its own SpaceProvider — this stays a
 * pure presentational component so it can be reused from any drawer template.
 */
export function DrawerEmptyAffordance({ className }: DrawerEmptyAffordanceProps) {
  return (
    <div
      className={cn(
        "size-full flex items-center justify-center content-padding-sm",
        "bg-white dark:bg-slate-900",
        className,
      )}
    >
      <div className="flex flex-col items-center text-slate-500">
        <img
          src={idleDogIllustration}
          alt=""
          aria-hidden="true"
          className="h-44 w-44 opacity-90"
        />
        <p className="mt-4 text-sm">Nothing to show</p>
        <Inbox className="mt-3 h-6 w-6 text-slate-300" aria-hidden="true" />
      </div>
    </div>
  );
}
