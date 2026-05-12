import { EntityTabCardWrapper } from "@/components/space/EntityTabCardWrapper";
import { useCollectionValue } from "@/hooks/useCollectionValue";
import { Link } from "react-router-dom";
import { Pencil, Trash2 } from "lucide-react";
import { cn } from "@ui/lib/utils";

interface NoteEntity {
  id: string;
  text?: string;
  created_at?: string;
  entity?: string;
  entity_id?: string;
  entity_partition_id?: string;
  [key: string]: any;
}

interface ConnectedEntity {
  id?: string;
  name?: string;
  avatar_url?: string;
  slug?: string;
}

interface NoteTabCardProps {
  entity: NoteEntity;
  selected?: boolean;
  onClick?: () => void;
  onEdit?: (entity: NoteEntity) => void;
  onDelete?: (entity: NoteEntity) => void;
  mode?: "space" | "card";
}

function formatDate(dateString?: string): string {
  if (!dateString) return "";
  try {
    return new Date(dateString).toLocaleDateString("uk-UA", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

function getInitial(name?: string): string {
  return name?.charAt(0)?.toUpperCase() || "?";
}

export function NoteTabCard({
  entity,
  selected = false,
  onClick,
  onEdit,
  onDelete,
  mode = "space",
}: NoteTabCardProps) {
  const linkedEntity = entity.entity;
  const linkedId = entity.entity_id;
  const linkedPartition = entity.entity_partition_id;

  const connectedEntity = useCollectionValue<ConnectedEntity>(
    linkedEntity,
    linkedId,
    linkedEntity === "pet" && linkedPartition
      ? { partitionKey: { field: "breed_id", value: linkedPartition } }
      : undefined,
  );

  const formattedDate = formatDate(entity.created_at);
  const noteText = entity.text || "";

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.(entity);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(entity);
  };

  return (
    <EntityTabCardWrapper selected={selected} onClick={onClick}>
      <div className="bg-slate-50/50 flex h-[206px] overflow-auto rounded-xl border border-surface-border px-7 py-5 text-start text-sm text-slate-700">
        {noteText}
      </div>

      <div
        className={cn(
          "mt-2.5 flex w-full items-center px-2",
          mode === "space" && "h-13",
        )}
      >
        {mode === "space" && (
          <>
            <div className="relative flex">
              <div className="flex size-10 items-center justify-center overflow-hidden rounded-full border outline outline-2 outline-offset-2 outline-slate-300">
                {connectedEntity?.avatar_url ? (
                  <img
                    className="size-full object-cover"
                    src={connectedEntity.avatar_url}
                    alt={connectedEntity.name || "Avatar"}
                  />
                ) : (
                  <div className="flex size-full items-center justify-center rounded-full bg-gray-200 text-lg uppercase text-gray-600">
                    {getInitial(connectedEntity?.name)}
                  </div>
                )}
              </div>
            </div>

            <div
              className="ml-3 flex w-full flex-col space-y-0.5 truncate"
              title={connectedEntity?.name}
            >
              <div className="w-auto truncate">
                {connectedEntity?.slug ? (
                  <Link
                    to={`/${connectedEntity.slug}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-foreground hover:text-primary"
                  >
                    {connectedEntity.name}
                  </Link>
                ) : (
                  <span className="text-slate-700">
                    {connectedEntity?.name || "Without subject"}
                  </span>
                )}
              </div>
              <span className="text-slate-500 text-sm">{formattedDate}</span>
            </div>
          </>
        )}

        {mode === "card" && (
          <span className="text-slate-500 text-sm">{formattedDate}</span>
        )}

        <div className="text-slate-400 ml-auto flex space-x-3">
          <button
            type="button"
            aria-label="Edit"
            onClick={handleEdit}
            className="hover:text-slate-600 transition-colors"
          >
            <Pencil className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Delete"
            onClick={handleDelete}
            className="hover:text-red-500 transition-colors"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>
    </EntityTabCardWrapper>
  );
}
