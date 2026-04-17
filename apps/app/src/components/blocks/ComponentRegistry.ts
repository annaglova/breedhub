import React from "react";

type RegisteredComponent = React.ComponentType<any>;

type ComponentModule = {
  default?: RegisteredComponent;
  [exportName: string]: RegisteredComponent | undefined;
};

type ComponentLoader = () => Promise<ComponentModule>;

function createLazyRegisteredComponent(
  loader: ComponentLoader,
  exportName: string,
): RegisteredComponent {
  const LazyComponent = React.lazy(async () => {
    const module = await loader();
    const resolvedComponent = module[exportName] || module.default;

    if (!resolvedComponent) {
      throw new Error(
        `[ComponentRegistry] Component "${exportName}" not found in lazy module`,
      );
    }

    return { default: resolvedComponent };
  });

  function RegisteredLazyComponent(props: any) {
    return React.createElement(
      React.Suspense,
      { fallback: null },
      React.createElement(LazyComponent, props),
    );
  }

  RegisteredLazyComponent.displayName = `LazyRegistry(${exportName})`;

  return RegisteredLazyComponent;
}

/**
 * Registry of outlet components (universal structural wrappers)
 * Maps outlet names from config to actual React components
 */
const OUTLET_COMPONENTS: Record<string, RegisteredComponent> = {
  CoverOutlet: createLazyRegisteredComponent(
    () => import("../template/CoverOutlet"),
    "CoverOutlet",
  ),
  AvatarOutlet: createLazyRegisteredComponent(
    () => import("../template/AvatarOutlet"),
    "AvatarOutlet",
  ),
  NameOutlet: createLazyRegisteredComponent(
    () => import("../template/NameOutlet"),
    "NameOutlet",
  ),
  AchievementOutlet: createLazyRegisteredComponent(
    () => import("../template/AchievementOutlet"),
    "AchievementOutlet",
  ),
  TabOutlet: createLazyRegisteredComponent(
    () => import("../template/TabOutlet"),
    "TabOutlet",
  ),
};

const entityAvatarComponent = createLazyRegisteredComponent(
  () => import("../shared/EntityAvatar"),
  "EntityAvatar",
);

/**
 * Registry of block components (entity-specific content)
 * Maps component names from config to actual React components
 */
const BLOCK_COMPONENTS: Record<string, RegisteredComponent> = {
  BreedCoverV1: createLazyRegisteredComponent(
    () => import("../template/cover/BreedCoverV1"),
    "BreedCoverV1",
  ),
  DefaultCover: createLazyRegisteredComponent(
    () => import("../template/cover/DefaultCover"),
    "DefaultCover",
  ),
  EntityAvatar: entityAvatarComponent,
  BreedAvatar: entityAvatarComponent,
  BreedName: createLazyRegisteredComponent(
    () => import("../breed/BreedName"),
    "BreedName",
  ),
  BreedAchievements: createLazyRegisteredComponent(
    () => import("../breed/BreedAchievements"),
    "BreedAchievements",
  ),
  PetName: createLazyRegisteredComponent(
    () => import("../pet/PetName"),
    "PetName",
  ),
  PetAchievements: createLazyRegisteredComponent(
    () => import("../pet/PetAchievements"),
    "PetAchievements",
  ),
  LitterName: createLazyRegisteredComponent(
    () => import("../litter/LitterName"),
    "LitterName",
  ),
  LitterAchievements: createLazyRegisteredComponent(
    () => import("../litter/LitterAchievements"),
    "LitterAchievements",
  ),
  KennelName: createLazyRegisteredComponent(
    () => import("../kennel/KennelName"),
    "KennelName",
  ),
  KennelAchievements: createLazyRegisteredComponent(
    () => import("../kennel/KennelAchievements"),
    "KennelAchievements",
  ),
  ContactName: createLazyRegisteredComponent(
    () => import("../contact/ContactName"),
    "ContactName",
  ),
  ContactAchievements: createLazyRegisteredComponent(
    () => import("../contact/ContactAchievements"),
    "ContactAchievements",
  ),
  EventName: createLazyRegisteredComponent(
    () => import("../event/EventName"),
    "EventName",
  ),
  EventAchievements: createLazyRegisteredComponent(
    () => import("../event/EventAchievements"),
    "EventAchievements",
  ),
};

export function getOutletComponent(
  name: string,
): React.ComponentType<any> | undefined {
  const component = OUTLET_COMPONENTS[name];

  if (!component && process.env.NODE_ENV === "development") {
    console.error(`[ComponentRegistry] Unknown outlet: ${name}`);
  }

  return component;
}

export function getBlockComponent(
  name: string,
): React.ComponentType<any> | undefined {
  const component = BLOCK_COMPONENTS[name];

  if (!component && process.env.NODE_ENV === "development") {
    console.error(`[ComponentRegistry] Unknown component: ${name}`);
  }

  return component;
}

export function hasOutletComponent(name: string): boolean {
  return name in OUTLET_COMPONENTS;
}

export function hasBlockComponent(name: string): boolean {
  return name in BLOCK_COMPONENTS;
}

export function getRegisteredOutlets(): string[] {
  return Object.keys(OUTLET_COMPONENTS);
}

export function getRegisteredComponents(): string[] {
  return Object.keys(BLOCK_COMPONENTS);
}
