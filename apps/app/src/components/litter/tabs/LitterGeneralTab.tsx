import { useSelectedEntity } from "@/contexts/SpaceContext";
import { formatDate } from "@/utils/format";
import { spaceStore, dictionaryStore } from "@breedhub/rxdb-store";
import { useSignals } from "@preact/signals-react/runtime";
import { cn } from "@ui/lib/utils";
import {
  Cake,
  CircleCheckBig,
  HouseHeart,
  Mars,
  UserStar,
  Venus,
} from "lucide-react";
import { useEffect, useState } from "react";
import { EntityLink, Fieldset, InfoRow, type LinkEntity } from "@/components/shared/InfoRow";

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
  status?: DictionaryValue;
  maleAmount?: number;
  femaleAmount?: number;
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

interface LitterGeneralTabProps {
  onLoadedCount?: (count: number) => void;
}

/**
 * LitterGeneralTab - Litter general information
 *
 * Displays:
 * 1. Birth details - Father, Mother, DOB
 * 2. Origin and Ownership - Breeder, Kennel
 * 3. Additional data - Status, Males count, Females count
 *
 * Uses enrichment pattern via dictionaryStore.getRecordById()
 */
export function LitterGeneralTab({ onLoadedCount }: LitterGeneralTabProps) {
  useSignals();

  const selectedEntity = useSelectedEntity();
  const isFullscreen = spaceStore.isFullscreen.value;

  // State for lookup data
  const [data, setData] = useState<LitterGeneralData>({});
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

        // Load all lookups in parallel
        const [father, mother, breeder, kennel, status] = await Promise.all([
          loadLookupById("pet", selectedEntity.father_id),
          loadLookupById("pet", selectedEntity.mother_id),
          loadLookupById("contact", selectedEntity.breeder_id),
          loadLookupById("account", selectedEntity.kennel_id),
          loadLookupById("litter_status", selectedEntity.status_id),
        ]);

        setData({
          father: father
            ? { id: selectedEntity.father_id, name: String(father.name || ""), slug: String(father.slug || "") }
            : undefined,
          mother: mother
            ? { id: selectedEntity.mother_id, name: String(mother.name || ""), slug: String(mother.slug || "") }
            : undefined,
          breeder: breeder
            ? { id: selectedEntity.breeder_id, name: String(breeder.name || ""), slug: String(breeder.slug || "") }
            : undefined,
          kennel: kennel
            ? { id: selectedEntity.kennel_id, name: String(kennel.name || ""), slug: String(kennel.slug || "") }
            : undefined,
          status: status
            ? { id: selectedEntity.status_id, name: String(status.name || "") }
            : undefined,
          dateOfBirth: selectedEntity.date_of_birth,
          maleAmount: selectedEntity.male_amount,
          femaleAmount: selectedEntity.female_amount,
        });
      } catch (error) {
        console.error("[LitterGeneralTab] Failed to load lookups:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadLookups();
  }, [selectedEntity?.id]);

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
          {data.maleAmount !== undefined && data.maleAmount > 0 && (
            <div className="grid grid-cols-[16px_70px_1fr] sm:grid-cols-[22px_80px_1fr] items-center gap-3">
              <InfoRow icon={<Mars size={iconSize} />} label="Males">
                <span>{data.maleAmount}</span>
              </InfoRow>
            </div>
          )}
          {data.femaleAmount !== undefined && data.femaleAmount > 0 && (
            <div className="grid grid-cols-[16px_70px_1fr] sm:grid-cols-[22px_80px_1fr] items-center gap-3">
              <InfoRow icon={<Venus size={iconSize} />} label="Females">
                <span>{data.femaleAmount}</span>
              </InfoRow>
            </div>
          )}
        </div>
      </Fieldset>
    </div>
  );
}
