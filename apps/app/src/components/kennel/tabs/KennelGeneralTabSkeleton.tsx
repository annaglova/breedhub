import { Fieldset, InfoRow } from "@/components/shared/InfoRow";
import { cn } from "@ui/lib/utils";
import { Building2, Globe, Mail, MapPin, Phone, User } from "lucide-react";

interface KennelGeneralTabSkeletonProps {
  isFullscreen?: boolean;
}

/**
 * Native skeleton for KennelGeneralTab — Info + Contact fieldsets with
 * static icons/labels and placeholder bars for values. Social network
 * fieldset is conditional in real (only when there's data) so skipped
 * here to avoid rendering a section that may never appear.
 */
export function KennelGeneralTabSkeleton({
  isFullscreen = false,
}: KennelGeneralTabSkeletonProps) {
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
          <div className="grid grid-cols-[16px_70px_1fr] sm:grid-cols-[22px_80px_1fr] items-center gap-3 px-4 pb-2 flex-1">
            <InfoRow icon={<User size={iconSize} />} label="Owner">
              <Bar width="w-40" />
            </InfoRow>
            <InfoRow icon={<Globe size={iconSize} />} label="Federation">
              <Bar width="w-32" />
            </InfoRow>
          </div>
          <div className="grid grid-cols-[16px_70px_1fr] sm:grid-cols-[22px_80px_1fr] items-center gap-3 px-4 pb-2 flex-1">
            <InfoRow icon={<MapPin size={iconSize} />} label="Country">
              <Bar width="w-24" />
            </InfoRow>
            <InfoRow icon={<Building2 size={iconSize} />} label="City">
              <Bar width="w-24" />
            </InfoRow>
          </div>
        </div>
      </Fieldset>

      {/* Contact */}
      <Fieldset legend="Contact">
        <div className="grid grid-cols-[16px_70px_1fr] sm:grid-cols-[22px_80px_1fr] items-center gap-3 px-4 pb-2">
          <InfoRow icon={<Phone size={iconSize} />} label="Phone">
            <Bar width="w-32" />
          </InfoRow>
          <InfoRow icon={<Mail size={iconSize} />} label="Email">
            <Bar width="w-40" />
          </InfoRow>
        </div>
      </Fieldset>
    </div>
  );
}
