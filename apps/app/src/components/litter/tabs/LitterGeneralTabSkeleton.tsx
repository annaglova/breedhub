import { Fieldset, InfoRow } from "@/components/shared/InfoRow";
import { cn } from "@ui/lib/utils";
import {
  Cake,
  CircleCheckBig,
  HouseHeart,
  Mars,
  UserStar,
  Venus,
} from "lucide-react";

interface LitterGeneralTabSkeletonProps {
  isFullscreen?: boolean;
}

/**
 * Native skeleton for LitterGeneralTab — same fieldset structure with
 * static icons/labels and placeholder bars for the values.
 */
export function LitterGeneralTabSkeleton({
  isFullscreen = false,
}: LitterGeneralTabSkeletonProps) {
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
      {/* Birth details */}
      <Fieldset legend="Birth details">
        <div
          className={cn(
            "flex flex-col",
            isFullscreen && "lg:flex-row lg:divide-x divide-border",
          )}
        >
          <div className="grid grid-cols-[16px_60px_1fr] sm:grid-cols-[22px_70px_1fr] items-center gap-3 px-4 pb-2 flex-1">
            <InfoRow icon={<Mars size={iconSize} />} label="Father">
              <Bar width="w-40" />
            </InfoRow>
            <InfoRow icon={<Venus size={iconSize} />} label="Mother">
              <Bar width="w-40" />
            </InfoRow>
          </div>
          <div className="grid grid-cols-[16px_60px_1fr] sm:grid-cols-[22px_70px_1fr] items-center gap-3 px-4 pb-2 flex-1">
            <InfoRow icon={<Cake size={iconSize} />} label="DOB">
              <Bar width="w-24" />
            </InfoRow>
          </div>
        </div>
      </Fieldset>

      {/* Origin and Ownership */}
      <Fieldset legend="Origin and Ownership">
        <div
          className={cn(
            "flex flex-col",
            isFullscreen && "md:flex-row md:divide-x divide-border",
          )}
        >
          <div className="grid grid-cols-[16px_60px_1fr] sm:grid-cols-[22px_70px_1fr] items-center gap-3 px-4 pb-2 flex-1">
            <InfoRow icon={<UserStar size={iconSize} />} label="Breeder">
              <Bar width="w-40" />
            </InfoRow>
            <InfoRow icon={<HouseHeart size={iconSize} />} label="Kennel">
              <Bar width="w-40" />
            </InfoRow>
          </div>
        </div>
      </Fieldset>

      {/* Additional data — only Status row (Males/Females are conditional
          on >0 in real, skip in skeleton to avoid showing rows that may
          never render). */}
      <Fieldset legend="Additional data">
        <div
          className={cn(
            "grid gap-3 px-4 pb-2",
            isFullscreen && "md:grid-cols-2",
          )}
        >
          <div className="grid grid-cols-[16px_70px_1fr] sm:grid-cols-[22px_80px_1fr] items-center gap-3">
            <InfoRow icon={<CircleCheckBig size={iconSize} />} label="Status">
              <Bar width="w-24" />
            </InfoRow>
          </div>
        </div>
      </Fieldset>
    </div>
  );
}
