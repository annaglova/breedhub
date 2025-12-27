import { useSelectedEntity } from "@/contexts/SpaceContext";
import { spaceStore } from "@breedhub/rxdb-store";
import { useSignals } from "@preact/signals-react/runtime";
import { cn } from "@ui/lib/utils";
import { Link } from "react-router-dom";
import {
  Calendar,
  MapPin,
  User,
  UserCheck,
  Building2,
  Activity,
  Palette,
  Scale,
  Mars,
  Venus,
} from "lucide-react";

/**
 * Link entity (Father, Mother, Breeder, Owner, Kennel)
 */
interface LinkEntity {
  id?: string;
  name: string;
  url?: string;
  slug?: string;
}

/**
 * Dictionary value (Sex, Country, Status, etc.)
 */
interface DictionaryValue {
  id?: string;
  name: string;
}

/**
 * Pet general data
 */
interface PetGeneralData {
  father?: LinkEntity;
  mother?: LinkEntity;
  sex?: DictionaryValue;
  dateOfBirth?: string;
  breeder?: LinkEntity;
  breederKennel?: LinkEntity;
  countryOfBirth?: DictionaryValue;
  owner?: LinkEntity;
  ownerKennel?: LinkEntity;
  countryOfStay?: DictionaryValue;
  petStatus?: DictionaryValue;
  coatType?: DictionaryValue;
  coatColor?: DictionaryValue;
  weight?: number;
}

// Mock data for visual development
const MOCK_DATA: PetGeneralData = {
  father: {
    id: "1",
    name: "Champion Maximus vom Königsberg",
    slug: "champion-maximus-vom-konigsberg",
  },
  mother: {
    id: "2",
    name: "Beautiful Bella aus Bayern",
    slug: "beautiful-bella-aus-bayern",
  },
  sex: { id: "male", name: "Male" },
  dateOfBirth: "2021-05-15",
  breeder: {
    id: "3",
    name: "John Smith",
    slug: "john-smith",
  },
  breederKennel: {
    id: "4",
    name: "Königsberg Kennel",
    slug: "konigsberg-kennel",
  },
  countryOfBirth: { id: "de", name: "Germany" },
  owner: {
    id: "5",
    name: "Anna Johnson",
    slug: "anna-johnson",
  },
  ownerKennel: {
    id: "6",
    name: "Golden Valley Kennel",
    slug: "golden-valley-kennel",
  },
  countryOfStay: { id: "us", name: "United States" },
  petStatus: { id: "1", name: "Active producer" },
  coatType: { id: "1", name: "Long" },
  coatColor: { id: "1", name: "Black and Tan" },
  weight: 32.5,
};

/**
 * EntityLink - Renders a link to an entity or plain text
 */
function EntityLink({ entity }: { entity?: LinkEntity }) {
  if (!entity) return <span className="text-muted-foreground">—</span>;

  const url = entity.slug ? `/${entity.slug}` : entity.url;

  if (url) {
    return (
      <Link to={url} className="text-primary hover:underline font-medium">
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
      <div className="flex flex-col">
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
      <legend className="ml-4 px-2 text-sm font-medium text-muted-foreground">
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

interface PetGeneralTabProps {
  onLoadedCount?: (count: number) => void;
}

/**
 * PetGeneralTab - Pet general information
 *
 * Displays:
 * 1. Birth details - Father, Mother, Sex, DOB
 * 2. Origin and Ownership - Breeder, Kennel, Countries, Owner
 * 3. Additional data - Status, Coat type, Coat color, Weight
 *
 * Based on Angular: pet-general.component.ts
 */
export function PetGeneralTab({ onLoadedCount }: PetGeneralTabProps) {
  useSignals();

  const selectedEntity = useSelectedEntity();
  const isFullscreen = spaceStore.isFullscreen.value;

  // TODO: Load real data from entity
  // For now using mock data
  const data = MOCK_DATA;

  // Report count (always 1 for general info)
  if (onLoadedCount) {
    onLoadedCount(1);
  }

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
            <InfoRow
              icon={<Mars size={iconSize} />}
              label="Father"
            >
              <EntityLink entity={data.father} />
            </InfoRow>
            <InfoRow
              icon={<Venus size={iconSize} />}
              label="Mother"
            >
              <EntityLink entity={data.mother} />
            </InfoRow>
          </div>

          {/* Sex & DOB */}
          <div className="grid grid-cols-[16px_60px_1fr] sm:grid-cols-[22px_70px_1fr] items-center gap-3 px-4 pb-2 flex-1">
            <InfoRow icon={<span className="flex -space-x-1"><Mars size={iconSize - 2} /><Venus size={iconSize - 2} /></span>} label="Sex">
              <span>{data.sex?.name || "—"}</span>
            </InfoRow>
            <InfoRow icon={<Calendar size={iconSize} />} label="DOB">
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
          {/* Breeder side */}
          <div className="grid grid-cols-[16px_60px_1fr] sm:grid-cols-[22px_70px_1fr] items-center gap-3 px-4 pb-2 flex-1">
            <InfoRow icon={<UserCheck size={iconSize} />} label="Breeder">
              <EntityLink entity={data.breeder} />
            </InfoRow>
            <InfoRow
              icon={<Building2 size={iconSize} />}
              label="Kennel"
              subLabel="breeder"
            >
              <EntityLink entity={data.breederKennel} />
            </InfoRow>
            <InfoRow
              icon={<MapPin size={iconSize} />}
              label="Country"
              subLabel="of birth"
            >
              <span>{data.countryOfBirth?.name || "—"}</span>
            </InfoRow>
          </div>

          {/* Divider for non-fullscreen */}
          {!isFullscreen && <div className="border-t border-border my-2" />}

          {/* Owner side */}
          <div className="grid grid-cols-[16px_60px_1fr] sm:grid-cols-[22px_70px_1fr] items-center gap-3 px-4 pb-2 flex-1">
            <InfoRow icon={<User size={iconSize} />} label="Owner">
              <EntityLink entity={data.owner} />
            </InfoRow>
            <InfoRow
              icon={<Building2 size={iconSize} />}
              label="Kennel"
              subLabel="owner"
            >
              <EntityLink entity={data.ownerKennel} />
            </InfoRow>
            <InfoRow
              icon={<MapPin size={iconSize} />}
              label="Country"
              subLabel="of stay"
            >
              <span>{data.countryOfStay?.name || "—"}</span>
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
            <InfoRow icon={<Activity size={iconSize} />} label="Status">
              <span>{data.petStatus?.name || "—"}</span>
            </InfoRow>
          </div>
          <div className="grid grid-cols-[16px_70px_1fr] sm:grid-cols-[22px_80px_1fr] items-center gap-3">
            <InfoRow icon={<Palette size={iconSize} />} label="Coat type">
              <span>{data.coatType?.name || "—"}</span>
            </InfoRow>
          </div>
          <div className="grid grid-cols-[16px_70px_1fr] sm:grid-cols-[22px_80px_1fr] items-center gap-3">
            <InfoRow icon={<Palette size={iconSize} />} label="Coat color">
              <span>{data.coatColor?.name || "—"}</span>
            </InfoRow>
          </div>
          <div className="grid grid-cols-[16px_70px_1fr] sm:grid-cols-[22px_80px_1fr] items-center gap-3">
            <InfoRow icon={<Scale size={iconSize} />} label="Weight">
              <span>{data.weight ? `${data.weight} kg` : "—"}</span>
            </InfoRow>
          </div>
        </div>
      </Fieldset>
    </div>
  );
}
