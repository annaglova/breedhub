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
import { EditFormSkeleton } from '../edit/EditFormSkeleton';
import { TabBodySkeleton } from './TabBodySkeleton';

type TabModule = {
  default?: React.ComponentType<any>;
  [exportName: string]: React.ComponentType<any> | undefined;
};

type TabModuleLoader = () => Promise<TabModule>;

/**
 * Pick a Suspense fallback element matching the tab's eventual layout.
 * - EditFormTab uses a field-aware EditFormSkeleton built from the same
 *   `fields` config the real form will render — keeps cold-load and
 *   real-form structurally aligned (groups, columns, control count).
 * - EditChildTableTab / EditChildMatrixTab render their own column-aware
 *   skeleton on data load; using the generic TabBodySkeleton during chunk
 *   download would add a visually unrelated intermediate stage, so we use
 *   a null fallback and let the tab's own skeleton handle the wait.
 * - All other tabs fall back to the shared TabBodySkeleton.
 */
function buildFallback(componentName: string, props: any): React.ReactElement | null {
  if (componentName === 'EditFormTab') {
    return React.createElement(EditFormSkeleton, { fields: props?.fields });
  }
  if (
    componentName === 'EditChildTableTab' ||
    componentName === 'EditChildMatrixTab' ||
    componentName === 'PetHealthTab'
  ) {
    return null;
  }
  return React.createElement(TabBodySkeleton);
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

  // Suspense fallback reserves consistent space during chunk download so
  // visibility tracking and layout don't drift; per tab type the fallback
  // matches the eventual structure (see buildFallback above).
  function RegisteredLazyTab(props: any) {
    return React.createElement(
      React.Suspense,
      { fallback: buildFallback(componentName, props) },
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
