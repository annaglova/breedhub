/**
 * React SignalStore - Fractal State Management
 * 
 * A powerful state management solution inspired by NgRx SignalStore,
 * adapted for React with self-similar (fractal) patterns and IndexedDB support.
 */

// Core exports
export * from './types';
export * from './create-signal-store';
export * from './core/create-store-feature';
export * from './core/super-store';

// Feature exports
export * from './features/with-entities';
export * from './features/with-filtering';
export * from './features/with-request-status';

// Sync exports
export * from './sync/indexed-db-sync';

// Note: Examples are not exported from the main package
// They are available in the examples folder for reference

/**
 * Quick Start Guide:
 * 
 * 1. Create a store with features:
 * ```typescript
 * const useMyStore = createSignalStore('myStore', [
 *   withEntities(),
 *   withFiltering(),
 *   withRequestStatus(),
 * ]);
 * ```
 * 
 * 2. Use selectors:
 * ```typescript
 * const selectors = createSelectors(useMyStore);
 * const entities = selectors.useFilteredEntities();
 * ```
 * 
 * 3. Enable IndexedDB sync:
 * ```typescript
 * const { syncState, syncNow } = useIndexedDBSync(config, entities);
 * ```
 * 
 * 4. Create hierarchical stores:
 * ```typescript
 * const rootStore = superStoreFactory.createStore({
 *   id: 'root',
 *   children: [{ id: 'child1' }, { id: 'child2' }]
 * });
 * ```
 */