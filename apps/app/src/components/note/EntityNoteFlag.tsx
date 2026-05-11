import { NoteFlagButton } from "@ui/components/note-flag-button";
import { useEntityNotes } from "@/hooks/useEntityNotes";
import { noteDialogStore } from "@/stores/note-dialog.store";
import { getPartitionFieldForEntity } from "@breedhub/rxdb-store";
import { useAuth } from "@shared/core/auth";
import { useLocation, useNavigate } from "react-router-dom";

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
  const { authenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { data } = useEntityNotes(entityType, entityId);
  const hasNotes = (data?.entities?.length ?? 0) > 0;

  const handleClick = () => {
    if (!entityId) return;
    if (!authenticated) {
      const currentUrl = location.pathname + location.search + location.hash;
      navigate(`/sign-in?redirectURL=${encodeURIComponent(currentUrl)}`);
      return;
    }
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
