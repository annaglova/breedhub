import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/blocks/TabOutletRenderer", () => ({
  TabOutletRenderer: () => <div data-testid="tab-outlet-renderer" />,
}));

import { TabOutlet } from "@/components/template/TabOutlet";

const tabsConfig = {
  achievements: { order: 1, component: "BreedAchievementsTab", isDefault: true },
  patrons: { order: 2, component: "BreedPatronsTab" },
  pets: { order: 3, component: "BreedTopPetsTab" },
  kennels: { order: 4, component: "BreedTopKennelsTab" },
} as Record<string, { order: number; component: string; isDefault?: boolean }>;

describe("TabOutlet skeleton", () => {
  const pillSelector = "div.h-4.rounded-full.animate-pulse";

  it("renders one placeholder pill per config entry", () => {
    const { container } = render(
      <TabOutlet
        component="PageMenu"
        isLoading
        tabs={tabsConfig as any}
        tabMode="scroll"
      />,
    );
    expect(container.querySelectorAll(pillSelector).length).toBe(4);
  });

  it("falls back to 4 placeholder pills when no config is provided", () => {
    const { container } = render(
      <TabOutlet component="PageMenu" isLoading tabMode="scroll" />,
    );
    expect(container.querySelectorAll(pillSelector).length).toBe(4);
  });

  it("uses deterministic pill widths so re-renders don't jitter (no Math.random)", () => {
    const widthsFromRender = () => {
      const { container, unmount } = render(
        <TabOutlet
          component="PageMenu"
          isLoading
          tabs={tabsConfig as any}
          tabMode="scroll"
        />,
      );
      const widths = Array.from(container.querySelectorAll(pillSelector)).map(
        (el) => (el as HTMLElement).style.width,
      );
      unmount();
      return widths;
    };
    expect(widthsFromRender()).toEqual(widthsFromRender());
  });

  it("delegates to TabOutletRenderer when not loading", () => {
    const { getByTestId } = render(
      <TabOutlet
        component="PageMenu"
        isLoading={false}
        tabs={tabsConfig as any}
        tabMode="scroll"
      />,
    );
    expect(getByTestId("tab-outlet-renderer")).toBeInTheDocument();
  });
});
