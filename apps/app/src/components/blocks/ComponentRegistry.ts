import { BreedCoverV1 } from '../template/cover/BreedCoverV1';
import { AvatarOutlet } from '../template/AvatarOutlet';
import type React from 'react';

/**
 * Registry of block components that can be dynamically rendered
 * Maps component names from config to actual React components
 */
const BLOCK_COMPONENTS: Record<string, React.ComponentType<any>> = {
  'BreedCoverV1': BreedCoverV1,
  'AvatarOutlet': AvatarOutlet,
  // Add more block components here as needed
};

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
    console.log('[ComponentRegistry] Lookup:', {
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
 * Check if a component is registered
 *
 * @param name - Component name to check
 * @returns true if component exists in registry
 */
export function hasBlockComponent(name: string): boolean {
  return name in BLOCK_COMPONENTS;
}

/**
 * Get list of all registered component names
 *
 * @returns Array of registered component names
 */
export function getRegisteredComponents(): string[] {
  return Object.keys(BLOCK_COMPONENTS);
}
