import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";

const { mockUseEntityNotes, mockCreate, mockClose, payloadSignal } = vi.hoisted(
  () => {
    const { signal } = require("@preact/signals-react");
    return {
      mockUseEntityNotes: vi.fn(),
      mockCreate: vi.fn(),
      mockClose: vi.fn(),
      payloadSignal: signal(null),
    };
  },
);

vi.mock("../src/hooks/useEntityNotes", () => ({
  useEntityNotes: mockUseEntityNotes,
}));

vi.mock("../src/stores/note-dialog.store", () => ({
  noteDialogStore: {
    payload: payloadSignal,
    openFor: vi.fn((p: unknown) => {
      payloadSignal.value = p;
    }),
    close: vi.fn(() => {
      mockClose();
      payloadSignal.value = null;
    }),
  },
}));

vi.mock("@breedhub/rxdb-store", () => ({
  spaceStore: { create: mockCreate },
}));

vi.mock("../src/components/edit/FormDialog", () => ({
  FormDialog: ({
    open,
    title,
    onSubmit,
    submitDisabled,
    children,
    onOpenChange,
  }: any) =>
    open
      ? React.createElement(
          "form",
          { onSubmit, "data-testid": "form", "aria-label": title },
          children,
          React.createElement(
            "button",
            {
              type: "submit",
              disabled: submitDisabled,
              "data-testid": "save",
            },
            "Save",
          ),
          React.createElement(
            "button",
            {
              type: "button",
              onClick: () => onOpenChange(false),
              "data-testid": "cancel",
            },
            "Cancel",
          ),
        )
      : null,
}));

import { NoteDialog } from "../src/components/note/NoteDialog";

function setPayload(p: unknown) {
  payloadSignal.value = p;
}

describe("NoteDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setPayload(null);
    mockUseEntityNotes.mockReturnValue({
      data: { entities: [], total: 0 },
      isLoading: false,
    });
  });

  it("does not render when payload is null", () => {
    render(<NoteDialog />);
    expect(screen.queryByTestId("form")).toBeNull();
  });

  it("renders title with entity name when opened", () => {
    setPayload({
      entity: "breed",
      entityId: "b-1",
      entityName: "Bulldog",
    });

    render(<NoteDialog />);

    expect(screen.getByTestId("form").getAttribute("aria-label")).toBe(
      "Notes — Bulldog",
    );
  });

  it("shows empty state when no notes", () => {
    setPayload({
      entity: "breed",
      entityId: "b-1",
      entityName: "Bulldog",
    });

    render(<NoteDialog />);

    expect(screen.getByText("No notes yet.")).toBeTruthy();
  });

  it("shows existing notes list", () => {
    setPayload({
      entity: "breed",
      entityId: "b-1",
      entityName: "Bulldog",
    });
    mockUseEntityNotes.mockReturnValue({
      data: {
        entities: [
          { id: "n-1", text: "First note", created_at: "2026-05-01T10:00:00Z" },
          { id: "n-2", text: "Second note", created_at: "2026-05-02T10:00:00Z" },
        ],
        total: 2,
      },
      isLoading: false,
    });

    render(<NoteDialog />);

    expect(screen.getByText("First note")).toBeTruthy();
    expect(screen.getByText("Second note")).toBeTruthy();
  });

  it("disables Save when textarea is empty", () => {
    setPayload({
      entity: "breed",
      entityId: "b-1",
      entityName: "Bulldog",
    });

    render(<NoteDialog />);

    expect(screen.getByTestId("save").hasAttribute("disabled")).toBe(true);
  });

  it("enables Save and calls spaceStore.create on submit (no partition)", async () => {
    setPayload({
      entity: "breed",
      entityId: "b-1",
      entityName: "Bulldog",
    });
    mockCreate.mockResolvedValue({});

    render(<NoteDialog />);
    fireEvent.change(screen.getByPlaceholderText("Write a note…"), {
      target: { value: "hello" },
    });
    fireEvent.submit(screen.getByTestId("form"));

    await waitFor(() => expect(mockClose).toHaveBeenCalled());
    expect(mockCreate).toHaveBeenCalledWith("note", {
      entity: "breed",
      entity_id: "b-1",
      text: "hello",
    });
  });

  it("includes entity_partition_id only when present", async () => {
    setPayload({
      entity: "pet",
      entityId: "p-1",
      entityName: "Rex",
      entityPartitionId: "breed-99",
    });
    mockCreate.mockResolvedValue({});

    render(<NoteDialog />);
    fireEvent.change(screen.getByPlaceholderText("Write a note…"), {
      target: { value: "good boy" },
    });
    fireEvent.submit(screen.getByTestId("form"));

    await waitFor(() =>
      expect(mockCreate).toHaveBeenCalledWith("note", {
        entity: "pet",
        entity_id: "p-1",
        text: "good boy",
        entity_partition_id: "breed-99",
      }),
    );
  });

  it("trims whitespace before saving", async () => {
    setPayload({
      entity: "breed",
      entityId: "b-1",
      entityName: "Bulldog",
    });
    mockCreate.mockResolvedValue({});

    render(<NoteDialog />);
    fireEvent.change(screen.getByPlaceholderText("Write a note…"), {
      target: { value: "  spaced  " },
    });
    fireEvent.submit(screen.getByTestId("form"));

    await waitFor(() =>
      expect(mockCreate).toHaveBeenCalledWith("note", {
        entity: "breed",
        entity_id: "b-1",
        text: "spaced",
      }),
    );
  });

  it("does not submit whitespace-only text", async () => {
    setPayload({
      entity: "breed",
      entityId: "b-1",
      entityName: "Bulldog",
    });

    render(<NoteDialog />);
    fireEvent.change(screen.getByPlaceholderText("Write a note…"), {
      target: { value: "   " },
    });

    expect(screen.getByTestId("save").hasAttribute("disabled")).toBe(true);
  });
});
