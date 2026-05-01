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
import { EditChildTableTabSkeleton } from '../edit/tabs/EditChildTableTabSkeleton';
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
 * - EditChildTableTab uses a column-aware EditChildTableTabSkeleton built
 *   from the same `fields` config — DataTable's own skeleton mode handles
 *   the data-load stage too, so the same skeleton structurally covers
 *   chunk-download → data-load → swap to rows in one continuous frame.
 * - EditChildMatrixTab renders its own column-aware skeleton inline; the
 *   columnEntities resolve async so we can't build a structurally exact
 *   fallback here yet (W2.2 follow-up). null fallback keeps cold-load
 *   blank until the chunk lands and the matrix's own skeleton takes over.
 * - All other tabs fall back to the shared TabBodySkeleton.
 */
function buildFallback(componentName: string, props: any): React.ReactElement | null {
  if (componentName === 'EditFormTab') {
    return React.createElement(EditFormSkeleton, { fields: props?.fields });
  }
  if (componentName === 'EditChildTableTab') {
    return React.createElement(EditChildTableTabSkeleton, {
      fields: props?.fields,
      rowActions: props?.rowActions,
    });
  }
  if (componentName === 'EditChildMatrixTab') {
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
