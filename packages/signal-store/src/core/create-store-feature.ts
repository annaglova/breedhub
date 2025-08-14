import { StoreFeature } from '../types';

/**
 * Creates a composable store feature
 * Similar to NgRx signalStoreFeature
 */
export function createStoreFeature<
  TState = any,
  TMethods = any
>(config: {
  initialState?: Partial<TState>;
  computed?: Record<string, (state: TState) => any>;
  methods?: (state: TState, set: (fn: (state: TState) => TState) => void, get?: () => any) => TMethods;
  hooks?: {
    onInit?: () => void;
    onDestroy?: () => void;
  };
}): StoreFeature<TState, TMethods> {
  return {
    initialState: (config.initialState || {}) as TState,
    computed: config.computed,
    methods: config.methods,
    hooks: config.hooks,
  };
}

/**
 * Composes multiple features into a single feature
 * Enables fractal composition pattern
 */
export function composeFeatures<TState = any, TMethods = any>(
  ...features: StoreFeature[]
): StoreFeature<TState, TMethods> {
  const composedFeature: StoreFeature<TState, TMethods> = {
    initialState: {} as TState,
    computed: {},
    methods: undefined as any,
    hooks: {},
  };

  // Merge initial states
  features.forEach(feature => {
    composedFeature.initialState = {
      ...composedFeature.initialState,
      ...feature.initialState,
    };
  });

  // Merge computed properties
  features.forEach(feature => {
    if (feature.computed) {
      composedFeature.computed = {
        ...composedFeature.computed,
        ...feature.computed,
      };
    }
  });

  // Compose methods (chain them)
  composedFeature.methods = (state, set, get) => {
    const allMethods = {} as TMethods;
    
    features.forEach(feature => {
      if (feature.methods) {
        const methods = feature.methods(state, set, get);
        Object.assign(allMethods, methods as any);
      }
    });
    
    return allMethods;
  };

  // Compose hooks
  composedFeature.hooks = {
    onInit: () => {
      features.forEach(feature => {
        if (feature.hooks?.onInit) {
          feature.hooks.onInit();
        }
      });
    },
    onDestroy: () => {
      features.forEach(feature => {
        if (feature.hooks?.onDestroy) {
          feature.hooks.onDestroy();
        }
      });
    },
  };

  return composedFeature;
}

/**
 * Helper to extract state type from a feature
 */
export type StateFromFeature<T> = T extends StoreFeature<infer S, any> ? S : never;

/**
 * Helper to extract methods type from a feature
 */
export type MethodsFromFeature<T> = T extends StoreFeature<any, infer M> ? M : never;