import defaultPetAvatar from "@/assets/images/pettypes/dog.jpeg";
import { useDictionaryValue } from "@/hooks/useDictionaryValue";
import { useEntities } from "@/hooks/useEntities";
import { dictionaryStore, supabase } from "@breedhub/rxdb-store";
import { Button } from "@ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@ui/components/dialog";
import { DropdownInput } from "@ui/components/form-inputs/dropdown-input";
import { LookupInput } from "@ui/components/form-inputs/lookup-input";
import { SearchInput } from "@ui/components/form-inputs/search-input";
import { cn } from "@ui/lib/utils";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface PetEntity {
  id: string;
  name?: string;
  avatar_url?: string;
  pet_status_id?: string;
  sex_id?: string;
  date_of_birth?: string;
}

interface PetSelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (pet: PetEntity) => void;
  /** Filter by sex: 'male' | 'female' | undefined (all) */
  sexFilter?: "male" | "female";
  /** Title for the modal */
  title?: string;
  /** Exclude pet IDs from results */
  excludeIds?: string[];
}

/**
 * Simplified pet item for selection list
 */
function PetSelectorItem({
  pet,
  selected,
  onClick,
}: {
  pet: PetEntity;
  selected: boolean;
  onClick: () => void;
}) {
  const petStatusName = useDictionaryValue("pet_status", pet.pet_status_id);
  const sexCode = useDictionaryValue("sex", pet.sex_id, "code");

  const getRingClass = () => {
    switch (sexCode) {
      case "male":
        return "ring-blue-300 dark:ring-blue-400";
      case "female":
        return "ring-pink-300 dark:ring-pink-400";
      default:
        return "ring-slate-300 dark:ring-slate-400";
    }
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return "";
    try {
      return new Date(dateString).toLocaleDateString("uk-UA", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return "";
    }
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center p-3 cursor-pointer rounded-lg transition-colors",
        "hover:bg-slate-100 dark:hover:bg-slate-800",
        selected && "bg-primary-50 dark:bg-primary-900/30 ring-2 ring-primary-500"
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "size-10 rounded-full border border-surface-border flex-shrink-0",
          "ring-2 ring-offset-2",
          getRingClass()
        )}
      >
        <div className="w-full h-full rounded-full overflow-hidden">
          <img
            src={pet.avatar_url || defaultPetAvatar}
            alt={pet.name || "Pet"}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              const target = e.currentTarget;
              if (!target.dataset.fallback) {
                target.dataset.fallback = "true";
                target.src = defaultPetAvatar;
              }
            }}
          />
        </div>
      </div>

      {/* Details */}
      <div className="ml-4 flex-1 min-w-0">
        <div className="text-md truncate font-medium">{pet.name || "Unknown"}</div>
        <div className="text-sm text-slate-500 dark:text-slate-400 flex space-x-1">
          {petStatusName && <span>{petStatusName}</span>}
          {pet.date_of_birth && (
            <>
              {petStatusName && <span>•</span>}
              <span>{formatDate(pet.date_of_birth)}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * PetSelectorModal - Modal for selecting a pet with search and filtering
 *
 * Features:
 * - Search by name (debounced)
 * - Filter by sex (for mating page)
 * - Virtual scroll / load more pagination
 * - Reuses existing useEntities hook
 */
export function PetSelectorModal({
  open,
  onOpenChange,
  onSelect,
  sexFilter,
  title = "Select Pet",
  excludeIds = [],
}: PetSelectorModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPet, setSelectedPet] = useState<PetEntity | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Filter states
  const [petTypeId, setPetTypeId] = useState<string>("");
  const [breedId, setBreedId] = useState<string>("");

  // Resolve sexFilter code to sex_id UUID (only when modal is open)
  const [sexId, setSexId] = useState<string | null>(null);
  useEffect(() => {
    if (!open || !sexFilter) {
      if (!sexFilter) setSexId(null);
      return;
    }

    let isMounted = true;

    const resolveSexId = async () => {
      try {
        // Wait for dictionaryStore to be initialized
        let retries = 20;
        while (!dictionaryStore.initialized.value && retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
          retries--;
        }

        if (!dictionaryStore.initialized.value) {
          console.warn("[PetSelectorModal] DictionaryStore not initialized after retries");
          return;
        }

        const { records } = await dictionaryStore.getDictionary("sex");
        if (!isMounted) return;

        const sexRecord = records.find((r: any) => r.code === sexFilter);
        if (sexRecord) {
          setSexId(sexRecord.id);
        }
      } catch (error) {
        console.error("[PetSelectorModal] Failed to resolve sex_id:", error);
      }
    };

    resolveSexId();

    return () => {
      isMounted = false;
    };
  }, [open, sexFilter]);

  // Build filters based on props and filter state
  const filters = useMemo(() => {
    const f: Record<string, any> = {};

    // Add sex filter if resolved (sexId is UUID from dictionary)
    if (sexId) {
      f.sex_id = sexId;
    }

    // Add pet type filter
    if (petTypeId) {
      f.pet_type_id = petTypeId;
    }

    // Add breed filter
    if (breedId) {
      f.breed_id = breedId;
    }

    // Add name search filter (uses actual field name for hybrid search)
    if (searchQuery.trim()) {
      f.name = searchQuery.trim().toUpperCase();
    }

    return Object.keys(f).length > 0 ? f : undefined;
  }, [sexId, petTypeId, breedId, searchQuery]);

  // Field configs for filter operators
  // - name: 'contains' for hybrid search (starts_with + contains)
  // - UUID fields: 'eq' for exact match
  const fieldConfigs = useMemo(() => ({
    name: { fieldType: 'string', operator: 'contains' },
    pet_type_id: { fieldType: 'uuid', operator: 'eq' },
    breed_id: { fieldType: 'uuid', operator: 'eq' },
    sex_id: { fieldType: 'uuid', operator: 'eq' }
  }), []);

  // Reset breed when pet type changes
  const handlePetTypeChange = (value: string) => {
    setPetTypeId(value);
    setBreedId(""); // Reset breed when pet type changes
  };

  // Only fetch pets when breed is selected
  const shouldFetch = !!breedId;

  // Stable orderBy reference to prevent infinite re-renders
  const orderBy = useMemo(() => ({
    field: "name",
    direction: "asc" as const,
    tieBreaker: { field: "id", direction: "asc" as const }
  }), []);

  // Fetch pets with filters (hybrid lookup with ID-First pagination)
  const { data, isLoading, isLoadingMore, hasMore, loadMore } = useEntities({
    entityType: "pet",
    recordsCount: 30,
    filters,
    orderBy,
    enabled: shouldFetch,
    fieldConfigs,
  });

  // Filter out excluded IDs
  const filteredEntities = useMemo(() => {
    if (excludeIds.length === 0) return data.entities;
    const excludeSet = new Set(excludeIds);
    return data.entities.filter((e) => !excludeSet.has(e.id));
  }, [data.entities, excludeIds]);

  // Fetch total count when filters change
  const [totalCount, setTotalCount] = useState<number | null>(null);
  useEffect(() => {
    if (!shouldFetch) {
      setTotalCount(null);
      return;
    }

    const fetchCount = async () => {
      try {
        let query = supabase
          .from("pet")
          .select("*", { count: "exact", head: true })
          .or("deleted.is.null,deleted.eq.false");

        // Apply filters
        if (sexId) {
          query = query.eq("sex_id", sexId);
        }
        if (petTypeId) {
          query = query.eq("pet_type_id", petTypeId);
        }
        if (breedId) {
          query = query.eq("breed_id", breedId);
        }
        if (searchQuery.trim()) {
          query = query.ilike("name", `%${searchQuery.trim()}%`);
        }

        const { count, error } = await query;

        if (!error && count !== null) {
          setTotalCount(count);
        }
      } catch (error) {
        console.error("[PetSelectorModal] Failed to fetch count:", error);
      }
    };

    fetchCount();
  }, [shouldFetch, sexId, petTypeId, breedId, searchQuery]);

  // Reset selection and filters when modal opens/closes
  useEffect(() => {
    if (!open) {
      setSelectedPet(null);
      setSearchQuery("");
      setPetTypeId("");
      setBreedId("");
      setTotalCount(null);
    }
  }, [open]);

  // Handle scroll for infinite loading
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current || isLoadingMore || !hasMore) return;

    const container = scrollContainerRef.current;
    const scrollBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;

    // Load more when near bottom
    if (scrollBottom < 100) {
      loadMore();
    }
  }, [isLoadingMore, hasMore, loadMore]);

  const handleConfirm = () => {
    if (selectedPet) {
      onSelect(selectedPet);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="h-[70vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {/* Filters with gray background */}
        <div className="bg-modal-card-ground rounded-lg px-6 py-4">
          {/* Counter - always visible above search */}
          <div className="text-sm text-slate-500 mb-3 min-h-[20px]">
            {!shouldFetch ? (
              "Select filters to search"
            ) : isLoading ? (
              "Loading..."
            ) : totalCount !== null ? (
              `${filteredEntities.length} of ${totalCount} pets`
            ) : (
              `${filteredEntities.length} pets`
            )}
          </div>

          {/* Search */}
          <div className="mb-4">
            <SearchInput
              value={searchQuery}
              onValueChange={setSearchQuery}
              debounceMs={300}
              placeholder="Search by name..."
              pill
            />
          </div>

          {/* Filter dropdowns - 2 columns */}
          <div className="grid grid-cols-2 gap-3">
            {/* Pet Type filter */}
            <DropdownInput
              label="Pet type"
              placeholder="Select pet type..."
              required
              value={petTypeId}
              onValueChange={handlePetTypeChange}
              referencedTable="pet_type"
              referencedFieldID="id"
              referencedFieldName="name"
            />

            {/* Breed filter */}
            <LookupInput
              label="Breed"
              placeholder="Select breed..."
              required
              value={breedId}
              onValueChange={setBreedId}
              referencedTable="breed"
              referencedFieldID="id"
              referencedFieldName="name"
              dataSource="collection"
              filterBy="pet_type_id"
              filterByValue={petTypeId}
              disabled={!petTypeId}
              disabledOnGray
            />
          </div>
        </div>

        {/* Pet list */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 min-h-0 overflow-y-auto space-y-1 border rounded-lg p-4"
        >
          {!shouldFetch ? (
            <div className="text-center py-8 text-slate-500">
              Select a breed to search
            </div>
          ) : isLoading && filteredEntities.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : filteredEntities.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              No pets found
            </div>
          ) : (
            <>
              {filteredEntities.map((pet) => (
                <PetSelectorItem
                  key={pet.id}
                  pet={pet}
                  selected={selectedPet?.id === pet.id}
                  onClick={() => setSelectedPet(pet)}
                />
              ))}

              {/* Loading more indicator */}
              {isLoadingMore && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                  <span className="ml-2 text-sm text-slate-500">
                    Loading more...
                  </span>
                </div>
              )}

              {/* End of list */}
              {!hasMore && filteredEntities.length > 0 && (
                <div className="text-center py-2 text-sm text-slate-400">
                  No more results
                </div>
              )}
            </>
          )}
        </div>

        {/* Actions */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => onOpenChange(false)}
            className="small-button bg-secondary-100 hover:bg-secondary-200 focus:bg-secondary-300 text-slate-800 dark:text-zinc-900 dark:bg-surface-400 dark:hover:bg-surface-300"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={!selectedPet}
            className="small-button bg-primary-50 dark:bg-primary-300 hover:bg-primary-100 focus:bg-primary-200 dark:hover:bg-primary-300 dark:focus:bg-primary-200 text-primary dark:text-zinc-900 disabled:opacity-50"
          >
            Select
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
