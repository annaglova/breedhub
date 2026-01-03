import { useMemo, useState, useCallback, useEffect } from 'react';
import defaultDogImage from '@/assets/images/pettypes/dog.jpeg';

interface EntityAvatarProps {
  entity: any;
  /** Fixed size in pixels (use for non-responsive contexts) */
  size?: number;
  /** Responsive size classes (overrides size prop) */
  sizeClassName?: string;
  className?: string;
  /** Default image to use when no avatar found */
  defaultImage?: string;
  /** Alt text for the avatar image */
  alt?: string;
  /** Fullscreen mode - larger avatar from sm breakpoint */
  isFullscreenMode?: boolean;
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
 * Includes error handling - if image fails to load, shows default image.
 *
 * Used by: AvatarOutlet, cards, lists, search results
 *
 * Future: Will support badges overlay (Phase 2)
 * - Pet: "Top Pet" badge
 * - Contact: Patronage badges
 * - Kennel: Verified badge
 */
// Avatar sizing per mode (must match AvatarOutlet):
// - До sm: size-40 (обидва режими)
// - sm до xl: drawer size-40, fullscreen size-44
// - Від xl: size-44 (обидва режими)
const SIZE_DRAWER = 'size-40 xl:size-44';
const SIZE_FULLSCREEN = 'size-40 sm:size-44';

export function EntityAvatar({
  entity,
  size,
  sizeClassName,
  className = '',
  defaultImage = defaultDogImage,
  alt,
  isFullscreenMode = false,
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

  // Track current image source (for error fallback)
  const [imgSrc, setImgSrc] = useState(avatarUrl);
  const [hasError, setHasError] = useState(false);

  // Handle image load error - switch to fallback
  const handleError = useCallback(() => {
    if (!hasError) {
      setHasError(true);
      setImgSrc(defaultImage);
    }
  }, [hasError, defaultImage]);

  // Reset when avatarUrl changes (new entity)
  useEffect(() => {
    setImgSrc(avatarUrl);
    setHasError(false);
  }, [avatarUrl]);

  // Generate alt text
  const altText = alt || entity?.name || entity?.Name || 'Entity avatar';

  // Priority: sizeClassName > size > mode-based default
  const sizeStyles = sizeClassName
    ? {}
    : size
      ? { width: size, height: size }
      : {};

  // Use explicit sizeClassName, or fixed size (no classes), or mode-based responsive
  const defaultSizeClasses = isFullscreenMode ? SIZE_FULLSCREEN : SIZE_DRAWER;
  const sizeClasses = sizeClassName || (size ? '' : defaultSizeClasses);

  return (
    <div className={`relative ${sizeClasses} ${className}`} style={sizeStyles}>
      {/* Avatar image */}
      <div className="flex size-full items-center justify-center overflow-hidden rounded-full border border-slate-200 ring-4 ring-white">
        <img
          className="size-full object-cover"
          src={imgSrc}
          alt={altText}
          loading="lazy"
          onError={handleError}
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
