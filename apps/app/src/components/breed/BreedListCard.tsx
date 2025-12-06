import { BreedProgressLight } from "@/components/shared/BreedProgressLight";
import { EntityListCardWrapper } from "@/components/space/EntityListCardWrapper";
import { NoteFlag } from "@/components/shared/NoteFlag";
import { TopPatrons } from "@/components/shared/TopPatrons";

// Interface for real data from RxDB
interface BreedEntity {
  id?: string;
  Id?: string;
  name?: string;
  Name?: string;
  measurements?: {
    rating?: number;
    kennel_count?: number;
    patron_count?: number;
    pet_profile_count?: number;
    achievement_progress?: number;
    total_payment_rating?: number;
  };
  avatar_url?: string;
  Avatar?: string;
  [key: string]: any;
}

interface BreedListCardProps {
  entity: BreedEntity;
  selected?: boolean;
  onClick?: () => void;
}

export function BreedListCard({
  entity,
  selected = false,
  onClick,
}: BreedListCardProps) {
  // Extract data from the entity with fallbacks
  const breed = {
    Id: entity.Id || entity.id,
    Name: entity.Name || entity.name || "Unknown",
    Avatar: entity.Avatar || entity.avatar_url,
    PetProfileCount: entity.measurements?.pet_profile_count || 0,
    KennelCount: entity.measurements?.kennel_count || 0,
    PatronCount: entity.measurements?.patron_count || 0,
    // Support data from support_data JSONB field
    AchievementProgress: entity.support_data?.progress_percent || 0,
    SupportLabel: entity.support_data?.label || "",
    HasNotes: Math.random() > 0.7, // Random for visual testing
    TopPatrons:
      entity.measurements?.patron_count > 0
        ? [
            { id: "1", name: "Top Patron 1", avatar: null },
            { id: "2", name: "Top Patron 2", avatar: null },
            { id: "3", name: "Top Patron 3", avatar: null },
          ].slice(0, Math.min(3, Math.floor(Math.random() * 4)))
        : [],
  };
  return (
    <EntityListCardWrapper
      selected={selected}
      onClick={onClick}
      className="h-[68px] relative"
    >
      <div className="flex items-center w-full">
        {/* Avatar */}
        <div
          className={`size-10 rounded-full border border-surface-border flex-shrink-0 relative outline outline-2 outline-offset-2 ${
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
            <span className="font-medium truncate uppercase max-w-[200px] min-[430px]:max-w-[220px] min-[500px]:max-w-[300px] sm:max-w-[350px] min-[640px]:max-w-none">
              {breed.Name}
            </span>
            <NoteFlag isVisible={breed.HasNotes} className="flex-shrink-0 self-start" />
          </div>

          <div className="flex items-center text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <span>Pet profiles - {breed.PetProfileCount || 0}</span>
              <span className="text-gray-400 hidden sm:inline">•</span>
              <span className="hidden sm:inline">
                Kennels - {breed.KennelCount || 0}
              </span>
              <span className="text-gray-400 hidden min-[400px]:inline">•</span>
              <span className="hidden min-[400px]:inline">
                Patrons - {breed.PatronCount || 0}
              </span>
            </div>

            {/* Progress indicator - hardcoded for now */}
            <BreedProgressLight breed={breed} className="ml-auto" />
          </div>
        </div>
      </div>

      {/* Top Patrons - hardcoded for visual, hidden on small screens */}
      {breed.TopPatrons && breed.TopPatrons.length > 0 && (
        <TopPatrons
          patrons={breed.TopPatrons}
          maxDisplay={3}
          className="hidden min-[400px]:flex absolute top-3 right-4 sm:right-6"
        />
      )}
    </EntityListCardWrapper>
  );
}
