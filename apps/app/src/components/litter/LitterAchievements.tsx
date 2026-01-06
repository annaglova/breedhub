import { cn } from "@ui/lib/utils";
import { Mars, Venus } from "lucide-react";
import { Link } from "react-router-dom";

// Parent reference in litter
interface Parent {
  id?: string;
  name: string;
  url?: string;
  slug?: string;
}

interface LitterAchievementsProps {
  entity?: any;
  father?: Parent;
  mother?: Parent;
}

// Null ID constant (similar to Angular nullId)
const NULL_ID = "00000000-0000-0000-0000-000000000000";

// Mock data for visual development
const MOCK_PARENTS = {
  father: {
    id: "1",
    name: "Champion Rocky vom Haus",
    slug: "champion-rocky-vom-haus",
  } as Parent,
  mother: {
    id: "2",
    name: "Luna of Golden Dreams",
    slug: "luna-of-golden-dreams",
  } as Parent,
};

/**
 * ParentChip - Chip with icon for parent (father/mother)
 */
function ParentChip({
  parent,
  icon,
  iconClassName,
}: {
  parent: Parent;
  icon: React.ReactNode;
  iconClassName?: string;
}) {
  const url = parent.slug ? `/${parent.slug}` : parent.url;

  const chipContent = (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors",
        "bg-primary text-primary-foreground",
        url && "cursor-pointer hover:opacity-90"
      )}
    >
      <span className={iconClassName}>{icon}</span>
      <span className="truncate max-w-60 sm:max-w-80">{parent.name}</span>
    </div>
  );

  if (url) {
    return (
      <Link to={url} className="no-underline">
        {chipContent}
      </Link>
    );
  }

  return chipContent;
}

/**
 * LitterAchievements - Displays litter's parents as chips
 *
 * Based on Angular: libs/schema/domain/litter/lib/litter-achievements/litter-achievements.component.ts
 * Shows father and mother as clickable chips with male/female icons
 */
export function LitterAchievements({
  entity,
  father,
  mother,
}: LitterAchievementsProps) {
  // Use entity data or fallback to mock/props for development
  const displayFather: Parent | undefined =
    entity?.father || entity?.Father || father || MOCK_PARENTS.father;
  const displayMother: Parent | undefined =
    entity?.mother || entity?.Mother || mother || MOCK_PARENTS.mother;

  // Check if parent has valid ID (not null ID)
  const hasFather =
    displayFather &&
    displayFather.id &&
    displayFather.id !== NULL_ID &&
    displayFather.name;
  const hasMother =
    displayMother &&
    displayMother.id &&
    displayMother.id !== NULL_ID &&
    displayMother.name;

  // Hide if no parents
  if (!hasFather && !hasMother) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2 mt-3 mb-6" aria-label="parents">
      {hasFather && (
        <ParentChip
          parent={displayFather}
          icon={<Mars size={16} />}
          iconClassName="text-blue-200"
        />
      )}

      {hasMother && (
        <ParentChip
          parent={displayMother}
          icon={<Venus size={16} />}
          iconClassName="text-pink-200"
        />
      )}
    </div>
  );
}
