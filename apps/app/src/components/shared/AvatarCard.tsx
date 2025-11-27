import { PatronPlace } from "./PatronPlace";
import { Link } from "react-router-dom";

/**
 * Entity type for AvatarCard
 */
export interface AvatarEntity {
  id: string;
  name: string;
  avatarUrl: string;
  place?: number; // Placement badge (1-20)
  url: string; // Link to entity profile
}

/**
 * Props for AvatarCard component
 */
interface AvatarCardProps {
  entity: AvatarEntity;
  model: "contact" | "kennel";
}

/**
 * Get avatar URL based on entity type and model
 * Similar to contactAvatarFn / kennelAvatarFn in Angular
 */
function getAvatarUrl(entity: AvatarEntity, model: string): string {
  // Use provided avatarUrl or generate placeholder
  if (entity.avatarUrl) {
    return entity.avatarUrl;
  }

  // Generate placeholder based on model type
  const seed = entity.name || entity.id;
  return model === "kennel"
    ? `https://api.dicebear.com/7.x/initials/svg?seed=${seed}`
    : `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
}

/**
 * AvatarCard component
 * Displays avatar with optional placement badge
 *
 * Similar to Angular avatar-card.component.ts
 */
export function AvatarCard({ entity, model }: AvatarCardProps) {
  const avatarUrl = getAvatarUrl(entity, model);
  const showPlaceBadge = entity.place && entity.place < 20;

  return (
    <Link to={entity.url}>
      <div className="flex flex-col items-center justify-center">
        {/* Avatar container - relative for badge positioning */}
        <div className="relative">
          {/* Avatar circle with border */}
          <div className="relative flex size-40 overflow-hidden rounded-full border border-surface-border bg-card shadow-sm">
            <img
              className="absolute right-0 top-0 h-full w-auto max-w-[150%] object-cover"
              src={avatarUrl}
              alt={entity.name}
            />
          </div>

          {/* Placement badge - positioned on the border of avatar circle */}
          {showPlaceBadge && (
            <PatronPlace
              iconName={`place-${entity.place}`}
              iconSize={18}
              className="absolute right-3 top-2 rounded-full border border-white"
            />
          )}
        </div>

        {/* Name */}
        <div className="mt-2 text-center">{entity.name}</div>
      </div>
    </Link>
  );
}
