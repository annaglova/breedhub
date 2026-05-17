import { describe, expect, it } from "vitest";
import type { PageConfig } from "@/types/page-config.types";
import { getInitialDrawerHash } from "../getInitialDrawerHash";

function pageConfig({
  pageType,
  isDefault,
  tabs,
}: {
  pageType?: PageConfig["pageType"];
  isDefault?: boolean;
  tabs?: Record<string, any>;
}): PageConfig {
  return {
    component: "PublicPageTemplate",
    pageType,
    isDefault,
    blocks: tabs
      ? {
          tabs: {
            component: "TabsContainer",
            outlet: "TabOutlet",
            tabs,
          },
        }
      : {},
  };
}

describe("getInitialDrawerHash", () => {
  it("uses the view page before a default non-view page", () => {
    const config = {
      pages: {
        edit: pageConfig({
          pageType: "edit",
          isDefault: true,
          tabs: {
            overview: { order: 1, component: "OverviewTab", slug: "edit-overview" },
          },
        }),
        public: pageConfig({
          pageType: "view",
          tabs: {
            details: {
              order: 1,
              component: "DetailsTab",
              isDefault: true,
              slug: "public-details",
            },
          },
        }),
      },
    };

    expect(getInitialDrawerHash(config)).toBe("#public-details");
  });

  it("falls back to the default page when no view page is configured", () => {
    const config = {
      pages: {
        first: pageConfig({
          tabs: {
            first: { order: 1, component: "FirstTab", slug: "first-tab" },
          },
        }),
        default: pageConfig({
          isDefault: true,
          tabs: {
            overview: {
              order: 1,
              component: "OverviewTab",
              isDefault: true,
              slug: "default-overview",
            },
          },
        }),
      },
    };

    expect(getInitialDrawerHash(config)).toBe("#default-overview");
  });

  it("falls back to the first page and first ordered tab", () => {
    const config = {
      pages: {
        first: pageConfig({
          tabs: {
            later: { order: 2, component: "LaterTab", slug: "later" },
            earlier: { order: 1, component: "EarlierTab", slug: "earlier" },
          },
        }),
      },
    };

    expect(getInitialDrawerHash(config)).toBe("#earlier");
  });

  it("uses preferDefault before isDefault within the selected page", () => {
    const config = {
      pages: {
        public: pageConfig({
          pageType: "view",
          tabs: {
            overview: {
              order: 1,
              component: "OverviewTab",
              isDefault: true,
              slug: "overview",
            },
            achievements: {
              order: 2,
              component: "AchievementsTab",
              preferDefault: true,
              slug: "achievements",
            },
          },
        }),
      },
    };

    expect(getInitialDrawerHash(config)).toBe("#achievements");
  });

  it("returns an empty string when no page tab fragment is available", () => {
    expect(getInitialDrawerHash(undefined)).toBe("");
    expect(getInitialDrawerHash(null)).toBe("");
    expect(getInitialDrawerHash({})).toBe("");
    expect(
      getInitialDrawerHash({
        pages: {
          public: pageConfig({ pageType: "view" }),
        },
      }),
    ).toBe("");
  });
});
