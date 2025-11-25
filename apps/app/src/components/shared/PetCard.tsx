import { PetSexMark, type SexCode } from "./PetSexMark";
import { Link } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@ui/components/tooltip";

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
    name: string;
    url: string;
  };
  mother?: {
    name: string;
    url: string;
  };
  breed?: {
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
function TruncatedText({ text, maxLines = 4 }: { text: string; maxLines?: number }) {
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
 * Similar to Angular pet-card.component.ts
 */
export function PetCard({ pet, mode = "default" }: PetCardProps) {
  return (
    <div className="card flex flex-col items-center justify-center px-6 py-3 sm:px-8 cursor-default caret-transparent">
      {/* Sex indicator bar */}
      <PetSexMark sex={pet.sex} style="horizontal" className="mb-4 w-36 sm:w-44" />

      <div className="flex h-auto flex-col items-center justify-center">
        {/* Avatar */}
        <div className="flex size-36 items-center justify-center overflow-hidden rounded-xl border border-border sm:size-44">
          <img
            className="h-full w-auto max-w-[150%] object-cover"
            src={pet.avatarUrl}
            alt={pet.name}
          />
        </div>

        {/* Name with tooltip */}
        <div className="my-3 flex min-h-12 w-48 items-center justify-center text-center font-semibold md:w-52">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  to={pet.url}
                  className="hover:underline overflow-hidden"
                  style={{
                    display: "-webkit-box",
                    WebkitBoxOrient: "vertical",
                    WebkitLineClamp: 2,
                  }}
                >
                  {pet.name}
                </Link>
              </TooltipTrigger>
              <TooltipContent>
                <p>{pet.name}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Divider */}
        <div className="flex w-full flex-col border-t border-border">
          {/* Birth info */}
          <em className="text-muted-foreground mb-2 mt-3 text-center text-sm">
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
                <div className="grid w-full gap-y-3" style={{ gridTemplateColumns: "44px auto" }}>
                  <span className="text-muted-foreground">Father</span>
                  <Link
                    to={pet.father?.url || "#"}
                    className="hover:underline overflow-hidden"
                    style={{
                      display: "-webkit-box",
                      WebkitBoxOrient: "vertical",
                      WebkitLineClamp: 2,
                    }}
                  >
                    {pet.father?.name || "Unknown"}
                  </Link>

                  <span className="text-muted-foreground">Mother</span>
                  <Link
                    to={pet.mother?.url || "#"}
                    className="hover:underline overflow-hidden"
                    style={{
                      display: "-webkit-box",
                      WebkitBoxOrient: "vertical",
                      WebkitLineClamp: 2,
                    }}
                  >
                    {pet.mother?.name || "Unknown"}
                  </Link>
                </div>
              )}

              {/* Litter mode: Breed/Status */}
              {!pet.titles && mode === "litter" && (
                <div className="grid w-full gap-y-3" style={{ gridTemplateColumns: "44px auto" }}>
                  <span className="text-muted-foreground">Breed</span>
                  <Link to={pet.breed?.url || "#"} className="hover:underline">
                    {pet.breed?.name || "Unknown"}
                  </Link>

                  <span className="text-muted-foreground">Status</span>
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
