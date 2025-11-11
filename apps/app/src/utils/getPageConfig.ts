import type { PageConfig, PageType } from '../types/page-config.types';

interface GetPageConfigOptions {
  pageType?: PageType;
}

/**
 * Get page configuration from space config based on pageType
 *
 * Selection logic:
 * 1. If pageType is specified, find page with matching pageType
 * 2. Fallback to page with isDefault: true
 * 3. Final fallback to first page in pages object
 *
 * @param spaceConfig - Space configuration object containing pages
 * @param options - Options for page selection (pageType)
 * @returns PageConfig or null if no page found
 */
export function getPageConfig(
  spaceConfig: any,
  options: GetPageConfigOptions = {}
): PageConfig | null {
  if (!spaceConfig) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[getPageConfig] Missing spaceConfig');
    }
    return null;
  }

  const pages = spaceConfig?.pages || {};
  const pageEntries = Object.entries(pages);

  if (pageEntries.length === 0) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[getPageConfig] No pages found in spaceConfig');
      console.log('[getPageConfig] spaceConfig keys:', Object.keys(spaceConfig || {}));
      console.log('[getPageConfig] spaceConfig.pages:', spaceConfig?.pages);
    }
    return null;
  }

  // 1. If pageType is specified, find page with matching pageType
  if (options.pageType) {
    const matchingPage = pageEntries.find(
      ([, pageConfig]: [string, any]) => pageConfig.pageType === options.pageType
    );

    if (matchingPage) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[getPageConfig] Found page with pageType: ${options.pageType}`);
      }
      return matchingPage[1] as PageConfig;
    }

    if (process.env.NODE_ENV === 'development') {
      console.warn(`[getPageConfig] No page found with pageType: ${options.pageType}, falling back...`);
    }
  }

  // 2. Fallback to page with isDefault: true
  const defaultPage = pageEntries.find(
    ([, pageConfig]: [string, any]) => pageConfig.isDefault === true
  );

  if (defaultPage) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[getPageConfig] Using default page');
    }
    return defaultPage[1] as PageConfig;
  }

  // 3. Final fallback to first page
  if (process.env.NODE_ENV === 'development') {
    console.log('[getPageConfig] Using first page as fallback');
  }
  return pageEntries[0]?.[1] as PageConfig || null;
}

/**
 * Validate that a page config has required structure
 *
 * @param pageConfig - Page config to validate
 * @returns true if valid, false otherwise
 */
export function validatePageConfig(pageConfig: any): pageConfig is PageConfig {
  if (!pageConfig) {
    console.error('[validatePageConfig] Page config is null or undefined');
    return false;
  }

  if (pageConfig.component !== 'PublicPageTemplate') {
    console.error('[validatePageConfig] Invalid component:', pageConfig.component);
    return false;
  }

  if (!pageConfig.blocks || typeof pageConfig.blocks !== 'object') {
    console.error('[validatePageConfig] Invalid or missing blocks');
    return false;
  }

  return true;
}
