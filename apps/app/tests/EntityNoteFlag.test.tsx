import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

const {
  mockUseEntityNotes,
  mockOpenFor,
  mockGetPartitionField,
  mockUseAuth,
  mockNavigate,
} = vi.hoisted(() => ({
  mockUseEntityNotes: vi.fn(),
  mockOpenFor: vi.fn(),
  mockGetPartitionField: vi.fn(),
  mockUseAuth: vi.fn(),
  mockNavigate: vi.fn(),
}));

vi.mock("../src/hooks/useEntityNotes", () => ({
  useEntityNotes: mockUseEntityNotes,
}));

vi.mock("../src/stores/note-dialog.store", () => ({
  noteDialogStore: { openFor: mockOpenFor, close: vi.fn(), payload: { value: null } },
}));

vi.mock("@breedhub/rxdb-store", () => ({
  getPartitionFieldForEntity: mockGetPartitionField,
}));

vi.mock("@shared/core/auth", () => ({
  useAuth: mockUseAuth,
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: "/breeds/german-shepherd", search: "", hash: "" }),
}));

vi.mock("@ui/components/note-flag-button", () => ({
  NoteFlagButton: ({ hasNotes, onClick }: { hasNotes?: boolean; onClick?: () => void }) =>
    React.createElement(
      "button",
      { onClick, "data-testid": "flag", "data-has-notes": String(!!hasNotes) },
      "flag",
    ),
}));

import { EntityNoteFlag } from "../src/components/note/EntityNoteFlag";

describe("EntityNoteFlag", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ authenticated: true });
  });

  it("sets hasNotes=false when entities list is empty", () => {
    mockUseEntityNotes.mockReturnValue({ data: { entities: [], total: 0 } });
    mockGetPartitionField.mockReturnValue(undefined);

    render(
      <EntityNoteFlag entity={{ id: "b-1" }} entityType="breed" entityName="Bulldog" />,
    );

    expect(screen.getByTestId("flag").getAttribute("data-has-notes")).toBe("false");
  });

  it("sets hasNotes=true when entities list is non-empty", () => {
    mockUseEntityNotes.mockReturnValue({
      data: { entities: [{ id: "n-1" }, { id: "n-2" }], total: 2 },
    });
    mockGetPartitionField.mockReturnValue(undefined);

    render(
      <EntityNoteFlag entity={{ id: "b-1" }} entityType="breed" entityName="Bulldog" />,
    );

    expect(screen.getByTestId("flag").getAttribute("data-has-notes")).toBe("true");
  });

  it("opens dialog with non-partitioned payload", async () => {
    mockUseEntityNotes.mockReturnValue({ data: { entities: [], total: 0 } });
    mockGetPartitionField.mockReturnValue(undefined);

    render(
      <EntityNoteFlag entity={{ id: "b-1" }} entityType="breed" entityName="Bulldog" />,
    );

    fireEvent.click(screen.getByTestId("flag"));

    expect(mockOpenFor).toHaveBeenCalledWith({
      entity: "breed",
      entityId: "b-1",
      entityName: "Bulldog",
      entityPartitionId: null,
    });
  });

  it("opens dialog with partition id for Pet", async () => {
    mockUseEntityNotes.mockReturnValue({ data: { entities: [], total: 0 } });
    mockGetPartitionField.mockReturnValue("breed_id");

    render(
      <EntityNoteFlag
        entity={{ id: "p-1", breed_id: "breed-99" }}
        entityType="pet"
        entityName="Rex"
      />,
    );

    fireEvent.click(screen.getByTestId("flag"));

    expect(mockOpenFor).toHaveBeenCalledWith({
      entity: "pet",
      entityId: "p-1",
      entityName: "Rex",
      entityPartitionId: "breed-99",
    });
  });

  it("does nothing when entity has no id", async () => {
    mockUseEntityNotes.mockReturnValue({ data: { entities: [], total: 0 } });
    mockGetPartitionField.mockReturnValue(undefined);

    render(<EntityNoteFlag entity={{}} entityType="breed" entityName="Bulldog" />);

    fireEvent.click(screen.getByTestId("flag"));

    expect(mockOpenFor).not.toHaveBeenCalled();
  });

  it("redirects unauth user to sign-in with current url instead of opening dialog", () => {
    mockUseAuth.mockReturnValue({ authenticated: false });
    mockUseEntityNotes.mockReturnValue({ data: { entities: [], total: 0 } });
    mockGetPartitionField.mockReturnValue(undefined);

    render(
      <EntityNoteFlag entity={{ id: "b-1" }} entityType="breed" entityName="Bulldog" />,
    );

    fireEvent.click(screen.getByTestId("flag"));

    expect(mockOpenFor).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith(
      "/sign-in?redirectURL=%2Fbreeds%2Fgerman-shepherd",
    );
  });
});
