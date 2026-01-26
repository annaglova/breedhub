import { useSelectedEntity } from "@/contexts/SpaceContext";
import { spaceStore } from "@breedhub/rxdb-store";
import { useSignals } from "@preact/signals-react/runtime";
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
import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";

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

/**
 * Transform selected entity to PetGeneralData format
 * Data comes from entity with joined lookup names in additional field
 */
function transformEntityToGeneralData(entity: any): PetGeneralData {
  if (!entity) return {};

  const additional = entity.additional || {};

  return {
    father: additional.father ? {
      id: entity.father_id,
      name: additional.father.name || additional.father_name,
      slug: additional.father.slug || additional.father_slug,
    } : undefined,
    mother: additional.mother ? {
      id: entity.mother_id,
      name: additional.mother.name || additional.mother_name,
      slug: additional.mother.slug || additional.mother_slug,
    } : undefined,
    sex: additional.sex ? {
      id: entity.sex_id,
      name: additional.sex.name || additional.sex_name,
    } : undefined,
    dateOfBirth: entity.date_of_birth,
    breeder: additional.breeder ? {
      id: entity.breeder_id,
      name: additional.breeder.name || additional.breeder_name,
      slug: additional.breeder.slug || additional.breeder_slug,
    } : undefined,
    breederKennel: additional.kennel ? {
      id: entity.kennel_id,
      name: additional.kennel.name || additional.kennel_name,
      slug: additional.kennel.slug || additional.kennel_slug,
    } : undefined,
    countryOfBirth: additional.country_of_birth ? {
      id: entity.country_of_birth_id,
      name: additional.country_of_birth.name || additional.country_of_birth_name,
    } : undefined,
    owner: additional.owner ? {
      id: entity.owner_id,
      name: additional.owner.name || additional.owner_name,
      slug: additional.owner.slug || additional.owner_slug,
    } : undefined,
    ownerKennel: additional.owner_kennel ? {
      id: entity.owner_kennel_id,
      name: additional.owner_kennel.name || additional.owner_kennel_name,
      slug: additional.owner_kennel.slug || additional.owner_kennel_slug,
    } : undefined,
    countryOfStay: additional.country_of_stay ? {
      id: entity.country_of_stay_id,
      name: additional.country_of_stay.name || additional.country_of_stay_name,
    } : undefined,
    petStatus: additional.pet_status ? {
      id: entity.pet_status_id,
      name: additional.pet_status.name || additional.pet_status_name,
    } : undefined,
    coatType: additional.coat_type ? {
      id: entity.coat_type_id,
      name: additional.coat_type.name || additional.coat_type_name,
    } : undefined,
    coatColor: additional.coat_color ? {
      id: entity.coat_color_id,
      name: additional.coat_color.name || additional.coat_color_name,
    } : undefined,
    weight: entity.weight && entity.weight > 0 ? entity.weight : undefined,
  };
}

/**
 * EntityLink - Renders a link to an entity or plain text
 */
function EntityLink({ entity }: { entity?: LinkEntity }) {
  if (!entity) return <span className="text-muted-foreground">—</span>;

  const url = entity.slug ? `/${entity.slug}` : entity.url;

  if (url) {
    return (
      <Link to={url} className="text-primary hover:underline ">
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
      <legend className="ml-4 px-2 text-sm  text-muted-foreground">
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

  // Transform entity data to UI format
  const data = useMemo(
    () => transformEntityToGeneralData(selectedEntity),
    [selectedEntity]
  );

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

          {/* Sex & DOB */}
          <div className="grid grid-cols-[16px_60px_1fr] sm:grid-cols-[22px_70px_1fr] items-center gap-3 px-4 pb-2 flex-1">
            <InfoRow icon={<VenusAndMars size={iconSize} />} label="Sex">
              <span>{data.sex?.name || "—"}</span>
            </InfoRow>
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
          {/* Breeder side */}
          <div className="grid grid-cols-[16px_60px_1fr] sm:grid-cols-[22px_70px_1fr] items-center gap-3 px-4 pb-2 flex-1">
            <InfoRow icon={<UserStar size={iconSize} />} label="Breeder">
              <EntityLink entity={data.breeder} />
            </InfoRow>
            <InfoRow
              icon={<HouseHeart size={iconSize} />}
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
              icon={<HouseHeart size={iconSize} />}
              label="Kennel"
              subLabel="owner"
            >
              <EntityLink entity={data.ownerKennel} />
            </InfoRow>
            <InfoRow
              icon={<MapPinHouse size={iconSize} />}
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
            <InfoRow icon={<CircleCheckBig size={iconSize} />} label="Status">
              <span>{data.petStatus?.name || "—"}</span>
            </InfoRow>
          </div>
          <div className="grid grid-cols-[16px_70px_1fr] sm:grid-cols-[22px_80px_1fr] items-center gap-3">
            <InfoRow icon={<Waves size={iconSize} />} label="Coat type">
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
