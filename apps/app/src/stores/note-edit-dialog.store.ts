import { signal } from "@preact/signals-react";

export interface NoteEditPayload {
  noteId: string;
  initialText: string;
}

const payload = signal<NoteEditPayload | null>(null);

export const noteEditDialogStore = {
  payload,
  openFor(p: NoteEditPayload) {
    payload.value = p;
  },
  close() {
    payload.value = null;
  },
};
