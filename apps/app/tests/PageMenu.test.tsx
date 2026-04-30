import { render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeAll(() => {
  if (typeof globalThis.ResizeObserver === "undefined") {
    (globalThis as unknown as { ResizeObserver: typeof ResizeObserverStub }).ResizeObserver =
      ResizeObserverStub;
  }
});

vi.mock("@/components/shared/Icon", () => ({
  Icon: ({ icon }: { icon: { name: string } }) => (
    <span data-testid={`icon-${icon.name}`} />
  ),
}));

import { PageMenu } from "@/components/tabs/PageMenu";
import type { Tab } from "@/components/tabs/TabsContainer";

const NoopComponent = () => null;

const tabs: Tab[] = [
  {
    id: "1",
    fragment: "info",
    label: "Info",
    icon: { name: "Info", source: "lucide" },
    component: NoopComponent,
  },
  {
    id: "2",
    fragment: "weight",
    label: "Weight",
    icon: { name: "Weight", source: "lucide" },
    component: NoopComponent,
  },
  {
    id: "3",
    fragment: "achievements",
    label: "Achievements",
    icon: { name: "Trophy", source: "lucide" },
    component: NoopComponent,
  },
];

describe("PageMenu tab buttons", () => {
  it("renders every tab button with the responsive min-width classes (W1.4 anti-shift)", () => {
    render(<PageMenu tabs={tabs} activeTab="info" onTabChange={() => {}} />);

    const buttons = screen.getAllByRole("button").filter((btn) => {
      const label = btn.textContent?.trim() ?? "";
      return tabs.some((t) => label.includes(t.label));
    });

    expect(buttons).toHaveLength(tabs.length);

    for (const btn of buttons) {
      expect(btn.className).toContain("min-w-[112px]");
      expect(btn.className).toContain("md:min-w-[140px]");
    }
  });

  it("preserves min-width regardless of which tab is active (no width drift on data arrival)", () => {
    const { rerender } = render(
      <PageMenu tabs={tabs} activeTab="info" onTabChange={() => {}} />,
    );

    const widthsByLabel = (): Record<string, string> => {
      const map: Record<string, string> = {};
      for (const tab of tabs) {
        const btn = screen.getByText(tab.label).closest("button");
        if (btn) map[tab.label] = btn.className;
      }
      return map;
    };

    const before = widthsByLabel();

    rerender(
      <PageMenu tabs={tabs} activeTab="achievements" onTabChange={() => {}} />,
    );

    const after = widthsByLabel();

    for (const tab of tabs) {
      expect(after[tab.label]).toContain("min-w-[112px]");
      expect(after[tab.label]).toContain("md:min-w-[140px]");
      expect(before[tab.label]).toContain("min-w-[112px]");
    }
  });
});
