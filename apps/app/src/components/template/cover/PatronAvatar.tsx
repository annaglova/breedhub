import React from 'react';
import { Link } from 'react-router-dom';

interface Patron {
  Id: string;
  Contact?: {
    Name?: string;
    Url?: string;
    AvatarUrl?: string;
  };
  Place?: number;
  Rating: number;
}

interface PatronAvatarProps {
  patron: Patron;
  imgLink?: string;
}

/**
 * PatronAvatar - Patron avatar with place badge
 *
 * EXACT COPY from Angular: libs/schema/ui/template/page-header/ui/patron-avatar.component.ts
 * Shows circular avatar with place badge (1st, 2nd, 3rd, etc.)
 */
export function PatronAvatar({ patron, imgLink }: PatronAvatarProps) {
  const name = patron.Contact?.Name || '';
  const iconName = `place-${patron.Place}`;
  const avatarUrl = patron.Contact?.AvatarUrl || imgLink;
  const contactUrl = patron.Contact?.Url ? `/${patron.Contact.Url}` : '#';

  return (
    <Link to={contactUrl}>
      <div
        className="relative flex flex-row-reverse justify-center"
        title={name}
      >
        <div className="mt-2 size-11 overflow-hidden rounded-full border border-white sm:size-16">
          <img
            src={avatarUrl}
            className="h-full w-auto max-w-[150%]"
            alt="Card cover image"
          />
        </div>
        {/* Place badge - large screens */}
        <div className="absolute -right-2 hidden sm:block">
          <PatronPlaceBadge iconName={iconName} size={18} />
        </div>
        {/* Place badge - small screens */}
        <div className="absolute -right-2 sm:hidden">
          <PatronPlaceBadge iconName={iconName} size={14} />
        </div>
      </div>
    </Link>
  );
}

/**
 * PatronPlaceBadge - Badge with place icon
 * TODO: Replace with SVG icons when icon system is ready
 */
function PatronPlaceBadge({ iconName, size }: { iconName: string; size: number }) {
  return (
    <div
      className="bg-accent-600 rounded-full p-1 flex items-center justify-center"
      style={{ width: size + 8, height: size + 8 }}
    >
      <span className="text-white text-xs font-bold">
        {iconName.replace('place-', '')}
      </span>
    </div>
  );
}
