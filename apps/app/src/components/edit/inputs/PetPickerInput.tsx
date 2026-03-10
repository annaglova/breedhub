import { PetSelectorModal } from "@/components/pet/PetSelectorModal";
import { spaceStore, supabase } from "@breedhub/rxdb-store";
import { FormField } from "@ui/components/form-field";
import { cn } from "@ui/lib/utils";
import { Mars, Venus, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface PetPickerInputProps {
  label?: string;
  value?: string;
  pairedField?: string;
  pairedValue?: string;
  sexFilter?: "male" | "female";
  handleFieldChange: (field: string, value: any) => void;
  dbFieldName: string;
  selectedEntity?: any;
  required?: boolean;
  placeholder?: string;
}

interface ResolvedPet {
  id: string;
  name: string;
  sex_id?: string;
  breed_id?: string;
}

export function PetPickerInput({
  label,
  value,
  pairedField,
  pairedValue,
  sexFilter,
  handleFieldChange,
  dbFieldName,
  selectedEntity,
  required,
  placeholder,
}: PetPickerInputProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [resolvedPet, setResolvedPet] = useState<ResolvedPet | null>(null);
  const [allowedBreedIds, setAllowedBreedIds] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);

  // Resolve pet name from ID
  useEffect(() => {
    if (!value) {
      setResolvedPet(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    spaceStore.fetchEntityById<any>("pet", value).then((pet) => {
      if (cancelled) return;
      setLoading(false);
      if (pet) {
        setResolvedPet({
          id: pet.id,
          name: pet.name || "Unknown",
          sex_id: pet.sex_id,
          breed_id: pet.breed_id,
        });
      } else {
        setResolvedPet(null);
      }
    });

    return () => { cancelled = true; };
  }, [value]);

  // Fetch allowed breeds from related_breed table
  useEffect(() => {
    if (!selectedEntity?.breed_id) return;

    supabase
      .from("related_breed")
      .select("connected_breed_id")
      .eq("breed_id", selectedEntity.breed_id)
      .then(({ data }) => {
        if (data?.length) {
          setAllowedBreedIds([
            selectedEntity.breed_id,
            ...data.map((r: any) => r.connected_breed_id),
          ]);
        } else {
          setAllowedBreedIds(null);
        }
      });
  }, [selectedEntity?.breed_id]);

  const handleSelect = useCallback(
    (pet: any) => {
      handleFieldChange(dbFieldName, pet.id);
      if (pairedField) {
        handleFieldChange(pairedField, pet.breed_id);
      }
      setResolvedPet({
        id: pet.id,
        name: pet.name || "Unknown",
        sex_id: pet.sex_id,
        breed_id: pet.breed_id,
      });
      setModalOpen(false);
    },
    [dbFieldName, pairedField, handleFieldChange]
  );

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      handleFieldChange(dbFieldName, null);
      if (pairedField) {
        handleFieldChange(pairedField, null);
      }
      setResolvedPet(null);
    },
    [dbFieldName, pairedField, handleFieldChange]
  );

  const SexIcon = sexFilter === "male" ? Mars : Venus;

  const inputElement = (
    <div
      onClick={() => setModalOpen(true)}
      className={cn(
        "flex h-10 w-full items-center gap-2 rounded-md border border-slate-300 bg-white",
        "px-3 py-2 text-base cursor-pointer",
        "hover:border-slate-400 transition-colors"
      )}
    >
      <SexIcon className="w-4 h-4 flex-shrink-0 text-slate-400" />

      {value && resolvedPet ? (
        <>
          <span className="flex-1 text-slate-900 truncate">
            {resolvedPet.name}
          </span>

          {!required && (
            <button
              type="button"
              onClick={handleClear}
              className="flex-shrink-0 p-0.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </>
      ) : (
        <span className="flex-1 text-slate-400">
          {loading ? "Loading..." : placeholder || `Select ${label?.toLowerCase() || "pet"}...`}
        </span>
      )}
    </div>
  );

  return (
    <>
      {label ? (
        <FormField label={label} required={required}>
          {inputElement}
        </FormField>
      ) : (
        inputElement
      )}

      <PetSelectorModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSelect={handleSelect}
        sexFilter={sexFilter}
        title={`Select ${label || "Pet"}`}
        excludeIds={selectedEntity?.id ? [selectedEntity.id] : []}
        initialPetTypeId={selectedEntity?.pet_type_id}
        initialBreedId={pairedValue || undefined}
        initialSelectedId={value || undefined}
        allowedBreedIds={allowedBreedIds}
        lockPetType={!!selectedEntity?.pet_type_id}
      />
    </>
  );
}
