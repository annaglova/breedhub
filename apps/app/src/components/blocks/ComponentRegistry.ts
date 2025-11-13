import { BreedCoverV1 } from '../template/cover/BreedCoverV1';
import { AvatarOutlet } from '../template/AvatarOutlet';
import { CoverOutlet } from '../template/CoverOutlet';
import { NameOutlet } from '../template/NameOutlet';
import { BreedAvatar } from '../breed/BreedAvatar';
import { BreedName } from '../breed/BreedName';
import type React from 'react';

/**
 * Registry of outlet components (universal structural wrappers)
 * Maps outlet names from config to actual React components
 */
const OUTLET_COMPONENTS: Record<string, React.ComponentType<any>> = {
  'CoverOutlet': CoverOutlet,
  'AvatarOutlet': AvatarOutlet,
  'NameOutlet': NameOutlet,
  // Add more outlets here: TabsOutlet, etc.
};

/**
 * Registry of block components (entity-specific content)
 * Maps component names from config to actual React components
 */
const BLOCK_COMPONENTS: Record<string, React.ComponentType<any>> = {
  'BreedCoverV1': BreedCoverV1,
  'BreedAvatar': BreedAvatar,
  'BreedName': BreedName,
  // Add more block components here as needed
};

/**
 * Get an outlet component by name from the registry
 * Returns undefined if outlet not found
 *
 * @param name - Outlet name from config (e.g., 'CoverOutlet')
 * @returns React component or undefined
 */
export function getOutletComponent(name: string): React.ComponentType<any> | undefined {
  const component = OUTLET_COMPONENTS[name];

  if (process.env.NODE_ENV === 'development') {
    console.log('[ComponentRegistry] Outlet lookup:', {
      requestedName: name,
      found: !!component,
      availableOutlets: Object.keys(OUTLET_COMPONENTS),
      component
    });
  }

  if (!component && process.env.NODE_ENV === 'development') {
    console.error(`[ComponentRegistry] Unknown outlet: ${name}`);
  }

  return component;
}

/**
 * Get a block component by name from the registry
 * Returns undefined if component not found
 *
 * @param name - Component name from config (e.g., 'BreedCoverV1')
 * @returns React component or undefined
 */
export function getBlockComponent(name: string): React.ComponentType<any> | undefined {
  const component = BLOCK_COMPONENTS[name];

  if (process.env.NODE_ENV === 'development') {
    console.log('[ComponentRegistry] Component lookup:', {
      requestedName: name,
      found: !!component,
      availableComponents: Object.keys(BLOCK_COMPONENTS),
      component
    });
  }

  if (!component && process.env.NODE_ENV === 'development') {
    console.error(`[ComponentRegistry] Unknown component: ${name}`);
  }

  return component;
}

/**
 * Check if an outlet is registered
 *
 * @param name - Outlet name to check
 * @returns true if outlet exists in registry
 */
export function hasOutletComponent(name: string): boolean {
  return name in OUTLET_COMPONENTS;
}

/**
 * Check if a component is registered
 *
 * @param name - Component name to check
 * @returns true if component exists in registry
 */
export function hasBlockComponent(name: string): boolean {
  return name in BLOCK_COMPONENTS;
}

/**
 * Get list of all registered outlet names
 *
 * @returns Array of registered outlet names
 */
export function getRegisteredOutlets(): string[] {
  return Object.keys(OUTLET_COMPONENTS);
}

/**
 * Get list of all registered component names
 *
 * @returns Array of registered component names
 */
export function getRegisteredComponents(): string[] {
  return Object.keys(BLOCK_COMPONENTS);
}
