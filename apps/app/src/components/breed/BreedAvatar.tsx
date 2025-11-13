import { useMemo } from 'react';
import defaultDogImage from '@/assets/images/pettypes/dog.jpeg';

interface BreedAvatarProps {
  entity: any;
  size?: number;
  className?: string;
}

/**
 * BreedAvatar - Breed-specific avatar rendering
 *
 * Gets avatar image from:
 * 1. entity.TopPet?.avatar_url (top pet of breed)
 * 2. entity.default_image (breed default image)
 * 3. entity.avatar_url or entity.image
 * 4. Fallback to default dog image
 */
export function BreedAvatar({ entity, size = 176, className = '' }: BreedAvatarProps) {
  const avatarUrl = useMemo(() => {
    if (!entity) {
      return defaultDogImage;
    }

    // Priority 1: Top Pet avatar (best representative)
    if (entity.TopPet?.avatar_url) {
      return entity.TopPet.avatar_url;
    }

    // Priority 2: Breed default image
    if (entity.default_image) {
      return entity.default_image;
    }

    // Priority 3: Any available image
    if (entity.avatar_url) {
      return entity.avatar_url;
    }

    // Priority 4: Check other possible field names
    if (entity.image) {
      return entity.image;
    }

    // Fallback: default dog image
    return defaultDogImage;
  }, [entity]);

  // Show patronage badges if breed has BreedPatronage
  const patronageBadges = useMemo(() => {
    if (!entity?.BreedPatronage || entity.BreedPatronage.length === 0) {
      return null;
    }

    return entity.BreedPatronage.map((patronage: any, index: number) => ({
      place: patronage.Place,
      breedName: patronage.Breed?.Name || '',
      key: `${patronage.Place}-${index}`
    }));
  }, [entity]);

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      {/* Avatar image */}
      <div className="flex size-full items-center justify-center overflow-hidden rounded-full border border-gray-200 ring-4 ring-white">
        <img
          className="size-full object-cover"
          src={avatarUrl}
          alt={entity?.name || 'Breed avatar'}
          loading="lazy"
        />
      </div>

      {/* Patronage badges (if any) */}
      {patronageBadges && patronageBadges.length > 0 && (
        <div className="absolute right-2 top-0 flex gap-0.5">
          {patronageBadges.map((badge) => (
            <div
              key={badge.key}
              className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-white text-xs font-bold shadow-sm"
              title={`${badge.breedName} - ${badge.place} place patron`}
            >
              {badge.place}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
