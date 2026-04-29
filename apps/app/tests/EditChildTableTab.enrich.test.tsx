// @vitest-environment jsdom

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  records: [] as Array<Record<string, unknown>>,
  dictionaryLabels: new Map<string, string>(),
  getDictionary: vi.fn(),
  useTabData: vi.fn(),
}));

vi.mock("@/contexts/SpaceContext", () => ({
  useSelectedEntity: () => ({ id: "parent-1", slug: "parent" }),
}));

vi.mock("@/utils/crudToast", () => ({
  withCrudToast: vi.fn(async (fn: () => Promise<unknown>) => ({
    ok: true,
    data: await fn(),
  })),
}));

vi.mock("@preact/signals-react/runtime", () => ({
  useSignals: vi.fn(),
}));

vi.mock("@ui/components/data-table", () => ({
  DataTable: ({ data }: { data: unknown[] }) => (
    <pre data-testid="table-data">{JSON.stringify(data)}</pre>
  ),
  DataTableColumnHeader: ({ title }: { title: string }) => <span>{title}</span>,
}));

vi.mock("@ui/components/button", () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock("@ui/components/dialog", () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

vi.mock("@ui/components/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("../src/components/edit/EditChildRecordDialog", () => ({
  EditChildRecordDialog: () => null,
}));

vi.mock("@breedhub/rxdb-store", () => ({
  dictionaryStore: {
    getDictionary: mockState.getDictionary,
  },
  getChildField: (
    record: Record<string, unknown> | null | undefined,
    name: string,
  ) => {
    if (!record) return undefined;
    const top = record[name];
    if (top !== undefined && top !== null) return top;
    const additional = record.additional as Record<string, unknown> | undefined;
    const nested = additional?.[name];
    return nested === null ? undefined : nested;
  },
  spaceStore: {
    delete: vi.fn(),
    deleteChildRecord: vi.fn(),
  },
  useTabData: mockState.useTabData,
}));

const baseDataSource = [
  {
    type: "child",
    childTable: { table: "pet_measurement" },
  },
] as any;

const breedField = {
  pet_measurement_field_breed_id: {
    showInTable: true,
    displayName: "Breed",
    isForeignKey: true,
    referencedTable: "breed",
    referencedFieldName: "name",
  },
} as any;

async function loadSubject() {
  vi.resetModules();
  const module = await import("../src/components/edit/tabs/EditChildTableTab");
  return module.EditChildTableTab;
}

describe("EditChildTableTab enrichment cache", () => {
  beforeEach(() => {
    mockState.records = [];
    mockState.dictionaryLabels = new Map();
    mockState.getDictionary.mockReset();
    mockState.getDictionary.mockImplementation(
      async (_table: string, options: { filterByIds?: string[] } = {}) => ({
        records: (options.filterByIds ?? []).map((id) => ({
          id,
          name: mockState.dictionaryLabels.get(id) ?? id,
        })),
        total: options.filterByIds?.length ?? 0,
        hasMore: false,
        nextCursor: null,
      }),
    );
    mockState.useTabData.mockReset();
    mockState.useTabData.mockImplementation((options: { enabled?: boolean }) => ({
      data: options.enabled ? mockState.records : [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    }));
  });

  it("reuses enriched records across unrelated rerenders with stable records", async () => {
    const EditChildTableTab = await loadSubject();
    mockState.records = [
      { id: "row-1", additional: { breed_id: "breed-1" } },
    ];
    mockState.dictionaryLabels.set("breed-1", "Spaniel");

    const { rerender } = render(
      <EditChildTableTab
        fields={breedField}
        dataSource={baseDataSource}
        searchFilter="first"
      />,
    );

    await waitFor(() => expect(mockState.getDictionary).toHaveBeenCalledTimes(1));

    rerender(
      <EditChildTableTab
        fields={breedField}
        dataSource={baseDataSource}
        searchFilter="second"
      />,
    );
    rerender(
      <EditChildTableTab
        fields={breedField}
        dataSource={baseDataSource}
        searchFilter="third"
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("table-data").textContent).toContain("Spaniel");
    });
    expect(mockState.getDictionary).toHaveBeenCalledTimes(1);
  });

  it("misses the enrichment cache when a foreign-key field is added", async () => {
    const EditChildTableTab = await loadSubject();
    mockState.records = [
      {
        id: "row-1",
        additional: {
          breed_id: "breed-1",
          contact_id: "contact-1",
        },
      },
    ];
    mockState.dictionaryLabels.set("breed-1", "Spaniel");
    mockState.dictionaryLabels.set("contact-1", "Ada");

    const { rerender } = render(
      <EditChildTableTab fields={{}} dataSource={baseDataSource} />,
    );

    expect(mockState.getDictionary).not.toHaveBeenCalled();

    rerender(
      <EditChildTableTab
        fields={{
          ...breedField,
          pet_measurement_field_contact_id: {
            showInTable: true,
            displayName: "Contact",
            isForeignKey: true,
            referencedTable: "contact",
            referencedFieldName: "name",
          },
        }}
        dataSource={baseDataSource}
      />,
    );

    await waitFor(() => expect(mockState.getDictionary).toHaveBeenCalledTimes(2));
    expect(screen.getByTestId("table-data").textContent).toContain("Spaniel");
    expect(screen.getByTestId("table-data").textContent).toContain("Ada");
  });

  it("does not leak enriched values when the record set changes", async () => {
    const EditChildTableTab = await loadSubject();
    mockState.records = [
      { id: "row-1", additional: { breed_id: "breed-1" } },
    ];
    mockState.dictionaryLabels.set("breed-1", "Spaniel");
    mockState.dictionaryLabels.set("breed-2", "Hound");

    const { rerender } = render(
      <EditChildTableTab fields={breedField} dataSource={baseDataSource} />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("table-data").textContent).toContain("Spaniel");
    });

    mockState.records = [
      { id: "row-2", additional: { breed_id: "breed-2" } },
    ];
    rerender(
      <EditChildTableTab fields={breedField} dataSource={baseDataSource} />,
    );

    await waitFor(() => {
      const text = screen.getByTestId("table-data").textContent ?? "";
      expect(text).toContain("Hound");
      expect(text).not.toContain("Spaniel");
    });
  });
});
