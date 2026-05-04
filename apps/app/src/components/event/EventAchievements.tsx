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

  // Inactive chip — same pill geometry as the live primary chip but muted
  // slate with italic text. Reserves the row's width even when type isn't
  // set, signalling "to be filled in".
  const placeholderClass =
    "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 italic font-normal";

  return (
    <div className="flex flex-wrap gap-2 mt-2 min-h-[2rem]">
      {typeName ? (
        <Chip label={typeName} variant="primary" />
      ) : (
        <Chip label="Event type" variant="default" className={placeholderClass} />
      )}
    </div>
  );
}
