import React, { createContext, useContext } from 'react';
import { Signal } from '@preact/signals-react';

/**
 * SpaceContext - Provides space configuration and selected entity signals to all child components
 *
 * This context allows blocks and other components to access reactive signals for:
 * - spaceConfigSignal: The space configuration
 * - selectedEntitySignal: The currently selected entity
 *
 * Benefits of using signals:
 * - Automatic reactivity - components re-render when signals change
 * - No prop drilling - access context anywhere in the tree
 * - Performance - only components that use the signal re-render
 */
interface SpaceContextValue {
  spaceConfigSignal: Signal<any> | null;
  selectedEntitySignal: Signal<any> | null;
}

const SpaceContext = createContext<SpaceContextValue | null>(null);

interface SpaceProviderProps {
  spaceConfigSignal: Signal<any>;
  selectedEntitySignal: Signal<any> | null;
  children: React.ReactNode;
}

/**
 * SpaceProvider - Wraps components that need access to space config and selected entity
 *
 * Usage:
 * <SpaceProvider spaceConfigSignal={configSignal} selectedEntitySignal={entitySignal}>
 *   <YourComponents />
 * </SpaceProvider>
 */
export function SpaceProvider({
  spaceConfigSignal,
  selectedEntitySignal,
  children
}: SpaceProviderProps) {
  return (
    <SpaceContext.Provider value={{ spaceConfigSignal, selectedEntitySignal }}>
      {children}
    </SpaceContext.Provider>
  );
}

/**
 * useSpaceContext - Hook to access space config and selected entity signals
 *
 * Returns:
 * - spaceConfigSignal: The reactive space configuration signal
 * - selectedEntitySignal: The reactive selected entity signal
 *
 * Usage in a block component:
 * const { spaceConfigSignal, selectedEntitySignal } = useSpaceContext();
 * const spaceConfig = spaceConfigSignal?.value;
 * const selectedEntity = selectedEntitySignal?.value;
 */
export function useSpaceContext(): SpaceContextValue {
  const context = useContext(SpaceContext);

  if (!context) {
    throw new Error('useSpaceContext must be used within a SpaceProvider');
  }

  return context;
}

/**
 * useSpaceConfig - Convenience hook to get just the spaceConfig value
 *
 * Returns: The current space configuration value (not the signal)
 *
 * Note: Using .value in a hook ensures the component subscribes to changes
 */
export function useSpaceConfig() {
  const { spaceConfigSignal } = useSpaceContext();
  return spaceConfigSignal?.value;
}

/**
 * useSelectedEntity - Convenience hook to get just the selectedEntity value
 *
 * Returns: The current selected entity value (not the signal)
 *
 * Note: Using .value in a hook ensures the component subscribes to changes
 */
export function useSelectedEntity() {
  const { selectedEntitySignal } = useSpaceContext();
  return selectedEntitySignal?.value;
}