import { useDictionaryValue } from "@/hooks/useDictionaryValue";
import { Chip } from "@ui/components/chip";

interface EventAchievementsProps {
  entity?: any;
}

/**
 * EventAchievements - Displays event type (competition category) as a chip
 *
 * Reads type_id from program entity, resolves via program_type dictionary,
 * renders as a chip badge (e.g., "National", "International").
 */
export function EventAchievements({ entity }: EventAchievementsProps) {
  const typeName = useDictionaryValue("program_type", entity?.type_id);

  if (!typeName) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2 mt-2 min-h-[2rem]">
      <Chip label={typeName} variant="primary" />
    </div>
  );
}
