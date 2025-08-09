import { EntityListCardWrapper } from "@/components/shared/EntityListCardWrapper";
import { NoteFlag } from "@/components/shared/NoteFlag";
import { TopPatrons } from "@/components/shared/TopPatrons";
import { BreedProgressLight } from "@/components/shared/BreedProgressLight";
import { SpaceListCardProps } from "@/core/space/types";
import { Breed } from "@/services/api";

interface BreedListCardProps extends SpaceListCardProps<Breed> {
  entity: Breed;
}

export function BreedListCard({
  entity: breed,
  selected = false,
  onClick,
}: BreedListCardProps) {
  return (
    <EntityListCardWrapper
      selected={selected}
      onClick={onClick}
      className="h-[68px]"
    >
      <div className="flex items-center">
        {/* Avatar */}
        <div
          className={`size-10 rounded-full border border-surface-border flex-shrink-0 relative outline outline-2 outline-offset-1 ${
            breed.PatronCount > 0
              ? "outline-primary-300 dark:outline-primary-400"
              : "outline-gray-300 dark:outline-gray-400"
          }`}
        >
          <div className="w-full h-full rounded-full overflow-hidden">
            {breed.Avatar ? (
              <img
                src={breed.Avatar}
                alt={breed.Name}
                className="w-full h-full object-cover"
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  e.currentTarget.nextElementSibling?.classList.remove(
                    "hidden"
                  );
                }}
              />
            ) : null}
            <div
              className="w-full h-full flex items-center justify-center text-gray-600 dark:text-gray-200 text-lg uppercase bg-gray-200 dark:bg-gray-700"
              style={{ display: breed.Avatar ? "none" : "flex" }}
            >
              {breed.Name?.charAt(0)}
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="ml-4 flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className="font-medium truncate uppercase">{breed.Name}</span>
            <NoteFlag isVisible={breed.HasNotes} />
          </div>

          <div className="flex items-center text-sm text-gray-600 gap-2">
            <span>Pet profiles - {breed.PetProfileCount || 0}</span>
            <span className="text-gray-400">•</span>
            <span className="hidden sm:inline">
              Kennels - {breed.KennelCount || 0}
            </span>
            <span className="text-gray-400 hidden sm:inline">•</span>
            <span>Patrons - {breed.PatronCount || 0}</span>

            {/* Progress indicator */}
            <BreedProgressLight 
              breed={breed} 
              className="ml-2 flex-shrink-0"
            />
          </div>
        </div>

        {/* Top Patrons */}
        {breed.TopPatrons && breed.TopPatrons.length > 0 && (
          <TopPatrons 
            patrons={breed.TopPatrons} 
            maxDisplay={3}
            className="ml-4"
          />
        )}
      </div>
    </EntityListCardWrapper>
  );
}
