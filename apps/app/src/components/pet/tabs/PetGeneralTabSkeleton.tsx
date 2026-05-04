import { Fieldset, InfoRow } from "@/components/shared/InfoRow";
import { cn } from "@ui/lib/utils";
import {
  Cake,
  CircleCheckBig,
  HouseHeart,
  MapPin,
  MapPinHouse,
  Mars,
  Palette,
  Scale,
  User,
  UserStar,
  Venus,
  VenusAndMars,
  Waves,
} from "lucide-react";

interface PetGeneralTabSkeletonProps {
  isFullscreen?: boolean;
}

/**
 * Native skeleton for PetGeneralTab.
 *
 * Mirrors the real DOM 1:1: same Fieldset wrappers, same grid columns,
 * same icons + static labels (they don't change between skeleton and
 * real). Only the value cells render as placeholder bars, so the swap
 * to real content is jump-free for everything except the value text
 * itself.
 *
 * Lives in its own file so it can serve as both the in-component
 * loader for PetGeneralTab and the Suspense fallback in tab-registry.
 */
export function PetGeneralTabSkeleton({
  isFullscreen = false,
}: PetGeneralTabSkeletonProps) {
  const iconSize = 16;
  // Value placeholder — width chosen to match typical content (entity
  // name, dictionary value, formatted date). Height matches the InfoRow
  // text line so vertical rhythm doesn't shift on swap.
  const Bar = ({ width = "w-32" }: { width?: string }) => (
    <div className={cn("h-3.5 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse", width)} />
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
            <InfoRow icon={<VenusAndMars size={iconSize} />} label="Sex">
              <Bar width="w-16" />
            </InfoRow>
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
            <InfoRow
              icon={<HouseHeart size={iconSize} />}
              label="Kennel"
              subLabel="breeder"
            >
              <Bar width="w-40" />
            </InfoRow>
            <InfoRow
              icon={<MapPin size={iconSize} />}
              label="Country"
              subLabel="of birth"
            >
              <Bar width="w-24" />
            </InfoRow>
          </div>

          {!isFullscreen && <div className="border-t border-border my-2" />}

          <div className="grid grid-cols-[16px_60px_1fr] sm:grid-cols-[22px_70px_1fr] items-center gap-3 px-4 pb-2 flex-1">
            <InfoRow icon={<User size={iconSize} />} label="Owner">
              <Bar width="w-40" />
            </InfoRow>
            <InfoRow
              icon={<HouseHeart size={iconSize} />}
              label="Kennel"
              subLabel="owner"
            >
              <Bar width="w-40" />
            </InfoRow>
            <InfoRow
              icon={<MapPinHouse size={iconSize} />}
              label="Country"
              subLabel="of stay"
            >
              <Bar width="w-24" />
            </InfoRow>
          </div>
        </div>
      </Fieldset>

      {/* Additional data */}
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
          <div className="grid grid-cols-[16px_70px_1fr] sm:grid-cols-[22px_80px_1fr] items-center gap-3">
            <InfoRow icon={<Waves size={iconSize} />} label="Coat type">
              <Bar width="w-32" />
            </InfoRow>
          </div>
          <div className="grid grid-cols-[16px_70px_1fr] sm:grid-cols-[22px_80px_1fr] items-center gap-3">
            <InfoRow icon={<Palette size={iconSize} />} label="Coat color">
              <Bar width="w-32" />
            </InfoRow>
          </div>
          <div className="grid grid-cols-[16px_70px_1fr] sm:grid-cols-[22px_80px_1fr] items-center gap-3">
            <InfoRow icon={<Scale size={iconSize} />} label="Weight">
              <Bar width="w-16" />
            </InfoRow>
          </div>
        </div>
      </Fieldset>
    </div>
  );
}
