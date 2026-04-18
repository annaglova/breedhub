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

type TabModule = {
  default?: React.ComponentType<any>;
  [exportName: string]: React.ComponentType<any> | undefined;
};

type TabModuleLoader = () => Promise<TabModule>;

function TabContentFallback() {
  return React.createElement(
    "div",
    { className: "space-y-5 animate-pulse" },
    React.createElement("div", {
      className: "h-10 w-full rounded-lg bg-slate-200 dark:bg-slate-700",
    }),
    React.createElement(
      "div",
      { className: "space-y-5 px-5" },
      React.createElement("div", {
        className:
          "mt-6 h-32 w-full rounded-lg bg-slate-200 dark:bg-slate-700",
      }),
      React.createElement("div", {
        className:
          "mt-6 h-32 w-full rounded-lg bg-slate-200 dark:bg-slate-700",
      }),
      React.createElement("div", {
        className:
          "mt-6 h-32 w-full rounded-lg bg-slate-200 dark:bg-slate-700",
      }),
    ),
  );
}

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

  function RegisteredLazyTab(props: any) {
    return React.createElement(
      React.Suspense,
      { fallback: React.createElement(TabContentFallback) },
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
