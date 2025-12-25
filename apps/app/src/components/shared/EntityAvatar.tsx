import { useMemo } from 'react';
import defaultDogImage from '@/assets/images/pettypes/dog.jpeg';

interface EntityAvatarProps {
  entity: any;
  size?: number;
  className?: string;
  /** Default image to use when no avatar found */
  defaultImage?: string;
  /** Alt text for the avatar image */
  alt?: string;
}

/**
 * EntityAvatar - Universal avatar component for any entity type
 *
 * Renders entity avatar with automatic URL resolution:
 * 1. entity.avatar_url
 * 2. entity.image
 * 3. entity.logo_url (for kennels)
 * 4. entity.Avatar (legacy field)
 * 5. Fallback to default image
 *
 * Used by: AvatarOutlet, cards, lists, search results
 *
 * Future: Will support badges overlay (Phase 2)
 * - Pet: "Top Pet" badge
 * - Contact: Patronage badges
 * - Kennel: Verified badge
 */
export function EntityAvatar({
  entity,
  size = 176,
  className = '',
  defaultImage = defaultDogImage,
  alt,
}: EntityAvatarProps) {
  const avatarUrl = useMemo(() => {
    if (!entity) {
      return defaultImage;
    }

    // Priority order for avatar URL resolution
    // Most common fields first
    if (entity.avatar_url) {
      return entity.avatar_url;
    }

    if (entity.image) {
      return entity.image;
    }

    // For kennels
    if (entity.logo_url) {
      return entity.logo_url;
    }

    // Legacy field names
    if (entity.Avatar) {
      return entity.Avatar;
    }

    if (entity.Image) {
      return entity.Image;
    }

    // Fallback
    return defaultImage;
  }, [entity, defaultImage]);

  // Generate alt text
  const altText = alt || entity?.name || entity?.Name || 'Entity avatar';

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      {/* Avatar image */}
      <div className="flex size-full items-center justify-center overflow-hidden rounded-full border border-gray-200 ring-4 ring-white">
        <img
          className="size-full object-cover"
          src={avatarUrl}
          alt={altText}
          loading="lazy"
        />
      </div>

      {/*
        Future: Badges overlay (Phase 2)
        Will be rendered here based on entity type and config:
        - Pet: Top Pet badge (trophy)
        - Contact: Patronage badges (1st, 2nd, 3rd place)
        - Kennel: Verified badge (checkmark)
      */}
    </div>
  );
}
