import type React from 'react';
import { BreedCoverV1 } from '../template/cover/BreedCoverV1';
import { DefaultCover } from '../template/cover/DefaultCover';
import { AvatarOutlet } from '../template/AvatarOutlet';
import { CoverOutlet } from '../template/CoverOutlet';
import { NameOutlet } from '../template/NameOutlet';
import { AchievementOutlet } from '../template/AchievementOutlet';
import { TabOutlet } from '../template/TabOutlet';
import { EntityAvatar } from '../shared/EntityAvatar';
import { BreedName } from '../breed/BreedName';
import { BreedAchievements } from '../breed/BreedAchievements';
import { PetName } from '../pet/PetName';
import { PetAchievements } from '../pet/PetAchievements';
import { LitterName } from '../litter/LitterName';
import { LitterAchievements } from '../litter/LitterAchievements';
import { KennelName } from '../kennel/KennelName';
import { KennelAchievements } from '../kennel/KennelAchievements';
import { ContactName } from '../contact/ContactName';
import { ContactAchievements } from '../contact/ContactAchievements';
import { EventName } from '../event/EventName';
import { EventAchievements } from '../event/EventAchievements';

/**
 * Registry of outlet components (universal structural wrappers)
 * Maps outlet names from config to actual React components
 *
 * Eager imports — outlets are always visible on every entity page,
 * lazy-loading them individually causes skeleton flicker with no benefit.
 * They live inside the SpacePage lazy route chunk anyway.
 */
const OUTLET_COMPONENTS: Record<string, React.ComponentType<any>> = {
  'CoverOutlet': CoverOutlet,
  'AvatarOutlet': AvatarOutlet,
  'NameOutlet': NameOutlet,
  'AchievementOutlet': AchievementOutlet,
  'TabOutlet': TabOutlet,
};

/**
 * Registry of block components (entity-specific content)
 * Maps component names from config to actual React components
 *
 * Eager imports — same reasoning as outlets. These are small (~3-8 KB each)
 * and always needed when viewing an entity page.
 */
const BLOCK_COMPONENTS: Record<string, React.ComponentType<any>> = {
  'BreedCoverV1': BreedCoverV1,
  'DefaultCover': DefaultCover,
  'EntityAvatar': EntityAvatar,
  'BreedAvatar': EntityAvatar,
  'BreedName': BreedName,
  'BreedAchievements': BreedAchievements,
  'PetName': PetName,
  'PetAchievements': PetAchievements,
  'LitterName': LitterName,
  'LitterAchievements': LitterAchievements,
  'KennelName': KennelName,
  'KennelAchievements': KennelAchievements,
  'ContactName': ContactName,
  'ContactAchievements': ContactAchievements,
  'EventName': EventName,
  'EventAchievements': EventAchievements,
};

export function getOutletComponent(name: string): React.ComponentType<any> | undefined {
  const component = OUTLET_COMPONENTS[name];

  if (!component && process.env.NODE_ENV === 'development') {
    console.error(`[ComponentRegistry] Unknown outlet: ${name}`);
  }

  return component;
}

export function getBlockComponent(name: string): React.ComponentType<any> | undefined {
  const component = BLOCK_COMPONENTS[name];

  if (!component && process.env.NODE_ENV === 'development') {
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
