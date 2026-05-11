import { NoteFlagButton } from "@ui/components/note-flag-button";
import { useEntityNotes } from "@/hooks/useEntityNotes";
import { noteDialogStore } from "@/stores/note-dialog.store";
import { getPartitionFieldForEntity } from "@breedhub/rxdb-store";

interface EntityNoteFlagProps {
  entity: any;
  entityType: string;
  entityName: string;
  mode?: "page" | "drawer";
  className?: string;
}

export function EntityNoteFlag({
  entity,
  entityType,
  entityName,
  mode = "page",
  className,
}: EntityNoteFlagProps) {
  const entityId = entity?.id ?? "";
  const { data } = useEntityNotes(entityType, entityId);
  const hasNotes = (data?.entities?.length ?? 0) > 0;

  const handleClick = () => {
    if (!entityId) return;
    const partitionField = getPartitionFieldForEntity(entityType);
    const entityPartitionId = partitionField ? entity?.[partitionField] ?? null : null;
    noteDialogStore.openFor({
      entity: entityType,
      entityId,
      entityName,
      entityPartitionId,
    });
  };

  return (
    <NoteFlagButton
      hasNotes={hasNotes}
      onClick={handleClick}
      mode={mode}
      className={className}
    />
  );
}
