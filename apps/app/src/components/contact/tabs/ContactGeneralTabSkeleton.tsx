import { Fieldset, InfoRow } from "@/components/shared/InfoRow";
import { cn } from "@ui/lib/utils";
import { Building2, Mail, MapPin, Phone } from "lucide-react";

interface ContactGeneralTabSkeletonProps {
  isFullscreen?: boolean;
}

/**
 * Native skeleton for ContactGeneralTab — single Info fieldset with
 * Country/City | Phone/Email columns. Social network and Languages
 * sections are conditional in real (rendered only when data exists)
 * so skipped here.
 */
export function ContactGeneralTabSkeleton({
  isFullscreen = false,
}: ContactGeneralTabSkeletonProps) {
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
            <InfoRow icon={<MapPin size={iconSize} />} label="Country">
              <Bar width="w-24" />
            </InfoRow>
            <InfoRow icon={<Building2 size={iconSize} />} label="City">
              <Bar width="w-24" />
            </InfoRow>
          </div>
          <div className="grid grid-cols-[16px_70px_1fr] sm:grid-cols-[22px_80px_1fr] items-center gap-3 px-4 pb-2 flex-1">
            <InfoRow icon={<Phone size={iconSize} />} label="Phone">
              <Bar width="w-32" />
            </InfoRow>
            <InfoRow icon={<Mail size={iconSize} />} label="Email">
              <Bar width="w-40" />
            </InfoRow>
          </div>
        </div>
      </Fieldset>
    </div>
  );
}
