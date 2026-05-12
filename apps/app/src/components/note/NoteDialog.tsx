import { useState } from "react";
import { spaceStore, toast } from "@breedhub/rxdb-store";
import { useSignals } from "@preact/signals-react/runtime";
import { Textarea } from "@ui/components/textarea";
import { Button } from "@ui/components/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@ui/components/dropdown-menu";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import { FormDialog } from "@/components/edit/FormDialog";
import { useEntityNotes } from "@/hooks/useEntityNotes";
import { noteDialogStore } from "@/stores/note-dialog.store";
import { formatDate } from "@/utils/format";

const UNDO_WINDOW_MS = 5000;

export function NoteDialog() {
  useSignals();
  const payload = noteDialogStore.payload.value;
  const open = payload !== null;

  const [text, setText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [pendingDelete, setPendingDelete] = useState<Set<string>>(new Set());

  const { data, isLoading } = useEntityNotes(
    payload?.entity ?? "",
    payload?.entityId ?? "",
  );
  const allNotes = data?.entities ?? [];
  const notes = allNotes.filter((n: any) => !pendingDelete.has(n.id));

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setText("");
      setEditingId(null);
      setEditText("");
      noteDialogStore.close();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payload) return;
    const trimmed = text.trim();
    if (!trimmed) return;

    await spaceStore.create("note", {
      entity: payload.entity,
      entity_id: payload.entityId,
      text: trimmed,
      ...(payload.entityPartitionId && {
        entity_partition_id: payload.entityPartitionId,
      }),
    });

    setText("");
    noteDialogStore.close();
  };

  const startEdit = (note: any) => {
    setEditingId(note.id);
    setEditText(note.text);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText("");
  };

  const saveEdit = async () => {
    const trimmed = editText.trim();
    if (!trimmed || !editingId) return;
    await spaceStore.update("note", editingId, { text: trimmed });
    setEditingId(null);
    setEditText("");
  };

  const handleDelete = (note: any) => {
    setPendingDelete((prev) => new Set(prev).add(note.id));

    const timeoutId = window.setTimeout(() => {
      void spaceStore.delete("note", note.id);
      setPendingDelete((prev) => {
        const next = new Set(prev);
        next.delete(note.id);
        return next;
      });
    }, UNDO_WINDOW_MS);

    toast.info("Note deleted", {
      duration: UNDO_WINDOW_MS,
      action: {
        label: "Undo",
        onClick: () => {
          window.clearTimeout(timeoutId);
          setPendingDelete((prev) => {
            const next = new Set(prev);
            next.delete(note.id);
            return next;
          });
        },
      },
    });
  };

  const isEditingAny = editingId !== null;

  return (
    <FormDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={`Notes — ${payload?.entityName ?? ""}`}
      onSubmit={handleSubmit}
      submitLabel="Save"
      submitDisabled={!text.trim() || isEditingAny}
    >
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-base text-slate-500">Loading…</div>
        ) : notes.length === 0 ? (
          <div className="text-base text-slate-500">No notes yet.</div>
        ) : (
          <ul className="space-y-3 max-h-[40vh] overflow-y-auto pr-1">
            {notes.map((n: any) => {
              const isEditing = editingId === n.id;
              return (
                <li
                  key={n.id}
                  className="rounded-md border border-slate-300 bg-white/95 p-3 dark:border-zinc-700 dark:bg-zinc-900/60"
                >
                  {isEditing ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        rows={3}
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={cancelEdit}
                          className="small-button"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          onClick={saveEdit}
                          disabled={!editText.trim()}
                          className="small-button"
                        >
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-slate-500 mb-1">
                          {formatDate(n.created_at)}
                        </div>
                        <div className="text-base whitespace-pre-wrap text-slate-700 dark:text-slate-200">
                          {n.text}
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost-secondary"
                            type="button"
                            aria-label="Note actions"
                            className="size-8 rounded-full p-0 shrink-0 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                          >
                            <MoreVertical size={16} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => startEdit(n)}>
                            <Pencil size={14} className="mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(n)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 size={14} className="mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={
            isEditingAny ? "Finish editing first…" : "Write a note…"
          }
          rows={4}
          disabled={isEditingAny}
        />
      </div>
    </FormDialog>
  );
}
