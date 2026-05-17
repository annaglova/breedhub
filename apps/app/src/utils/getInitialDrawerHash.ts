import type { PageConfig } from "@/types/page-config.types";
import { getPageConfig } from "./getPageConfig";
import { getDefaultTabFragment, getTabsConfigFromPage } from "./tab-config";

interface DrawerHashSpaceConfig {
  pages?: Record<string, PageConfig>;
}

export function getInitialDrawerHash(
  config: DrawerHashSpaceConfig | null | undefined,
): string {
  const page = getPageConfig(config, { pageType: "view" }) ?? getPageConfig(config);
  if (!page) return "";

  const fragment = getDefaultTabFragment(getTabsConfigFromPage(page));
  return fragment ? `#${fragment}` : "";
}
