// @vitest-environment jsdom

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  PageErrorBoundary,
  TabErrorBoundary,
} from "../src/components/error-boundary/ErrorBoundary";

function CrashingComponent({ shouldCrash }: { shouldCrash: boolean }) {
  if (shouldCrash) {
    throw new Error("Boom");
  }

  return <div>Healthy content</div>;
}

describe("ErrorBoundary", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.restoreAllMocks();
  });

  async function render(ui: React.ReactNode) {
    await act(async () => {
      root.render(ui);
    });
  }

  it("renders a friendly page fallback and logs when a page crashes", async () => {
    await render(
      <PageErrorBoundary contextLabel="/breeds">
        <CrashingComponent shouldCrash={true} />
      </PageErrorBoundary>,
    );

    expect(container.textContent).toContain("This page hit a snag");
    expect(container.textContent).toContain("opening /breeds");
    expect(console.error).toHaveBeenCalled();
  });

  it("renders a tab fallback and keeps the error localized to that section", async () => {
    await render(
      <TabErrorBoundary contextLabel="Achievements">
        <CrashingComponent shouldCrash={true} />
      </TabErrorBoundary>,
    );

    expect(container.textContent).toContain("Achievements could not be rendered");
    expect(container.textContent).toContain("Retry section");
    expect(console.error).toHaveBeenCalled();
  });

  it("resets after resetKeys change and renders recovered content", async () => {
    await render(
      <PageErrorBoundary contextLabel="/pets" resetKeys={["first"]}>
        <CrashingComponent shouldCrash={true} />
      </PageErrorBoundary>,
    );

    expect(container.textContent).toContain("This page hit a snag");

    await render(
      <PageErrorBoundary contextLabel="/pets" resetKeys={["second"]}>
        <CrashingComponent shouldCrash={false} />
      </PageErrorBoundary>,
    );

    expect(container.textContent).toContain("Healthy content");
  });

  it("retries a tab after the fallback button is pressed", async () => {
    let shouldCrash = true;

    function FlakyTab() {
      if (shouldCrash) {
        throw new Error("Transient tab failure");
      }

      return <div>Recovered tab</div>;
    }

    await render(
      <TabErrorBoundary contextLabel="Pedigree">
        <FlakyTab />
      </TabErrorBoundary>,
    );

    expect(container.textContent).toContain("Pedigree could not be rendered");

    shouldCrash = false;
    const retryButton = container.querySelector("button");
    expect(retryButton).not.toBeNull();

    await act(async () => {
      retryButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.textContent).toContain("Recovered tab");
  });
});
