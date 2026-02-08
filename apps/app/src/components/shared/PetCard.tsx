import defaultPetLogo from "@/assets/images/pettypes/dog-logo.svg";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@ui/components/tooltip";
import { PetSexMark, type SexCode } from "./PetSexMark";
import { SmartLink } from "./SmartLink";

/**
 * Pet entity structure
 */
export interface Pet {
  id: string;
  name: string;
  avatarUrl: string;
  url: string;
  sex?: SexCode;
  countryOfBirth?: string;
  dateOfBirth?: string;
  titles?: string; // TrimTitles
  father?: {
    id?: string;
    name: string;
    url: string;
  };
  mother?: {
    id?: string;
    name: string;
    url: string;
  };
  breed?: {
    id?: string;
    name: string;
    url: string;
  };
  status?: string;
}

/**
 * Props for PetCard component
 */
interface PetCardProps {
  pet: Pet;
  mode?: "default" | "litter";
}

/**
 * Format year from date string
 */
function formatYear(dateString?: string): string {
  if (!dateString) return "";
  const year = new Date(dateString).getFullYear();
  return year.toString();
}

/**
 * Truncate text to specific number of lines (CSS clamp simulation)
 */
function TruncatedText({
  text,
  maxLines = 4,
}: {
  text: string;
  maxLines?: number;
}) {
  return (
    <div
      className="overflow-hidden text-center leading-[1.75rem]"
      style={{
        display: "-webkit-box",
        WebkitBoxOrient: "vertical",
        WebkitLineClamp: maxLines,
      }}
    >
      {text}
    </div>
  );
}

/**
 * PetCard component
 * Displays pet information card with avatar, name, titles, and pedigree
 *
 * Uses SmartLink for all entity links with quick actions support.
 *
 * Similar to Angular pet-card.component.ts
 */
export function PetCard({ pet, mode = "default" }: PetCardProps) {
  return (
    <div className="card card-rounded flex flex-col items-center justify-center px-6 py-3 sm:px-8 cursor-default caret-transparent">
      {/* Sex indicator bar */}
      <PetSexMark
        sex={pet.sex}
        style="horizontal"
        className="mb-4 w-36 sm:w-44"
      />

      <div className="flex h-auto flex-col items-center justify-center">
        {/* Avatar */}
        <div className="flex size-36 items-center justify-center overflow-hidden rounded-xl border border-surface-border sm:size-44">
          {pet.avatarUrl ? (
            <img
              className="h-full w-auto max-w-[150%] object-cover"
              src={pet.avatarUrl}
              alt={pet.name}
            />
          ) : (
            <div className="flex size-full items-center justify-center bg-slate-50 dark:bg-slate-700">
              <img
                className="w-2/3 h-auto"
                src={defaultPetLogo}
                alt={pet.name}
              />
            </div>
          )}
        </div>

        {/* Name with SmartLink */}
        <div className="my-3 flex min-h-12 w-48 items-center justify-center text-center font-semibold md:w-52">
          <SmartLink
            to={pet.url}
            entityType="pet"
            entityId={pet.id}
            rows={2}
            showTooltip={false}
          >
            {pet.name}
          </SmartLink>
        </div>

        {/* Divider */}
        <div className="flex w-full flex-col border-t border-surface-border">
          {/* Birth info */}
          <em className="text-secondary mb-2 mt-3 text-center text-sm">
            {pet.countryOfBirth} {formatYear(pet.dateOfBirth)}
          </em>

          {/* Titles or Pedigree info */}
          <div className="h-30 flex items-start overflow-hidden text-base">
            <div className="w-full items-start justify-start text-base">
              {/* Titles */}
              {pet.titles && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <TruncatedText text={pet.titles} maxLines={4} />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{pet.titles}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              {/* Default mode: Father/Mother */}
              {!pet.titles && mode === "default" && (
                <div
                  className="grid w-full gap-y-3"
                  style={{ gridTemplateColumns: "44px auto" }}
                >
                  <span className="text-secondary">Father</span>
                  <SmartLink
                    to={pet.father?.url || "#"}
                    entityType="pet"
                    entityId={pet.father?.id}
                    rows={2}
                    showTooltip={false}
                    disableActions={!pet.father?.id}
                  >
                    {pet.father?.name || "Unknown"}
                  </SmartLink>

                  <span className="text-secondary">Mother</span>
                  <SmartLink
                    to={pet.mother?.url || "#"}
                    entityType="pet"
                    entityId={pet.mother?.id}
                    rows={2}
                    showTooltip={false}
                    disableActions={!pet.mother?.id}
                  >
                    {pet.mother?.name || "Unknown"}
                  </SmartLink>
                </div>
              )}

              {/* Litter mode: Breed/Status */}
              {!pet.titles && mode === "litter" && (
                <div
                  className="grid w-full gap-y-3"
                  style={{ gridTemplateColumns: "44px auto" }}
                >
                  <span className="text-secondary">Breed</span>
                  <SmartLink
                    to={pet.breed?.url || "#"}
                    entityType="breed"
                    entityId={pet.breed?.id}
                    showTooltip={false}
                    disableActions={!pet.breed?.id}
                  >
                    {pet.breed?.name || "Unknown"}
                  </SmartLink>

                  <span className="text-secondary">Status</span>
                  <span>{pet.status || "Unknown"}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
