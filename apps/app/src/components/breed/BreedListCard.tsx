import { BreedProgressLight } from "@/components/shared/BreedProgressLight";
import { NoteFlag } from "@/components/shared/NoteFlag";
import { TopPatrons } from "@/components/shared/TopPatrons";
import { EntityListCardWrapper } from "@/components/space/EntityListCardWrapper";

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
    // Top patrons from top_patrons JSONB field (object with order keys: {"1": {...}, "2": {...}})
    TopPatrons: entity.top_patrons ? Object.values(entity.top_patrons) : [],
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
            breed.AchievementProgress > 0
              ? "outline-primary-300 dark:outline-primary-400"
              : "outline-slate-300 dark:outline-slate-400"
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
              className="w-full h-full flex items-center justify-center text-slate-600 dark:text-slate-200 text-lg uppercase bg-slate-200 dark:bg-slate-700"
              style={{ display: breed.Avatar ? "none" : "flex" }}
            >
              {breed.Name?.charAt(0)}
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="ml-4 flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className="text-md truncate uppercase max-w-[200px] min-[430px]:max-w-[220px] min-[500px]:max-w-[300px] sm:max-w-[350px] min-[640px]:max-w-none">
              {breed.Name}
            </span>
            <NoteFlag
              isVisible={breed.HasNotes}
              className="flex-shrink-0 self-start"
            />
          </div>

          <div className="flex items-center text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <span>Pet profiles - {breed.PetProfileCount || 0}</span>
              <span className="text-slate-400 hidden sm:inline">•</span>
              <span className="hidden sm:inline">
                Kennels - {breed.KennelCount || 0}
              </span>
              <span className="text-slate-400 hidden min-[400px]:inline">
                •
              </span>
              <span className="hidden min-[400px]:inline">
                Patrons - {breed.PatronCount || 0}
              </span>
            </div>

            {/* Progress indicator - hardcoded for now */}
            <BreedProgressLight breed={breed} className="ml-auto" />
          </div>
        </div>
      </div>

      {/* Top Patrons from JSONB field, hidden on small screens */}
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
