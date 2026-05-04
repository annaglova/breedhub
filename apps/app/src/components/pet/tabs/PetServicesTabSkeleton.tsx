import { cn } from "@ui/lib/utils";
import { ShoppingCart } from "lucide-react";

interface PetServicesTabSkeletonProps {
  isFullscreen?: boolean;
}

/**
 * Native skeleton for PetServicesTab.
 *
 * Mirrors the dominant section: services grid (icon + name + price).
 * Skips the conditional "Children available for sale" sub-section
 * (only rendered when the pet has the Children-for-sale service) and
 * the Service-features chip strip (also conditional).
 */
export function PetServicesTabSkeleton({
  isFullscreen = false,
}: PetServicesTabSkeletonProps) {
  const serviceCount = isFullscreen ? 4 : 3;

  return (
    <div
      className="flex flex-col space-y-8 cursor-default"
      aria-busy="true"
      aria-live="polite"
    >
      <div
        className={cn(
          "grid gap-3",
          isFullscreen ? "grid-cols-2" : "grid-cols-1",
        )}
      >
        {Array.from({ length: serviceCount }).map((_, index) => (
          <div
            key={`service-${index}`}
            className="card card-rounded flex items-center space-x-5 p-6 lg:px-8 bg-even-card-ground"
          >
            <span className="text-secondary-400">
              <ShoppingCart className="h-4 w-4" />
            </span>
            <span className="font-bold relative">
              <span className="invisible">Service name</span>
              <span className="absolute left-0 top-1/2 -translate-y-1/2 h-3.5 w-28 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
            </span>
            <div className="flex space-x-2 ml-auto items-center">
              <span>Price:</span>
              <div className="relative">
                <span className="invisible">{"\u00A0"}</span>
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-3.5 w-12 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
              </div>
              <div className="relative">
                <span className="invisible">{"\u00A0"}</span>
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-3 w-8 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
