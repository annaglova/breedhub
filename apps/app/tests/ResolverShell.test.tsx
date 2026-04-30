import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ResolverShell } from "@/pages/ResolverShell";

describe("ResolverShell", () => {
  it("renders a non-empty placeholder marked as busy (no blank stage)", () => {
    const { container } = render(<ResolverShell />);
    const root = container.firstElementChild as HTMLElement | null;
    expect(root).not.toBeNull();
    expect(root?.getAttribute("aria-busy")).toBe("true");
    expect(root?.getAttribute("role")).toBe("status");
  });

  it("uses an animate-pulse surface (skeleton, not spinner) per W1.2", () => {
    const { container } = render(<ResolverShell />);
    const root = container.firstElementChild as HTMLElement | null;
    expect(root?.className).toContain("animate-pulse");
    expect(root?.querySelector(".animate-spin")).toBeNull();
  });
});
