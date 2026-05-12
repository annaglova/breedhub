import { EntityTabCardWrapper } from "@/components/space/EntityTabCardWrapper";
import { useCollectionValue } from "@/hooks/useCollectionValue";
import { noteEditDialogStore } from "@/stores/note-edit-dialog.store";
import { spaceStore, toast } from "@breedhub/rxdb-store";
import { Button } from "@ui/components/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@ui/components/dropdown-menu";
import { ExternalLink, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
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
  mode = "space",
}: NoteTabCardProps) {
  const navigate = useNavigate();
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

  const handleEdit = () => {
    noteEditDialogStore.openFor({
      noteId: entity.id,
      initialText: entity.text ?? "",
    });
  };

  const handleDelete = async () => {
    await spaceStore.delete("note", entity.id);
    toast.info("Note deleted");
  };

  const handleNavigate = () => {
    if (connectedEntity?.slug) {
      navigate(`/${connectedEntity.slug}`);
    }
  };

  const navigateLabel = linkedEntity ? `Open ${linkedEntity}` : "Open record";

  return (
    <EntityTabCardWrapper selected={selected} onClick={onClick}>
      <div className="bg-slate-50/50 h-[206px] rounded-xl border border-surface-border px-5 py-4 overflow-hidden">
        <div className="h-full overflow-y-auto text-start text-base text-slate-700 whitespace-pre-wrap">
          {noteText}
        </div>
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
              className="ml-3 flex min-w-0 flex-1 flex-col space-y-0.5 truncate"
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

        <div className="ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost-secondary"
                type="button"
                aria-label="Note actions"
                onClick={(e) => e.stopPropagation()}
                className="size-8 rounded-full p-0 shrink-0 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
              >
                <MoreVertical size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              onClick={(e) => e.stopPropagation()}
            >
              <DropdownMenuItem onClick={handleEdit}>
                <Pencil size={14} className="mr-2" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleDelete}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 size={14} className="mr-2" /> Delete
              </DropdownMenuItem>
              {connectedEntity?.slug && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleNavigate}>
                    <ExternalLink size={14} className="mr-2" /> {navigateLabel}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </EntityTabCardWrapper>
  );
}
