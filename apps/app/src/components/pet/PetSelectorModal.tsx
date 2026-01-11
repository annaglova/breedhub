import defaultPetAvatar from "@/assets/images/pettypes/dog.jpeg";
import { useDictionaryValue } from "@/hooks/useDictionaryValue";
import { useEntities } from "@/hooks/useEntities";
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

  const getOutlineClass = () => {
    switch (sexCode) {
      case "male":
        return "outline-blue-300 dark:outline-blue-400";
      case "female":
        return "outline-pink-300 dark:outline-pink-400";
      default:
        return "outline-slate-300 dark:outline-slate-400";
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
          "outline outline-2 outline-offset-2",
          getOutlineClass()
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

  // Build filters based on props and filter state
  const filters = useMemo(() => {
    const f: Record<string, any> = {};

    // Add sex filter if specified
    if (sexFilter) {
      f.sex_code = sexFilter;
    }

    // Add pet type filter
    if (petTypeId) {
      f.pet_type_id = petTypeId;
    }

    // Add breed filter
    if (breedId) {
      f.breed_id = breedId;
    }

    // Add name search filter
    if (searchQuery.trim()) {
      f.name_search = searchQuery.trim().toUpperCase();
    }

    return Object.keys(f).length > 0 ? f : undefined;
  }, [sexFilter, petTypeId, breedId, searchQuery]);

  // Reset breed when pet type changes
  const handlePetTypeChange = (value: string) => {
    setPetTypeId(value);
    setBreedId(""); // Reset breed when pet type changes
  };

  // Only fetch pets when breed is selected
  const shouldFetch = !!breedId;

  // Stable orderBy reference to prevent infinite re-renders
  const orderBy = useMemo(() => ({ field: "name", direction: "asc" as const }), []);

  // Fetch pets with filters
  const { data, isLoading, isLoadingMore, hasMore, loadMore } = useEntities({
    entityType: "pet",
    recordsCount: 30,
    filters,
    orderBy,
    enabled: shouldFetch,
  });

  // Filter out excluded IDs
  const filteredEntities = useMemo(() => {
    if (excludeIds.length === 0) return data.entities;
    const excludeSet = new Set(excludeIds);
    return data.entities.filter((e) => !excludeSet.has(e.id));
  }, [data.entities, excludeIds]);

  // Reset selection and filters when modal opens/closes
  useEffect(() => {
    if (!open) {
      setSelectedPet(null);
      setSearchQuery("");
      setPetTypeId("");
      setBreedId("");
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
      <DialogContent size="lg" className="max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="">
          <SearchInput
            value={searchQuery}
            onValueChange={setSearchQuery}
            debounceMs={300}
            placeholder="Search by name..."
            pill
          />
        </div>

        {/* Filters - 2 columns with gray background */}
        <div className="bg-modal-card-ground rounded-lg px-6 py-4">
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

        {/* Counter */}
        <div className="text-sm text-slate-500 mb-2">
          {!shouldFetch ? (
            ""
          ) : isLoading ? (
            "Loading..."
          ) : (
            <>
              Showing {filteredEntities.length}
              {data.total > 0 && ` of ${data.total}`} pets
            </>
          )}
        </div>

        {/* Pet list */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 min-h-0 overflow-y-auto space-y-1 border rounded-lg p-2"
          style={{ maxHeight: "400px" }}
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
