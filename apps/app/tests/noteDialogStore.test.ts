import { beforeEach, describe, expect, it } from "vitest";
import { noteDialogStore } from "../src/stores/note-dialog.store";

describe("noteDialogStore", () => {
  beforeEach(() => {
    noteDialogStore.close();
  });

  it("starts with no payload", () => {
    expect(noteDialogStore.payload.value).toBeNull();
  });

  it("openFor sets the payload", () => {
    noteDialogStore.openFor({
      entity: "breed",
      entityId: "breed-1",
      entityName: "German Shepherd",
    });

    expect(noteDialogStore.payload.value).toEqual({
      entity: "breed",
      entityId: "breed-1",
      entityName: "German Shepherd",
    });
  });

  it("close clears the payload", () => {
    noteDialogStore.openFor({
      entity: "pet",
      entityId: "pet-1",
      entityName: "Rex",
      entityPartitionId: "breed-99",
    });
    noteDialogStore.close();

    expect(noteDialogStore.payload.value).toBeNull();
  });

  it("openFor preserves entityPartitionId when provided", () => {
    noteDialogStore.openFor({
      entity: "pet",
      entityId: "pet-2",
      entityName: "Buddy",
      entityPartitionId: "breed-42",
    });

    expect(noteDialogStore.payload.value?.entityPartitionId).toBe("breed-42");
  });
});
