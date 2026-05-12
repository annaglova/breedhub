import { useEffect, useState } from "react";
import { spaceStore } from "@breedhub/rxdb-store";
import { useSignals } from "@preact/signals-react/runtime";
import { Textarea } from "@ui/components/textarea";
import { FormDialog } from "@/components/edit/FormDialog";
import { noteEditDialogStore } from "@/stores/note-edit-dialog.store";

export function NoteEditDialog() {
  useSignals();
  const payload = noteEditDialogStore.payload.value;
  const open = payload !== null;

  const [text, setText] = useState("");

  useEffect(() => {
    if (payload) setText(payload.initialText);
  }, [payload?.noteId]);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setText("");
      noteEditDialogStore.close();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payload) return;
    const trimmed = text.trim();
    if (!trimmed) return;
    await spaceStore.update("note", payload.noteId, { text: trimmed });
    setText("");
    noteEditDialogStore.close();
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Edit note"
      onSubmit={handleSubmit}
      submitLabel="Save"
      submitDisabled={!text.trim()}
    >
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
      />
    </FormDialog>
  );
}
