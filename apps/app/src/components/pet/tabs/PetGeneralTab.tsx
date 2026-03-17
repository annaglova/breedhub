import { useSelectedEntity } from "@/contexts/SpaceContext";
import { spaceStore, dictionaryStore } from "@breedhub/rxdb-store";
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
import { useEffect, useState } from "react";
import { Fieldset, InfoRow } from "@/components/shared/InfoRow";
import { SmartLink } from "@/components/shared/SmartLink";

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
 * Load lookup data by ID using dictionaryStore
 * Returns null if id is not provided
 */
async function loadLookupById(
  table: string,
  id: string | null | undefined
): Promise<Record<string, unknown> | null> {
  if (!id) return null;
  return dictionaryStore.getRecordById(table, id);
}

/**
 * EntityLink - Renders a link to an entity or plain text
 */
function EntityLink({ entity }: { entity?: LinkEntity }) {
  if (!entity) return <span className="text-muted-foreground">—</span>;

  const url = entity.slug ? `/${entity.slug}` : entity.url;

  if (url) {
    return (
      <SmartLink to={url}>
        {entity.name}
      </SmartLink>
    );
  }

  return <span>{entity.name}</span>;
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

  // State for lookup data
  const [data, setData] = useState<PetGeneralData>({});
  const [isLoading, setIsLoading] = useState(true);

  // Load lookup data when entity changes
  useEffect(() => {
    if (!selectedEntity) {
      setData({});
      setIsLoading(false);
      return;
    }

    async function loadLookups() {
      setIsLoading(true);

      try {
        // Ensure dictionaryStore is initialized
        if (!dictionaryStore.initialized.value) {
          await dictionaryStore.initialize();
        }

        // Load all lookups in parallel - only fetch records by specific IDs
        const [
          sex,
          petStatus,
          coatType,
          coatColor,
          countryOfBirth,
          countryOfStay,
          father,
          mother,
          breeder,
          owner,
          kennel,
          ownerKennel,
        ] = await Promise.all([
          // Dictionaries
          loadLookupById("sex", selectedEntity.sex_id),
          loadLookupById("pet_status", selectedEntity.pet_status_id),
          loadLookupById("coat_type", selectedEntity.coat_type_id),
          loadLookupById("coat_color", selectedEntity.coat_color_id),
          loadLookupById("country", selectedEntity.country_of_birth_id),
          loadLookupById("country", selectedEntity.country_of_stay_id),
          // Entities (pet, contact, account) - also use dictionaryStore for simplicity
          loadLookupById("pet", selectedEntity.father_id),
          loadLookupById("pet", selectedEntity.mother_id),
          loadLookupById("contact", selectedEntity.breeder_id),
          loadLookupById("contact", selectedEntity.owner_id),
          loadLookupById("account", selectedEntity.kennel_id),
          loadLookupById("account", selectedEntity.owner_kennel_id),
        ]);

        setData({
          sex: sex ? { id: selectedEntity.sex_id, name: String(sex.name || "") } : undefined,
          petStatus: petStatus ? { id: selectedEntity.pet_status_id, name: String(petStatus.name || "") } : undefined,
          coatType: coatType ? { id: selectedEntity.coat_type_id, name: String(coatType.name || "") } : undefined,
          coatColor: coatColor ? { id: selectedEntity.coat_color_id, name: String(coatColor.name || "") } : undefined,
          countryOfBirth: countryOfBirth ? { id: selectedEntity.country_of_birth_id, name: String(countryOfBirth.name || "") } : undefined,
          countryOfStay: countryOfStay ? { id: selectedEntity.country_of_stay_id, name: String(countryOfStay.name || "") } : undefined,
          father: father ? { id: selectedEntity.father_id, name: String(father.name || ""), slug: String(father.slug || "") } : undefined,
          mother: mother ? { id: selectedEntity.mother_id, name: String(mother.name || ""), slug: String(mother.slug || "") } : undefined,
          breeder: breeder ? { id: selectedEntity.breeder_id, name: String(breeder.name || ""), slug: String(breeder.slug || "") } : undefined,
          owner: owner ? { id: selectedEntity.owner_id, name: String(owner.name || ""), slug: String(owner.slug || "") } : undefined,
          breederKennel: kennel ? { id: selectedEntity.kennel_id, name: String(kennel.name || ""), slug: String(kennel.slug || "") } : undefined,
          ownerKennel: ownerKennel ? { id: selectedEntity.owner_kennel_id, name: String(ownerKennel.name || ""), slug: String(ownerKennel.slug || "") } : undefined,
          dateOfBirth: selectedEntity.date_of_birth,
          weight: selectedEntity.weight && selectedEntity.weight > 0 ? selectedEntity.weight : undefined,
        });
      } catch (error) {
        console.error("[PetGeneralTab] Failed to load lookups:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadLookups();
  }, [selectedEntity?.id]); // Only reload when pet ID changes

  // Report count after data loads
  useEffect(() => {
    if (!isLoading && onLoadedCount) {
      onLoadedCount(1);
    }
  }, [isLoading, onLoadedCount]);

  const iconSize = 16;

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="flex flex-col space-y-5 animate-pulse">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="space-y-3 pt-2">
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-full w-28" />
            <div className="space-y-2 px-4">
              {Array.from({ length: 2 }).map((_, j) => (
                <div key={j} className="flex items-center gap-3 py-2">
                  <div className="size-4 bg-slate-200 dark:bg-slate-700 rounded" />
                  <div className="h-3.5 bg-slate-200 dark:bg-slate-700 rounded-full w-14" />
                  <div className="h-3.5 bg-slate-200 dark:bg-slate-700 rounded-full w-32" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-5 cursor-default">
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
