import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SpaceEmptyState } from "@/components/space/SpaceEmptyState";

const filterCat = { id: "pet_type_id", label: "Pet type: Cat", isRequired: true };
const filterBreed = { id: "breed_id", label: "Breed: Test", isRequired: true };
const filterColor = { id: "color_id", label: "Color: Blue" };

describe("SpaceEmptyState", () => {
  it("renders headline using entityLabelPlural", () => {
    render(
      <SpaceEmptyState
        filters={[filterCat]}
        onFilterRemove={vi.fn()}
        onClearAll={vi.fn()}
        entityLabelPlural="pets"
      />,
    );
    expect(screen.getByText("No pets match these filters")).toBeInTheDocument();
  });

  it("renders search-query headline when searchQuery is provided", () => {
    render(
      <SpaceEmptyState
        filters={[]}
        onFilterRemove={vi.fn()}
        onClearAll={vi.fn()}
        entityLabelPlural="pets"
        searchQuery="rex"
      />,
    );
    expect(screen.getByText(/No pets match "rex"/)).toBeInTheDocument();
  });

  it("renders all filters as chips, including required ones", () => {
    render(
      <SpaceEmptyState
        filters={[filterCat, filterBreed, filterColor]}
        onFilterRemove={vi.fn()}
        onClearAll={vi.fn()}
      />,
    );
    expect(screen.getByText("Pet type: Cat")).toBeInTheDocument();
    expect(screen.getByText("Breed: Test")).toBeInTheDocument();
    expect(screen.getByText("Color: Blue")).toBeInTheDocument();
  });

  it("renders × button only on removable (non-required) filters", () => {
    render(
      <SpaceEmptyState
        filters={[filterCat, filterColor]}
        onFilterRemove={vi.fn()}
        onClearAll={vi.fn()}
      />,
    );
    // Required filter (Pet type: Cat) → no remove button
    expect(screen.queryByLabelText(/Remove Pet type: Cat/)).toBeNull();
    // Removable filter (Color: Blue) → remove button present
    expect(screen.getByLabelText(/Remove Color: Blue/)).toBeInTheDocument();
  });

  it("calls onFilterRemove with the filter when chip × is clicked", () => {
    const onFilterRemove = vi.fn();
    render(
      <SpaceEmptyState
        filters={[filterColor]}
        onFilterRemove={onFilterRemove}
        onClearAll={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByLabelText(/Remove Color: Blue/));
    expect(onFilterRemove).toHaveBeenCalledTimes(1);
    expect(onFilterRemove).toHaveBeenCalledWith(filterColor);
  });

  it("hides the Clear all button when no removable filters exist", () => {
    render(
      <SpaceEmptyState
        filters={[filterCat, filterBreed]}
        onFilterRemove={vi.fn()}
        onClearAll={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: /Clear all filters/i })).toBeNull();
  });

  it("shows the Clear all button when at least one removable filter exists", () => {
    const onClearAll = vi.fn();
    render(
      <SpaceEmptyState
        filters={[filterCat, filterColor]}
        onFilterRemove={vi.fn()}
        onClearAll={onClearAll}
      />,
    );
    const btn = screen.getByRole("button", { name: /Clear all filters/i });
    fireEvent.click(btn);
    expect(onClearAll).toHaveBeenCalledTimes(1);
  });

  it("uses default plural 'items' when entityLabelPlural is omitted", () => {
    render(
      <SpaceEmptyState
        filters={[filterColor]}
        onFilterRemove={vi.fn()}
        onClearAll={vi.fn()}
      />,
    );
    expect(screen.getByText("No items match these filters")).toBeInTheDocument();
  });
});
