import defaultPetLogo from "@/assets/images/pettypes/dog-logo.svg";
import type { SexCode } from "@/components/shared/PetSexMark";
import { PetSexMark } from "@/components/shared/PetSexMark";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { OnSelectPetCallback, PedigreePet } from "./types";

interface PedigreeCardProps {
  pet: PedigreePet;
  sex?: SexCode;
  /** Visual level: -1, 0, 1, 2, 3 */
  level: number;
  /** Whether selection button should be shown */
  canSelectPet?: boolean;
  /** Whether a pet is already selected (for "Select" vs "Change" text) */
  isSelected?: boolean;
  /** Callback when selection button is clicked */
  onSelectPet?: OnSelectPetCallback;
}

/**
 * Format year from date string
 */
function formatYear(dateString?: string): string {
  if (!dateString) return "";
  try {
    return new Date(dateString).getFullYear().toString();
  } catch {
    return "";
  }
}

/**
 * Cache of broken image URLs to prevent repeated load attempts across re-renders
 */
const brokenImageCache = new Set<string>();

/**
 * PetImage - Image with fallback to default dog image
 * Remembers broken URLs to prevent flickering on re-renders
 */
function PetImage({
  src,
  alt,
  className = "",
}: {
  src?: string;
  alt: string;
  className?: string;
}) {
  // Check if URL is already known to be broken
  const isBroken = src ? brokenImageCache.has(src) : false;
  const initialSrc = !src || isBroken ? defaultPetLogo : src;

  const [imgSrc, setImgSrc] = useState(initialSrc);
  const currentSrcRef = useRef(src);

  const handleError = useCallback(() => {
    if (src) {
      brokenImageCache.add(src);
    }
    setImgSrc(defaultPetLogo);
  }, [src]);

  // Only reset when src actually changes to a different value
  useEffect(() => {
    if (currentSrcRef.current !== src) {
      currentSrcRef.current = src;
      const isBrokenUrl = src ? brokenImageCache.has(src) : false;
      setImgSrc(!src || isBrokenUrl ? defaultPetLogo : src);
    }
  }, [src]);

  return (
    <img
      className={className}
      src={imgSrc}
      alt={alt}
      loading="lazy"
      onError={handleError}
    />
  );
}

/**
 * PedigreeCard - Individual pet card in pedigree
 *
 * Different visual styles based on level:
 * - level -1: Vertical rotated name with sex mark (sidebar style)
 * - level 0: Large card with avatar 176px, min-h-[403px]
 * - level 1: Medium card with avatar 104px, min-h-[196.25px]
 * - level 2: Small card with avatar 64px, min-h-[92.88px]
 * - level 3: Pill-shaped with just sex mark and name
 *
 * Based on Angular: pedigree-card.component.ts
 */
export function PedigreeCard({ pet, sex, level, canSelectPet, isSelected, onSelectPet }: PedigreeCardProps) {
  const isEmpty = !pet || pet.id === "unknown";
  const petSex = sex || pet.sex?.code;

  // Button text: "Select father/mother" or "Change father/mother"
  const getButtonText = () => {
    const action = isSelected ? "Change" : "Select";
    const parent = petSex === "male" ? "father" : "mother";
    return `${action} ${parent}`;
  };

  const handleSelectClick = () => {
    if (onSelectPet && petSex) {
      onSelectPet(petSex as "male" | "female");
    }
  };

  // Country + Year
  const countryYear = [pet.countryOfBirth?.code, formatYear(pet.dateOfBirth)]
    .filter(Boolean)
    .join(" ");

  // Level -1: Vertical sidebar card
  if (level === -1) {
    return (
      <div className="card min-w-10 max-w-10 flex flex-col items-center justify-center rounded-full p-4 gap-3 bg-even-card-ground">
        <div className="rotate-180 " style={{ writingMode: "vertical-lr" }}>
          {pet.name}
        </div>
        <PetSexMark sex={petSex} style="round" />
      </div>
    );
  }

  // Level 0: Large card (parents level)
  if (level === 0) {
    return (
      <div className="card card-rounded flex min-w-72 max-w-72 w-full flex-col items-center justify-center px-6 py-3 min-h-[403px] bg-even-card-ground">
        <PetSexMark
          sex={petSex}
          style="horizontal"
          className="top-0 mb-4 w-44"
        />

        {/* Avatar 176px */}
        <div className="flex size-44 items-center justify-center overflow-hidden rounded-xl border border-border relative">
          <PetImage
            className="size-full object-cover"
            src={pet.avatarUrl}
            alt={pet.name}
          />
        </div>

        {!isEmpty ? (
          <>
            {/* Name */}
            {pet.url ? (
              <Link
                to={`/${pet.url}`}
                className="mt-4 sm:mt-6 flex min-h-10 w-full items-center justify-center text-center text-primary hover:underline line-clamp-2"
              >
                {pet.name}
              </Link>
            ) : (
              <span className="mt-4 sm:mt-6 flex min-h-10 w-full items-center justify-center text-center line-clamp-2">
                {pet.name}
              </span>
            )}

            {/* Selection button (Change) */}
            {canSelectPet && (
              <button
                onClick={handleSelectClick}
                className="mt-4 bg-secondary-200 dark:bg-secondary-700 rounded-full px-4 py-1 hover:bg-secondary-300 dark:hover:bg-secondary-600 text-sm"
              >
                {getButtonText()}
              </button>
            )}

            {/* Country + Year + Titles */}
            <div className="h-20 mt-3 sm:mt-4 w-full border-t border-border pt-3 flex flex-col overflow-hidden">
              {countryYear && (
                <em className="text-secondary mb-1 text-center text-sm">
                  {countryYear}
                </em>
              )}
              {pet.titles && (
                <div
                  className="text-center text-base leading-[1.6rem] line-clamp-2"
                  title={pet.titles}
                >
                  {pet.titles}
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Selection button (Select) for empty pet */}
            {canSelectPet && (
              <button
                onClick={handleSelectClick}
                className="mt-4 bg-secondary-200 dark:bg-secondary-700 rounded-full px-4 py-1 hover:bg-secondary-300 dark:hover:bg-secondary-600 text-sm"
              >
                {getButtonText()}
              </button>
            )}

            {/* Placeholder for name */}
            {!canSelectPet && (
              <div className="mt-4 sm:mt-6 flex min-h-10 w-full items-center justify-center">
                <div className="rounded-full bg-secondary-200 dark:bg-secondary-700 w-2/3 h-4" />
              </div>
            )}

            <div className="mt-3 sm:mt-4 flex w-full flex-col items-center border-t border-border">
              <div className="rounded-full bg-secondary-200 dark:bg-secondary-700 w-1/3 h-2 mb-1.5 mt-3" />
              <div className="rounded-full bg-secondary-200 dark:bg-secondary-700 w-full h-3 my-1.5" />
              <div className="rounded-full bg-secondary-200 dark:bg-secondary-700 w-full h-3 my-1.5" />
              <div className="rounded-full bg-secondary-200 dark:bg-secondary-700 w-full h-3 my-1.5" />
            </div>
          </>
        )}
      </div>
    );
  }

  // Level 1: Medium card (grandparents level)
  if (level === 1) {
    return (
      <div className="card card-rounded flex min-w-72 max-w-72 flex-col items-center px-6 py-3 min-h-[196.25px] bg-even-card-ground">
        <PetSexMark sex={petSex} style="horizontal" className="w-44" />

        {!isEmpty ? (
          <>
            {/* Name */}
            {pet.url ? (
              <Link
                to={`/${pet.url}`}
                className="flex min-h-10 justify-center w-full text-center text-primary hover:underline line-clamp-2"
              >
                {pet.name}
              </Link>
            ) : (
              <span className="flex min-h-10 justify-center w-full text-center line-clamp-2">
                {pet.name}
              </span>
            )}

            {/* Avatar + Titles row */}
            <div className="flex w-full items-center h-full">
              {/* Avatar 104px */}
              <div className="h-26 w-26 min-w-26 flex items-center justify-center overflow-hidden rounded-xl border border-border relative">
                <PetImage
                  className="size-full object-cover"
                  src={pet.avatarUrl}
                  alt={pet.name}
                />
              </div>

              {/* Titles */}
              {pet.titles && (
                <div
                  className="ml-3 text-base leading-[1.6rem] line-clamp-5"
                  title={pet.titles}
                >
                  {pet.titles}
                </div>
              )}
            </div>

            {/* Country + Year */}
            {countryYear && (
              <em className="text-secondary text-center text-sm mt-auto">
                {countryYear}
              </em>
            )}
          </>
        ) : (
          <>
            {/* Empty pet placeholder */}
            <div className="rounded-full bg-secondary-200 dark:bg-secondary-700 w-full h-4 mt-3 shrink-0" />
            <div className="flex w-full items-center h-full">
              {/* Avatar 104px with fallback */}
              <div className="h-26 w-26 min-w-26 flex items-center justify-center overflow-hidden rounded-xl border border-border relative">
                <PetImage
                  className="size-full object-cover"
                  src={undefined}
                  alt="Unknown"
                />
              </div>
              <div className="m-3 w-full space-y-4">
                <div className="rounded-full bg-secondary-200 dark:bg-secondary-700 w-full h-3" />
                <div className="rounded-full bg-secondary-200 dark:bg-secondary-700 w-full h-3" />
                <div className="rounded-full bg-secondary-200 dark:bg-secondary-700 w-full h-3" />
              </div>
            </div>
            <div className="rounded-full bg-secondary-200 dark:bg-secondary-700 w-1/3 h-2 mt-3" />
          </>
        )}
      </div>
    );
  }

  // Level 2: Small card (great-grandparents level)
  if (level === 2) {
    return (
      <div className="card card-rounded min-w-72 max-w-72 p-3 flex min-h-[92.88px] bg-even-card-ground">
        {/* Avatar 64px */}
        <div className="size-16 min-w-16 overflow-hidden self-center rounded-xl border border-border relative">
          <PetImage
            className="size-full object-cover"
            src={pet.avatarUrl}
            alt={pet.name}
          />
        </div>

        <div className="ml-2 flex w-full flex-col items-center">
          <PetSexMark
            sex={petSex}
            style="horizontal"
            className="mx-auto w-36"
          />

          {!isEmpty ? (
            <>
              {/* Name */}
              {pet.url ? (
                <Link
                  to={`/${pet.url}`}
                  className="flex min-h-10 items-center justify-center text-center text-primary hover:underline line-clamp-2"
                >
                  {pet.name}
                </Link>
              ) : (
                <span className="flex min-h-10 items-center justify-center text-center line-clamp-2">
                  {pet.name}
                </span>
              )}

              {/* Titles truncated */}
              {pet.titles && (
                <div className="h-6 w-44 overflow-hidden">
                  <div className="truncate text-base" title={pet.titles}>
                    {pet.titles}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex size-full flex-col items-center space-y-5 pt-5">
              <div className="rounded-full bg-secondary-200 dark:bg-secondary-700 w-full h-4" />
              <div className="rounded-full bg-secondary-200 dark:bg-secondary-700 w-1/2 h-3" />
            </div>
          )}
        </div>
      </div>
    );
  }

  // Level 3: Pill-shaped card (gen 4+)
  return (
    <div className="card flex min-w-72 max-w-72 flex-row items-center rounded-full py-[0.65rem] pl-3 pr-5 bg-even-card-ground">
      <PetSexMark sex={petSex} style="round" className="mr-3 w-4 shrink-0" />

      {!isEmpty ? (
        pet.url ? (
          <Link
            to={`/${pet.url}`}
            className="max-w-60 shrink-0 truncate text-primary hover:underline"
            title={`${pet.name}\n${pet.titles || ""}`}
          >
            {pet.name}
          </Link>
        ) : (
          <span className="max-w-60 shrink-0 truncate">{pet.name}</span>
        )
      ) : (
        <div className="flex w-full justify-center">
          <div className="rounded-full bg-secondary-200 dark:bg-secondary-700 w-full h-4 my-1" />
        </div>
      )}
    </div>
  );
}
