import { useState } from "react";
import { spaceStore } from "@breedhub/rxdb-store";
import { useSignals } from "@preact/signals-react/runtime";
import { FormDialog } from "@/components/edit/FormDialog";
import { useEntityNotes } from "@/hooks/useEntityNotes";
import { noteDialogStore } from "@/stores/note-dialog.store";
import { formatDate } from "@/utils/format";

export function NoteDialog() {
  useSignals();
  const payload = noteDialogStore.payload.value;
  const open = payload !== null;

  const [text, setText] = useState("");
  const { data, isLoading } = useEntityNotes(
    payload?.entity ?? "",
    payload?.entityId ?? "",
  );
  const notes = data?.entities ?? [];

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setText("");
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

  return (
    <FormDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={`Notes — ${payload?.entityName ?? ""}`}
      onSubmit={handleSubmit}
      submitLabel="Save"
      submitDisabled={!text.trim()}
    >
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-sm text-slate-500">Loading…</div>
        ) : notes.length === 0 ? (
          <div className="text-sm text-slate-500">No notes yet.</div>
        ) : (
          <ul className="space-y-3 max-h-[40vh] overflow-y-auto pr-1">
            {notes.map((n: any) => (
              <li
                key={n.id}
                className="rounded-md border border-slate-200 p-3 dark:border-zinc-700"
              >
                <div className="text-xs text-slate-500 mb-1">
                  {formatDate(n.created_at)}
                </div>
                <div className="text-sm whitespace-pre-wrap">{n.text}</div>
              </li>
            ))}
          </ul>
        )}

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write a note…"
          rows={4}
          className="w-full rounded-md border border-slate-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>
    </FormDialog>
  );
}
