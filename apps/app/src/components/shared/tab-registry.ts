/**
 * Centralized Tab Component Registry
 *
 * Auto-discovers all *Tab.tsx components via Vite glob imports.
 * Used by TabPageTemplate and TabOutletRenderer.
 *
 * To add a new tab: create MyNewTab.tsx in the appropriate entity folder
 * and reference "MyNewTab" in the config. No changes to this file needed.
 */
import type React from 'react';

// Auto-discover all tab components across entity folders
const breedTabModules = import.meta.glob('../breed/tabs/*Tab.tsx', { eager: true });
const kennelTabModules = import.meta.glob('../kennel/tabs/*Tab.tsx', { eager: true });
const petTabModules = import.meta.glob('../pet/tabs/*Tab.tsx', { eager: true });
const litterTabModules = import.meta.glob('../litter/tabs/*Tab.tsx', { eager: true });
const contactTabModules = import.meta.glob('../contact/tabs/*Tab.tsx', { eager: true });
const eventTabModules = import.meta.glob('../event/tabs/*Tab.tsx', { eager: true });
const editTabModules = import.meta.glob('../edit/tabs/*Tab.tsx', { eager: true });

export const TAB_COMPONENT_REGISTRY: Record<string, React.ComponentType<any>> = {};

function registerModules(modules: Record<string, any>) {
  for (const [path, module] of Object.entries(modules)) {
    const match = path.match(/\/([^/]+)Tab\.tsx$/);
    if (match) {
      const componentName = match[1] + 'Tab';
      const Component = (module as any)[componentName] || (module as any).default;
      if (Component) {
        TAB_COMPONENT_REGISTRY[componentName] = Component;
      }
    }
  }
}

registerModules(breedTabModules);
registerModules(kennelTabModules);
registerModules(petTabModules);
registerModules(litterTabModules);
registerModules(contactTabModules);
registerModules(eventTabModules);
registerModules(editTabModules);
