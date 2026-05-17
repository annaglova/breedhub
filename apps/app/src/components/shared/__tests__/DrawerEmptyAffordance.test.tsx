// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter, Outlet, Route, Routes } from "react-router-dom";

vi.mock("@/assets/images/pettypes/dog-logo-muted.svg", () => ({
  default: "dog-logo-muted.svg",
}));

vi.mock("@ui/lib/utils", () => ({
  cn: (...inputs: Array<string | undefined | false | null>) =>
    inputs.filter(Boolean).join(" "),
}));

import {
  DrawerEmptyAffordance,
  useDrawerListEmpty,
} from "../DrawerEmptyAffordance";

function DrawerListEmptyProbe() {
  return <div data-testid="list-empty">{String(useDrawerListEmpty())}</div>;
}

function ContextRoute({ value }: { value: { listIsEmpty: boolean } }) {
  return <Outlet context={value} />;
}

function renderUseDrawerListEmpty(value?: { listIsEmpty: boolean }) {
  return render(
    <MemoryRouter initialEntries={["/drawer"]}>
      <Routes>
        {value ? (
          <Route path="/" element={<ContextRoute value={value} />}>
            <Route path="drawer" element={<DrawerListEmptyProbe />} />
          </Route>
        ) : (
          <Route path="/drawer" element={<DrawerListEmptyProbe />} />
        )}
      </Routes>
    </MemoryRouter>,
  );
}

describe("DrawerEmptyAffordance", () => {
  it("renders the idle empty drawer affordance", () => {
    const { container } = render(<DrawerEmptyAffordance />);
    const illustration = container.querySelector("img");

    expect(screen.getByText("Nothing to show")).toBeInTheDocument();
    expect(illustration).toHaveAttribute("aria-hidden", "true");
    expect(illustration).toHaveAttribute("alt", "");
    expect(document.querySelector(".lucide-inbox")).toBeInTheDocument();
  });
});

describe("useDrawerListEmpty", () => {
  it("returns true when outlet context has listIsEmpty true", () => {
    renderUseDrawerListEmpty({ listIsEmpty: true });

    expect(screen.getByTestId("list-empty")).toHaveTextContent("true");
  });

  it("returns false when outlet context has listIsEmpty false", () => {
    renderUseDrawerListEmpty({ listIsEmpty: false });

    expect(screen.getByTestId("list-empty")).toHaveTextContent("false");
  });

  it("returns false when no outlet context is present", () => {
    renderUseDrawerListEmpty();

    expect(screen.getByTestId("list-empty")).toHaveTextContent("false");
  });
});
