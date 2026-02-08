import { useCollectionValue } from "@/hooks/useCollectionValue";
import { cn } from "@ui/lib/utils";
import { Mars, Venus } from "lucide-react";
import { Link } from "react-router-dom";

// Parent data from enrichment
interface Parent {
  id?: string;
  name?: string;
  slug?: string;
}

interface LitterAchievementsProps {
  entity?: any;
}

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
 * Enrichment pattern:
 * - father: useCollectionValue by father_id (pet collection)
 * - mother: useCollectionValue by mother_id (pet collection)
 *
 * Shows father and mother as clickable chips with male/female icons (white)
 */
export function LitterAchievements({ entity }: LitterAchievementsProps) {
  // Get father data from collection (enrichment pattern)
  // Pet is partitioned by breed_id, so we pass it for efficient partition pruning
  const father = useCollectionValue<Parent>("pet", entity?.father_id, {
    partitionKey: { field: "breed_id", value: entity?.father_breed_id },
  });

  // Get mother data from collection (enrichment pattern)
  const mother = useCollectionValue<Parent>("pet", entity?.mother_id, {
    partitionKey: { field: "breed_id", value: entity?.mother_breed_id },
  });

  // Hide if no parents
  if (!father?.name && !mother?.name) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2 mt-3 mb-6 min-h-[2rem]" aria-label="parents">
      {father?.name && (
        <ParentChip
          parent={father}
          icon={<Mars size={16} />}
          iconClassName="text-white"
        />
      )}

      {mother?.name && (
        <ParentChip
          parent={mother}
          icon={<Venus size={16} />}
          iconClassName="text-white"
        />
      )}
    </div>
  );
}
