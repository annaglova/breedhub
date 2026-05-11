import { signal } from "@preact/signals-react";

export interface NoteDialogPayload {
  entity: string;
  entityId: string;
  entityName: string;
  entityPartitionId?: string | null;
}

const payload = signal<NoteDialogPayload | null>(null);

export const noteDialogStore = {
  payload,
  openFor(p: NoteDialogPayload) {
    payload.value = p;
  },
  close() {
    payload.value = null;
  },
};
