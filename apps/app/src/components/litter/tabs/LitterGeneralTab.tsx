import { useSelectedEntity } from "@/contexts/SpaceContext";
import { spaceStore } from "@breedhub/rxdb-store";
import { useSignals } from "@preact/signals-react/runtime";
import { cn } from "@ui/lib/utils";
import {
  Cake,
  CircleCheckBig,
  HouseHeart,
  MapPin,
  Mars,
  UserStar,
  Venus,
} from "lucide-react";
import { useEffect } from "react";
import { Link } from "react-router-dom";

/**
 * Link entity (Father, Mother, Breeder, Kennel)
 */
interface LinkEntity {
  id?: string;
  name: string;
  url?: string;
  slug?: string;
}

/**
 * Dictionary value (Status, Country)
 */
interface DictionaryValue {
  id?: string;
  name: string;
}

/**
 * Litter general data
 */
interface LitterGeneralData {
  father?: LinkEntity;
  mother?: LinkEntity;
  dateOfBirth?: string;
  breeder?: LinkEntity;
  kennel?: LinkEntity;
  country?: DictionaryValue;
  status?: DictionaryValue;
  maleCount?: number;
  femaleCount?: number;
}

// Mock data for visual development
const MOCK_DATA: LitterGeneralData = {
  father: {
    id: "1",
    name: "Champion Rocky vom Haus",
    slug: "champion-rocky-vom-haus",
  },
  mother: {
    id: "2",
    name: "Luna of Golden Dreams",
    slug: "luna-of-golden-dreams",
  },
  dateOfBirth: "2024-06-15",
  breeder: {
    id: "3",
    name: "John Smith",
    slug: "john-smith",
  },
  kennel: {
    id: "4",
    name: "Königsberg Kennel",
    slug: "konigsberg-kennel",
  },
  country: { id: "de", name: "Germany" },
  status: { id: "1", name: "Born" },
  maleCount: 3,
  femaleCount: 2,
};

/**
 * EntityLink - Renders a link to an entity or plain text
 */
function EntityLink({ entity }: { entity?: LinkEntity }) {
  if (!entity) return <span className="text-muted-foreground">—</span>;

  const url = entity.slug ? `/${entity.slug}` : entity.url;

  if (url) {
    return (
      <Link to={url} className="text-primary hover:underline">
        {entity.name}
      </Link>
    );
  }

  return <span>{entity.name}</span>;
}

/**
 * InfoRow - Single row in the info grid
 */
function InfoRow({
  icon,
  label,
  subLabel,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  subLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <span className="text-secondary-400">{icon}</span>
      <div className="flex flex-col leading-tight">
        <span className="text-secondary">{label}</span>
        {subLabel && <span className="text-secondary text-sm">{subLabel}</span>}
      </div>
      <div>{children}</div>
    </>
  );
}

/**
 * Fieldset - Section wrapper with legend
 */
function Fieldset({
  legend,
  children,
}: {
  legend: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="border border-border rounded-lg">
      <legend className="ml-4 px-2 text-sm text-muted-foreground">
        {legend}
      </legend>
      <div className="p-4 pt-2">{children}</div>
    </fieldset>
  );
}

/**
 * Format date to locale string
 */
function formatDate(dateString?: string): string {
  if (!dateString) return "—";
  try {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateString;
  }
}

interface LitterGeneralTabProps {
  onLoadedCount?: (count: number) => void;
}

/**
 * LitterGeneralTab - Litter general information
 *
 * Displays:
 * 1. Birth details - Father, Mother, DOB
 * 2. Origin and Ownership - Breeder, Kennel, Country
 * 3. Additional data - Status, Males count, Females count
 *
 * Based on Angular: litter-info.component.ts
 */
export function LitterGeneralTab({ onLoadedCount }: LitterGeneralTabProps) {
  useSignals();

  const selectedEntity = useSelectedEntity();
  const isFullscreen = spaceStore.isFullscreen.value;

  // TODO: Load real data from entity
  // For now using mock data
  const data = MOCK_DATA;

  // Report count after render (always 1 for general info)
  useEffect(() => {
    if (onLoadedCount) {
      onLoadedCount(1);
    }
  }, [onLoadedCount]);

  const iconSize = 16;

  return (
    <div className="flex flex-col space-y-5 px-6 cursor-default">
      {/* Birth details */}
      <Fieldset legend="Birth details">
        <div
          className={cn(
            "flex flex-col",
            isFullscreen && "lg:flex-row lg:divide-x divide-border"
          )}
        >
          {/* Father & Mother */}
          <div className="grid grid-cols-[16px_60px_1fr] sm:grid-cols-[22px_70px_1fr] items-center gap-3 px-4 pb-2 flex-1">
            <InfoRow icon={<Mars size={iconSize} />} label="Father">
              <EntityLink entity={data.father} />
            </InfoRow>
            <InfoRow icon={<Venus size={iconSize} />} label="Mother">
              <EntityLink entity={data.mother} />
            </InfoRow>
          </div>

          {/* DOB */}
          <div className="grid grid-cols-[16px_60px_1fr] sm:grid-cols-[22px_70px_1fr] items-center gap-3 px-4 pb-2 flex-1">
            <InfoRow icon={<Cake size={iconSize} />} label="DOB">
              <span>{formatDate(data.dateOfBirth)}</span>
            </InfoRow>
          </div>
        </div>
      </Fieldset>

      {/* Origin and Ownership */}
      <Fieldset legend="Origin and Ownership">
        <div
          className={cn(
            "flex flex-col",
            isFullscreen && "md:flex-row md:divide-x divide-border"
          )}
        >
          <div className="grid grid-cols-[16px_60px_1fr] sm:grid-cols-[22px_70px_1fr] items-center gap-3 px-4 pb-2 flex-1">
            <InfoRow icon={<UserStar size={iconSize} />} label="Breeder">
              <EntityLink entity={data.breeder} />
            </InfoRow>
            <InfoRow icon={<HouseHeart size={iconSize} />} label="Kennel">
              <EntityLink entity={data.kennel} />
            </InfoRow>
            <InfoRow icon={<MapPin size={iconSize} />} label="Country">
              <span>{data.country?.name || "—"}</span>
            </InfoRow>
          </div>
        </div>
      </Fieldset>

      {/* Additional data */}
      <Fieldset legend="Additional data">
        <div
          className={cn(
            "grid gap-3 px-4 pb-2",
            isFullscreen && "md:grid-cols-2"
          )}
        >
          <div className="grid grid-cols-[16px_70px_1fr] sm:grid-cols-[22px_80px_1fr] items-center gap-3">
            <InfoRow icon={<CircleCheckBig size={iconSize} />} label="Status">
              <span>{data.status?.name || "—"}</span>
            </InfoRow>
          </div>
          {data.maleCount !== undefined && data.maleCount > 0 && (
            <div className="grid grid-cols-[16px_70px_1fr] sm:grid-cols-[22px_80px_1fr] items-center gap-3">
              <InfoRow icon={<Mars size={iconSize} />} label="Males">
                <span>{data.maleCount}</span>
              </InfoRow>
            </div>
          )}
          {data.femaleCount !== undefined && data.femaleCount > 0 && (
            <div className="grid grid-cols-[16px_70px_1fr] sm:grid-cols-[22px_80px_1fr] items-center gap-3">
              <InfoRow icon={<Venus size={iconSize} />} label="Females">
                <span>{data.femaleCount}</span>
              </InfoRow>
            </div>
          )}
        </div>
      </Fieldset>
    </div>
  );
}
