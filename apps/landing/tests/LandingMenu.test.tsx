import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import LandingMenu from "../src/components/LandingMenu";

describe("LandingMenu", () => {
  it("renders expected navigation links", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <LandingMenu />
      </MemoryRouter>,
    );

    const expectedLinks = [
      { label: "Product", href: "/product" },
      { label: "Pricing", href: "/pricing" },
      { label: "About", href: "/about" },
    ];

    const links = expectedLinks.map(({ label, href }) => {
      const link = screen.getAllByRole("link", { name: label })[0];
      expect(link).toHaveAttribute("href", href);
      return link;
    });

    expect(links).toHaveLength(3);
  });
});
