import { Fieldset, InfoRow } from "@/components/shared/InfoRow";
import { cn } from "@ui/lib/utils";
import { Calendar, Dog, Home } from "lucide-react";

interface ContactBreederTabSkeletonProps {
  isFullscreen?: boolean;
}

/**
 * Native skeleton for ContactBreederTab.
 *
 * Mirrors the kennel-group layout: a Fieldset with Kennel/Since/Breeds
 * info rows, a section header "Offspring", then a grid of PetCard
 * placeholders. Renders one kennel group above-fold; the dynamic
 * multi-kennel section is impossible to predict synchronously.
 */
export function ContactBreederTabSkeleton({
  isFullscreen = false,
}: ContactBreederTabSkeletonProps) {
  const iconSize = 16;
  const offspringCount = isFullscreen ? 6 : 4;

  const Bar = ({ width = "w-32" }: { width?: string }) => (
    <div
      className={cn(
        "h-3.5 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse",
        width,
      )}
    />
  );

  return (
    <div
      className="flex flex-col space-y-5 cursor-default"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="flex flex-col space-y-4">
        {/* Kennel info — Fieldset structure mirrors the real kennel
            group; legend uses a single space (kennel name is dynamic
            and not load-bearing for layout reservation). */}
        <Fieldset legend=" ">
          <div className="grid grid-cols-[16px_50px_1fr] sm:grid-cols-[22px_60px_1fr] items-center gap-3 px-4 pb-2">
            <InfoRow icon={<Home size={iconSize} />} label="Kennel">
              <Bar width="w-40" />
            </InfoRow>
            <InfoRow icon={<Calendar size={iconSize} />} label="Since">
              <Bar width="w-16" />
            </InfoRow>
            <InfoRow icon={<Dog size={iconSize} />} label="Breeds">
              <Bar width="w-48" />
            </InfoRow>
          </div>
        </Fieldset>

        {/* Section header — Offspring */}
        <div className="flex w-full items-center space-x-2">
          <span className="font-bold text-secondary whitespace-nowrap">
            Offspring
          </span>
          <div className="bg-secondary-200 h-[1px] w-full"></div>
        </div>

        {/* Offspring grid — PetCard placeholders */}
        <div
          className={cn(
            "grid gap-3 sm:grid-cols-2",
            isFullscreen && "lg:grid-cols-3 xxl:grid-cols-4",
          )}
        >
          {Array.from({ length: offspringCount }).map((_, index) => (
            <div
              key={`offspring-${index}`}
              className="card card-rounded flex flex-col items-center justify-center px-6 py-3 sm:px-8"
            >
              {/* Sex bar */}
              <div className="mb-4 w-36 sm:w-44 h-1.5 rounded-sm bg-slate-200 dark:bg-slate-700 animate-pulse" />
              {/* Avatar */}
              <div className="size-36 sm:size-44 rounded-xl border border-surface-border bg-slate-200 dark:bg-slate-700 animate-pulse" />
              {/* Name */}
              <div className="my-3 flex min-h-12 w-48 md:w-52 items-center justify-center">
                <div className="relative">
                  <span className="invisible">{"\u00A0"}</span>
                  <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 h-3.5 w-32 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
                </div>
              </div>
              {/* Divider */}
              <div className="flex w-full flex-col border-t border-surface-border">
                <em className="mb-2 mt-3 text-center text-sm relative block">
                  <span className="invisible">{"\u00A0"}</span>
                  <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 h-3 w-20 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
                </em>
                <div className="h-30 flex items-start overflow-hidden text-base mt-1">
                  <div
                    className="grid w-full gap-x-1 gap-y-3"
                    style={{ gridTemplateColumns: "48px auto" }}
                  >
                    <span className="text-secondary">Father</span>
                    <div className="relative">
                      <span className="invisible">{"\u00A0"}</span>
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 h-3.5 w-32 max-w-full rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
                    </div>
                    <span className="text-secondary">Mother</span>
                    <div className="relative">
                      <span className="invisible">{"\u00A0"}</span>
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 h-3.5 w-32 max-w-full rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
