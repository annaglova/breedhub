/**
 * Centralized Tab Component Registry
 *
 * Auto-discovers all *Tab.tsx components via Vite glob imports.
 * Used by TabPageTemplate and TabOutletRenderer.
 *
 * To add a new tab: create MyNewTab.tsx in the appropriate entity folder
 * and reference "MyNewTab" in the config. No changes to this file needed.
 */
import React from 'react';
import { TabBodySkeleton } from './TabBodySkeleton';

type TabModule = {
  default?: React.ComponentType<any>;
  [exportName: string]: React.ComponentType<any> | undefined;
};

type TabModuleLoader = () => Promise<TabModule>;

function createLazyRegisteredTab(
  loader: TabModuleLoader,
  componentName: string,
): React.ComponentType<any> {
  const LazyComponent = React.lazy(async () => {
    const module = await loader();
    const resolvedComponent = module[componentName] || module.default;

    if (!resolvedComponent) {
      throw new Error(
        `[tab-registry] Component "${componentName}" not found in lazy module`,
      );
    }

    return { default: resolvedComponent };
  });

  // Suspense fallback uses the shared TabBodySkeleton so each tab section
  // reserves consistent vertical space while its chunk is downloading.
  // Without this, scroll-mode visibility tracking (useTabNavigation) can
  // pick the wrong tab as active when chunks land out of order.
  function RegisteredLazyTab(props: any) {
    return React.createElement(
      React.Suspense,
      { fallback: React.createElement(TabBodySkeleton) },
      React.createElement(LazyComponent, props),
    );
  }

  RegisteredLazyTab.displayName = `LazyTab(${componentName})`;

  return RegisteredLazyTab;
}

// Auto-discover all tab components across entity folders
const tabModules = {
  ...(import.meta.glob('../space/tabs/*Tab.tsx') as Record<
    string,
    TabModuleLoader
  >),
  ...(import.meta.glob('../breed/tabs/*Tab.tsx') as Record<
    string,
    TabModuleLoader
  >),
  ...(import.meta.glob('../kennel/tabs/*Tab.tsx') as Record<
    string,
    TabModuleLoader
  >),
  ...(import.meta.glob('../pet/tabs/*Tab.tsx') as Record<
    string,
    TabModuleLoader
  >),
  ...(import.meta.glob('../litter/tabs/*Tab.tsx') as Record<
    string,
    TabModuleLoader
  >),
  ...(import.meta.glob('../contact/tabs/*Tab.tsx') as Record<
    string,
    TabModuleLoader
  >),
  ...(import.meta.glob('../event/tabs/*Tab.tsx') as Record<
    string,
    TabModuleLoader
  >),
  ...(import.meta.glob('../edit/tabs/*Tab.tsx') as Record<
    string,
    TabModuleLoader
  >),
};

export const TAB_COMPONENT_REGISTRY: Record<string, React.ComponentType<any>> = {};

for (const [path, loader] of Object.entries(tabModules)) {
  const match = path.match(/\/([^/]+)Tab\.tsx$/);

  if (!match) {
    continue;
  }

  const componentName = `${match[1]}Tab`;
  TAB_COMPONENT_REGISTRY[componentName] = createLazyRegisteredTab(
    loader,
    componentName,
  );
}
