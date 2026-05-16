import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter, useLocation } from "react-router-dom";

import type { SpaceQuickFiltersConfig } from "@breedhub/rxdb-store";
import { PetOwnerBreederFilter } from "../PetOwnerBreederFilter";

vi.mock("@ui/lib/lucide-icons", () => ({
  LucideIconByName: ({ name }: { name: string }) => (
    <svg aria-hidden="true" data-testid={`icon-${name}`} />
  ),
}));

function makeConfig(
  modes: SpaceQuickFiltersConfig["modes"] = {
    owned: {
      slug: "owned",
      label: "Owned",
      order: 20,
      isDefault: true,
      table: "pet_owner",
      parentField: "contact_id",
      entityIdField: "pet_id",
      entityPartitionField: "pet_breed_id",
    },
    bred: {
      slug: "bred",
      label: "Bred",
      order: 10,
      table: "offspring_in_contact",
      parentField: "contact_id",
      entityIdField: "pet_id",
      entityPartitionField: "pet_breed_id",
    },
    all: {
      slug: "all",
      label: "All",
      order: 30,
      table: "pet_in_contact",
      parentField: "contact_id",
      entityIdField: "pet_id",
      entityPartitionField: "pet_breed_id",
    },
  },
): SpaceQuickFiltersConfig {
  return {
    component: "PetOwnerBreederFilter",
    parentIdSource: "currentContactId",
    modes,
  };
}

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location-search">{location.search}</div>;
}

function renderFilter(
  config: SpaceQuickFiltersConfig = makeConfig(),
  initialEntry = "/pets",
) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <PetOwnerBreederFilter config={config} />
      <LocationProbe />
    </MemoryRouter>,
  );
}

describe("PetOwnerBreederFilter", () => {
  it("renders one button per mode sorted by order", () => {
    renderFilter();

    expect(
      screen.getAllByRole("button").map((button) => button.textContent),
    ).toEqual(["Bred", "Owned", "All"]);
  });

  it("highlights the active chip from the URL scope", () => {
    renderFilter(makeConfig(), "/pets?scope=bred");

    expect(screen.getByRole("button", { name: "Bred" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Owned" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByRole("button", { name: "All" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("falls back to the default mode when there is no scope param", () => {
    renderFilter();

    expect(screen.getByRole("button", { name: "Owned" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("falls back to the first mode when no mode is default and there is no scope param", () => {
    renderFilter(
      makeConfig({
        owned: {
          slug: "owned",
          label: "Owned",
          order: 20,
          table: "pet_owner",
          parentField: "contact_id",
          entityIdField: "pet_id",
        },
        bred: {
          slug: "bred",
          label: "Bred",
          order: 10,
          table: "offspring_in_contact",
          parentField: "contact_id",
          entityIdField: "pet_id",
        },
      }),
    );

    expect(screen.getByRole("button", { name: "Bred" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("writes the clicked mode slug to the scope search param", () => {
    renderFilter();

    fireEvent.click(screen.getByRole("button", { name: "Bred" }));

    expect(screen.getByTestId("location-search")).toHaveTextContent(
      "?scope=bred",
    );
  });

  it("hides itself when no modes are configured", () => {
    const { container } = render(
      <MemoryRouter>
        <PetOwnerBreederFilter config={makeConfig({})} />
      </MemoryRouter>,
    );

    expect(container.firstChild).toBeNull();
  });
});
