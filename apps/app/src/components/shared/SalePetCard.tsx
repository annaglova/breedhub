import defaultDogImage from "@/assets/images/pettypes/dog.jpeg";
import { PetSexMark } from "@/components/shared/PetSexMark";
import { Badge } from "@ui/components/badge";
import { PawPrint } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

/**
 * Pet for sale from a litter
 */
export interface SalePet {
  id: string;
  name: string;
  slug?: string;
  avatarUrl?: string;
  breed?: {
    name: string;
    slug?: string;
  };
  sex?: {
    code: string;
    name: string;
  };
  dateOfBirth?: string;
  countryOfBirth?: {
    code: string;
    name: string;
  };
  father?: {
    name: string;
    slug?: string;
    avatarUrl?: string;
  };
  mother?: {
    name: string;
    slug?: string;
    avatarUrl?: string;
  };
  serviceFeatures?: string[];
}

interface SalePetCardProps {
  pet: SalePet;
  /** Default image to use when no avatar found */
  defaultImage?: string;
}

/**
 * Format date to year only
 */
function formatDateYear(dateString?: string): string {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    return date.getFullYear().toString();
  } catch {
    return "";
  }
}

/**
 * PetImage - Image with fallback support
 */
function PetImage({
  src,
  alt,
  defaultImage,
  className = "",
  fallbackIconSize = "size-16",
}: {
  src?: string;
  alt: string;
  defaultImage: string;
  className?: string;
  fallbackIconSize?: string;
}) {
  const [imgSrc, setImgSrc] = useState(src || defaultImage);
  const [hasError, setHasError] = useState(false);

  const handleError = useCallback(() => {
    if (!hasError) {
      setHasError(true);
      setImgSrc(defaultImage);
    }
  }, [hasError, defaultImage]);

  // Reset when src changes
  useEffect(() => {
    setImgSrc(src || defaultImage);
    setHasError(false);
  }, [src, defaultImage]);

  // Show fallback icon if no src and using default
  if (!src) {
    return (
      <PawPrint className={`${fallbackIconSize} text-slate-300 dark:text-slate-600`} />
    );
  }

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
 * SalePetCard - Card for pet available for sale
 *
 * Displays:
 * - Breed link
 * - Pet avatar with fallback
 * - Pet name with sex mark
 * - Country and DOB
 * - Service features (badges)
 * - Father and Mother with avatars
 *
 * Based on Angular: sale-pet-card.component.ts
 */
export function SalePetCard({ pet, defaultImage = defaultDogImage }: SalePetCardProps) {
  const dateYear = formatDateYear(pet.dateOfBirth);

  return (
    <div className="card card-rounded flex w-full flex-col items-center p-6 md:px-8 cursor-default">
      {/* Breed link */}
      <div className="text-sm mb-2 flex w-full">
        {pet.breed?.slug ? (
          <Link
            to={`/${pet.breed.slug}`}
            className="text-primary hover:underline uppercase"
          >
            {pet.breed.name}
          </Link>
        ) : (
          <span className="uppercase">{pet.breed?.name}</span>
        )}
      </div>

      {/* Pet avatar */}
      <div className="size-45 lg:size-56 flex items-center justify-center overflow-hidden rounded-xl border border-surface-border bg-slate-100 dark:bg-slate-800">
        <PetImage
          src={pet.avatarUrl}
          alt={pet.name}
          defaultImage={defaultImage}
          className="h-full w-auto max-w-[150%] object-cover"
          fallbackIconSize="size-16"
        />
      </div>

      {/* Pet name with sex */}
      <div className="mb-2 mt-3 flex min-h-12 w-full items-center justify-center space-x-3">
        {pet.sex && (
          <PetSexMark sex={pet.sex.code as any} style="round" />
        )}
        {pet.slug ? (
          <Link to={`/${pet.slug}`} className="text-primary hover:underline font-medium">
            {pet.name}
          </Link>
        ) : (
          <span className="font-medium">{pet.name}</span>
        )}
      </div>

      {/* Country and DOB */}
      <div className="text-secondary mb-3 mt-1 flex w-full justify-center border-t border-surface-border pt-3">
        <em className="text-secondary text-center text-sm">
          {pet.countryOfBirth?.code} {dateYear}
        </em>
      </div>

      {/* Service features */}
      {pet.serviceFeatures && pet.serviceFeatures.length > 0 && (
        <div className="flex flex-wrap justify-center gap-1.5 mb-6">
          {pet.serviceFeatures.map((feature, idx) => (
            <Badge key={idx} variant="secondary" className="text-xs">
              {feature}
            </Badge>
          ))}
        </div>
      )}

      {/* Parents */}
      <div className="flex flex-row gap-3">
        {/* Father */}
        <div className="flex flex-col items-center">
          <div className="w-28 lg:w-28">
            <div className="h-28 lg:h-28 flex items-center justify-center overflow-hidden rounded-xl border border-surface-border bg-slate-100 dark:bg-slate-800">
              <PetImage
                src={pet.father?.avatarUrl}
                alt={pet.father?.name || "Father"}
                defaultImage={defaultImage}
                className="h-full w-auto max-w-[150%] object-cover"
                fallbackIconSize="size-8"
              />
            </div>
            <em className="text-secondary text-sm">Father</em>
          </div>
          <div className="w-34 sm:w-38 lg:w-40 flex min-h-14 items-center text-center text-base">
            {pet.father?.slug ? (
              <Link to={`/${pet.father.slug}`} className="text-primary hover:underline text-sm">
                {pet.father.name}
              </Link>
            ) : (
              <span className="text-sm">{pet.father?.name || "—"}</span>
            )}
          </div>
        </div>

        {/* Mother */}
        <div className="flex flex-col items-center">
          <div className="w-28 lg:w-28">
            <div className="h-28 lg:h-28 flex items-center justify-center overflow-hidden rounded-xl border border-surface-border bg-slate-100 dark:bg-slate-800">
              <PetImage
                src={pet.mother?.avatarUrl}
                alt={pet.mother?.name || "Mother"}
                defaultImage={defaultImage}
                className="h-full w-auto max-w-[150%] object-cover"
                fallbackIconSize="size-8"
              />
            </div>
            <em className="text-secondary text-sm">Mother</em>
          </div>
          <div className="w-34 sm:w-38 lg:w-40 flex min-h-14 items-center text-center text-base">
            {pet.mother?.slug ? (
              <Link to={`/${pet.mother.slug}`} className="text-primary hover:underline text-sm">
                {pet.mother.name}
              </Link>
            ) : (
              <span className="text-sm">{pet.mother?.name || "—"}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
