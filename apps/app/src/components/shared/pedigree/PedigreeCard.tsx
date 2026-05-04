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
  /** Tailwind outline color class for duplicate ancestor highlighting */
  duplicateColor?: string;
  /** When ON, pet links navigate to /pet-slug/pedigree */
  linkToPedigree?: boolean;
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
 *
 * Always renders fallback as base layer; real image overlays it.
 * If the image fails to load, the fallback is already visible — no flicker.
 * Remembers broken URLs to skip network requests on re-renders.
 */
function PetImage({
  src,
  alt,
  className,
}: {
  src?: string;
  alt: string;
  className?: string;
}) {
  // Programmatically preload the real image — only mount the visible <img>
  // after `onload` fires. While the URL is downloading or while it's
  // failing, no <img> tag exists in the DOM, so Chrome can't paint its
  // broken-image placeholder at the (off-center) top-left corner before
  // we get a chance to unmount it. Result: only the centered fallback dog
  // logo is ever visible until the real photo is fully decoded.
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(() => {
    if (!src) return null;
    return brokenImageCache.has(src) ? null : null;
  });

  useEffect(() => {
    if (!src) {
      setResolvedSrc(null);
      return;
    }
    if (brokenImageCache.has(src)) {
      setResolvedSrc(null);
      return;
    }

    let cancelled = false;
    const probe = new Image();
    probe.onload = () => {
      if (!cancelled) setResolvedSrc(src);
    };
    probe.onerror = () => {
      brokenImageCache.add(src);
      if (!cancelled) setResolvedSrc(null);
    };
    probe.src = src;

    return () => {
      cancelled = true;
      probe.onload = null;
      probe.onerror = null;
    };
  }, [src]);

  return (
    <div className="flex size-full items-center justify-center bg-slate-50 dark:bg-slate-700 relative">
      <img className="w-2/3 h-auto" src={defaultPetLogo} alt={alt} />
      {resolvedSrc && (
        <img
          className={className || "absolute inset-0 size-full object-cover"}
          src={resolvedSrc}
          alt={alt}
        />
      )}
    </div>
  );
}

/**
 * PedigreeCard - Individual pet card in pedigree
 *
 * Different visual styles based on level:
 * - level -1: Vertical rotated name with sex mark (sidebar style)
 * - level 0: Large card with avatar 176px, h=404px
 * - level 1: Medium card with avatar 104px, h=196px
 * - level 2: Small card with avatar 64px, h=92px
 * - level 3: Pill-shaped with just sex mark and name, h=40px
 *
 * Heights are calculated: H(n) = 2 × H(n+1) + gap(12px)
 *
 * Based on Angular: pedigree-card.component.ts
 */
export function PedigreeCard({ pet, sex, level, canSelectPet, isSelected, onSelectPet, duplicateColor, linkToPedigree }: PedigreeCardProps) {
  const isEmpty = !pet || pet.id === "unknown";
  const petSex = sex || pet.sex?.code;
  const petUrl = pet.url || pet.slug;

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
      <div className="card card-rounded flex min-w-72 max-w-72 w-full flex-col items-center justify-center px-6 py-3 min-h-[404px] bg-even-card-ground">
        <PetSexMark
          sex={petSex}
          style="horizontal"
          className="top-0 mb-4 w-44"
        />

        {/* Avatar 176px */}
        <div className={`flex size-44 items-center justify-center overflow-hidden rounded-xl border border-border relative ${duplicateColor ? `outline outline-2 outline-offset-2 ${duplicateColor}` : ""}`}>
          <PetImage
            src={pet.avatarUrl}
            alt={pet.name}
          />
        </div>

        {!isEmpty ? (
          <>
            {/* Name */}
            {petUrl ? (
              <Link
                to={linkToPedigree ? `/${petUrl}/pedigree` : `/${petUrl}`}
                className="mt-4 sm:mt-6 flex min-h-10 w-full items-center justify-center text-center line-clamp-2"
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

            {/* Mirror the real "Country + Year + Titles" block exactly:
                same `h-20 mt-3 sm:mt-4 ... border-t pt-3 flex-col overflow-hidden`
                wrapper. Without the same outer the skeleton block was ~22px
                taller than real, and because the level-0 card uses
                `justify-center` content shifted ~11px between skeleton ↔ real. */}
            <div className="h-20 mt-3 sm:mt-4 w-full border-t border-border pt-3 flex flex-col items-center overflow-hidden">
              {/* Country/year line */}
              <div className="rounded-full bg-secondary-200 dark:bg-secondary-700 w-1/3 h-3 mb-1.5" />
              {/* Titles (2-line clamp in real) */}
              <div className="rounded-full bg-secondary-200 dark:bg-secondary-700 w-full h-3 mb-1.5" />
              <div className="rounded-full bg-secondary-200 dark:bg-secondary-700 w-full h-3" />
            </div>
          </>
        )}
      </div>
    );
  }

  // Level 1: Medium card (grandparents level)
  if (level === 1) {
    return (
      <div className="card card-rounded flex min-w-72 max-w-72 flex-col items-center px-6 py-3 min-h-[196px] max-h-[196px] overflow-hidden bg-even-card-ground">
        <PetSexMark sex={petSex} style="horizontal" className="w-44 shrink-0" />

        {!isEmpty ? (
          <>
            {/* Name */}
            {petUrl ? (
              <Link
                to={linkToPedigree ? `/${petUrl}/pedigree` : `/${petUrl}`}
                className="flex min-h-10 items-center justify-center w-full text-center line-clamp-2"
              >
                {pet.name}
              </Link>
            ) : (
              <span className="flex min-h-10 items-center justify-center w-full text-center line-clamp-2">
                {pet.name}
              </span>
            )}

            {/* Avatar + Titles row */}
            <div className="flex w-full items-center h-full">
              {/* Avatar 104px */}
              <div className={`h-24 w-24 min-w-24 flex items-center justify-center overflow-hidden rounded-xl border border-border relative ${duplicateColor ? `outline outline-2 outline-offset-2 ${duplicateColor}` : ""}`}>
                <PetImage
                  className="size-full object-cover"
                  src={pet.avatarUrl}
                  alt={pet.name}
                />
              </div>

              {/* Titles */}
              {pet.titles && (
                <div
                  className="ml-3 text-base leading-[1.6rem] line-clamp-4"
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
            {/* Name placeholder — match the real `<Link className="flex
                min-h-10 ... line-clamp-2">` envelope (40px in the typical
                level-1 case) so the avatar row below starts at the same
                Y in skeleton and real. The previous `h-4 mt-3 shrink-0`
                rendered at 28px and left the level-1 avatar ~12px higher
                in skeleton than in real. */}
            <div className="flex min-h-10 w-full items-center justify-center shrink-0">
              <div className="rounded-full bg-secondary-200 dark:bg-secondary-700 w-2/3 h-4" />
            </div>
            <div className="flex w-full items-center h-full">
              {/* Avatar 104px with fallback */}
              <div className="h-24 w-24 min-w-24 flex items-center justify-center overflow-hidden rounded-xl border border-border relative">
                <PetImage
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
            {/* Country/year placeholder mirrors `<em className="text-sm mt-auto">`
                exactly: same `mt-auto` (absorbs free space + pushes to bottom),
                same effective height (~18px from text-sm line-height). The
                previous `mt-3 + h-3` envelope = 24px claimed 6px more card
                height than real → avatar row shrunk 6px → avatar centered
                ~3px higher in skeleton vs real. */}
            <div className="mt-auto h-[18px] flex items-center shrink-0">
              <div className="rounded-full bg-secondary-200 dark:bg-secondary-700 w-1/3 h-3" />
            </div>
          </>
        )}
      </div>
    );
  }

  // Level 2: Small card (great-grandparents level)
  if (level === 2) {
    return (
      <div className="card card-rounded min-w-72 max-w-72 p-3 flex min-h-[92px] max-h-[92px] overflow-hidden bg-even-card-ground">
        {/* Avatar 64px */}
        <div className={`size-[60px] min-w-[60px] overflow-hidden self-center rounded-xl border border-border relative ${duplicateColor ? `outline outline-2 outline-offset-2 ${duplicateColor}` : ""}`}>
          <PetImage
            src={pet.avatarUrl}
            alt={pet.name}
          />
        </div>

        <div className="ml-2 flex w-full flex-col items-center">
          <PetSexMark
            sex={petSex}
            style="horizontal"
            className="mx-auto w-36 shrink-0"
          />

          {!isEmpty ? (
            <>
              {/* Name */}
              {petUrl ? (
                <Link
                  to={linkToPedigree ? `/${petUrl}/pedigree` : `/${petUrl}`}
                  className="flex min-h-10 items-center justify-center text-center line-clamp-2"
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
    <div className="card flex min-w-72 max-w-72 flex-row items-center rounded-full py-2 pl-3 pr-5 min-h-[40px] max-h-[40px] overflow-hidden bg-even-card-ground">
      <span className={`mr-3 shrink-0 rounded-full ${duplicateColor ? `outline outline-2 outline-offset-2 ${duplicateColor}` : ""}`}>
        <PetSexMark sex={petSex} style="round" className="w-4" />
      </span>

      {!isEmpty ? (
        petUrl ? (
          <Link
            to={linkToPedigree ? `/${petUrl}/pedigree` : `/${petUrl}`}
            className="max-w-60 shrink-0 truncate"
            title={`${pet.name}\n${pet.titles || ""}`}
          >
            {pet.name}
          </Link>
        ) : (
          <span className="max-w-60 shrink-0 truncate">{pet.name}</span>
        )
      ) : (
        <div className="flex w-full justify-center">
          <div className="rounded-full bg-secondary-200 dark:bg-secondary-700 w-full h-4" />
        </div>
      )}
    </div>
  );
}
