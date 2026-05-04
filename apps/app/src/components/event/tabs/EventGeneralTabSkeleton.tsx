import React from "react";
import { Fieldset, InfoRow } from "@/components/shared/InfoRow";
import { cn } from "@ui/lib/utils";
import { Calendar, Flag, MapPin, Trophy } from "lucide-react";

interface EventGeneralTabSkeletonProps {
  isFullscreen?: boolean;
}

/**
 * Native skeleton for EventGeneralTab — Info fieldset with
 * Category/Date | Country/Status, plus a Judges fieldset with 2 avatar+
 * name placeholder rows mirroring the real grid.
 */
export function EventGeneralTabSkeleton({
  isFullscreen = false,
}: EventGeneralTabSkeletonProps) {
  const iconSize = 16;
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
      {/* Info */}
      <Fieldset legend="Info">
        <div
          className={cn(
            "flex flex-col",
            isFullscreen && "lg:flex-row lg:divide-x divide-border",
          )}
        >
          <div className="grid grid-cols-[16px_60px_1fr] sm:grid-cols-[22px_70px_1fr] items-center gap-3 px-4 pb-2 flex-1">
            <InfoRow icon={<Trophy size={iconSize} />} label="Category">
              <Bar width="w-32" />
            </InfoRow>
            <InfoRow icon={<Calendar size={iconSize} />} label="Date">
              <Bar width="w-24" />
            </InfoRow>
          </div>
          <div className="grid grid-cols-[16px_60px_1fr] sm:grid-cols-[22px_70px_1fr] items-center gap-3 px-4 pb-2 flex-1">
            <InfoRow icon={<MapPin size={iconSize} />} label="Country">
              <Bar width="w-24" />
            </InfoRow>
            <InfoRow icon={<Flag size={iconSize} />} label="Status">
              <Bar width="w-24" />
            </InfoRow>
          </div>
        </div>
      </Fieldset>

      {/* Judges — placeholder avatar + name rows mirror real
          `grid-cols-[42px_1fr] gap-5` layout. */}
      <Fieldset legend="Judges">
        <div className="grid grid-cols-[42px_1fr] items-center gap-5 px-4 pb-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <React.Fragment key={`judge-${i}`}>
              <div className="size-10 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
              <div>
                <Bar width="w-40" />
              </div>
            </React.Fragment>
          ))}
        </div>
      </Fieldset>
    </div>
  );
}
