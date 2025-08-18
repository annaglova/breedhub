import { RxDatabase, RxCollection, RxJsonSchema } from 'rxdb';
import { signal, computed, ReadonlySignal } from '@preact/signals-react';

/**
 * Collection configuration for lazy loading
 */
export interface CollectionConfig {
  name: string;
  schema: RxJsonSchema<any> | string; // Schema object or URL to fetch from
  autoLoad?: boolean; // Load immediately on registration
  indexes?: string[]; // Additional indexes to create
  methods?: Record<string, Function>; // Collection methods
  statics?: Record<string, Function>; // Static methods
}

/**
 * Loading state for collections
 */
export interface CollectionLoadState {
  name: string;
  loading: boolean;
  loaded: boolean;
  error: Error | null;
  collection: RxCollection | null;
}

/**
 * Lazy Collection Loader - loads collections on demand
 * Inspired by ngx-odm lazy loading pattern
 */
export class LazyCollectionLoader {
  private database: RxDatabase | null = null;
  private collections = new Map<string, RxCollection>();
  private configurations = new Map<string, CollectionConfig>();
  private schemaCache = new Map<string, RxJsonSchema<any>>();
  
  // Reactive loading states
  private _loadingStates = signal<Map<string, CollectionLoadState>>(new Map());
  
  // Public readonly signals
  readonly loadingStates: ReadonlySignal<Map<string, CollectionLoadState>> = this._loadingStates;
  readonly isAnyLoading = computed(() => 
    Array.from(this._loadingStates.value.values()).some(state => state.loading)
  );
  readonly loadedCollections = computed(() => 
    Array.from(this._loadingStates.value.values())
      .filter(state => state.loaded)
      .map(state => state.name)
  );
  
  constructor(database?: RxDatabase) {
    if (database) {
      this.database = database;
    }
  }
  
  /**
   * Set the database instance
   */
  setDatabase(database: RxDatabase): void {
    this.database = database;
    
    // Auto-load collections marked with autoLoad
    this.configurations.forEach((config, name) => {
      if (config.autoLoad) {
        this.loadCollection(name);
      }
    });
  }
  
  /**
   * Register a collection configuration for lazy loading
   */
  registerCollection(config: CollectionConfig): void {
    this.configurations.set(config.name, config);
    
    // Initialize loading state
    const currentStates = new Map(this._loadingStates.value);
    currentStates.set(config.name, {
      name: config.name,
      loading: false,
      loaded: false,
      error: null,
      collection: null
    });
    this._loadingStates.value = currentStates;
    
    // Auto-load if database is ready and autoLoad is true
    if (this.database && config.autoLoad) {
      this.loadCollection(config.name);
    }
  }
  
  /**
   * Register multiple collections at once
   */
  registerCollections(configs: CollectionConfig[]): void {
    configs.forEach(config => this.registerCollection(config));
  }
  
  /**
   * Load a collection by name
   */
  async loadCollection<T = any>(name: string): Promise<RxCollection<T>> {
    // Return if already loaded
    if (this.collections.has(name)) {
      return this.collections.get(name) as RxCollection<T>;
    }
    
    // Check if configuration exists
    const config = this.configurations.get(name);
    if (!config) {
      throw new Error(`Collection configuration for "${name}" not found. Register it first.`);
    }
    
    if (!this.database) {
      throw new Error('Database not initialized. Call setDatabase() first.');
    }
    
    // Update loading state
    this.updateLoadingState(name, { loading: true, error: null });
    
    try {
      // Get or fetch schema
      const schema = await this.resolveSchema(config);
      
      // Add collection to database
      const collections = await this.database.addCollections({
        [name]: {
          schema,
          methods: config.methods,
          statics: config.statics
        }
      });
      
      const collection = collections[name];
      
      // Add additional indexes if specified
      if (config.indexes?.length) {
        for (const index of config.indexes) {
          await collection.addIndex(index);
        }
      }
      
      // Store collection
      this.collections.set(name, collection);
      
      // Update loading state
      this.updateLoadingState(name, {
        loading: false,
        loaded: true,
        collection
      });
      
      console.log(`✅ Collection "${name}" loaded successfully`);
      return collection;
      
    } catch (error) {
      console.error(`❌ Failed to load collection "${name}":`, error);
      
      // Update loading state with error
      this.updateLoadingState(name, {
        loading: false,
        error: error as Error
      });
      
      throw error;
    }
  }
  
  /**
   * Load multiple collections
   */
  async loadCollections(names: string[]): Promise<Map<string, RxCollection>> {
    const results = new Map<string, RxCollection>();
    
    // Load in parallel for better performance
    const promises = names.map(async name => {
      const collection = await this.loadCollection(name);
      results.set(name, collection);
    });
    
    await Promise.all(promises);
    return results;
  }
  
  /**
   * Get a collection, loading it if necessary
   */
  async getCollection<T = any>(name: string): Promise<RxCollection<T>> {
    if (this.collections.has(name)) {
      return this.collections.get(name) as RxCollection<T>;
    }
    
    return this.loadCollection<T>(name);
  }
  
  /**
   * Get a collection if already loaded, null otherwise
   */
  getLoadedCollection<T = any>(name: string): RxCollection<T> | null {
    return (this.collections.get(name) as RxCollection<T>) || null;
  }
  
  /**
   * Check if a collection is loaded
   */
  isLoaded(name: string): boolean {
    return this.collections.has(name);
  }
  
  /**
   * Unload a collection (remove from memory)
   */
  async unloadCollection(name: string): Promise<void> {
    const collection = this.collections.get(name);
    if (!collection) return;
    
    // Destroy collection
    await collection.destroy();
    
    // Remove from maps
    this.collections.delete(name);
    
    // Update loading state
    this.updateLoadingState(name, {
      loaded: false,
      collection: null
    });
    
    console.log(`🗑️ Collection "${name}" unloaded`);
  }
  
  /**
   * Unload all collections
   */
  async unloadAll(): Promise<void> {
    const names = Array.from(this.collections.keys());
    
    for (const name of names) {
      await this.unloadCollection(name);
    }
  }
  
  /**
   * Preload collections based on route or user action
   */
  async preloadForRoute(route: string): Promise<void> {
    // Define which collections to preload for each route
    const routeCollections: Record<string, string[]> = {
      '/breeds': ['breeds'],
      '/dogs': ['dogs', 'breeds'],
      '/kennels': ['kennels', 'breeds'],
      '/litters': ['litters', 'dogs', 'breeds'],
      '/shows': ['shows', 'dogs', 'breeds']
    };
    
    const collectionsToLoad = routeCollections[route] || [];
    
    if (collectionsToLoad.length > 0) {
      console.log(`📦 Preloading collections for route "${route}":`, collectionsToLoad);
      
      // Only load collections that are registered
      const registeredCollections = collectionsToLoad.filter(name => 
        this.configurations.has(name)
      );
      
      if (registeredCollections.length === 0) {
        console.warn(`No registered collections found for route "${route}"`);
        return;
      }
      
      if (registeredCollections.length < collectionsToLoad.length) {
        const unregistered = collectionsToLoad.filter(name => 
          !this.configurations.has(name)
        );
        console.warn(`Some collections are not registered: ${unregistered.join(', ')}`);
      }
      
      await this.loadCollections(registeredCollections);
    }
  }
  
  /**
   * Resolve schema from configuration
   */
  private async resolveSchema(config: CollectionConfig): Promise<RxJsonSchema<any>> {
    // If schema is already an object, return it
    if (typeof config.schema === 'object') {
      return config.schema;
    }
    
    // Check cache first
    if (this.schemaCache.has(config.schema)) {
      return this.schemaCache.get(config.schema)!;
    }
    
    // Fetch schema from URL
    console.log(`📥 Fetching schema from: ${config.schema}`);
    
    try {
      const response = await fetch(config.schema);
      if (!response.ok) {
        throw new Error(`Failed to fetch schema: ${response.statusText}`);
      }
      
      const schema = await response.json();
      
      // Cache for future use
      this.schemaCache.set(config.schema, schema);
      
      return schema;
    } catch (error) {
      throw new Error(`Failed to load schema from "${config.schema}": ${error}`);
    }
  }
  
  /**
   * Update loading state for a collection
   */
  private updateLoadingState(name: string, updates: Partial<CollectionLoadState>): void {
    const currentStates = new Map(this._loadingStates.value);
    const currentState = currentStates.get(name) || {
      name,
      loading: false,
      loaded: false,
      error: null,
      collection: null
    };
    
    currentStates.set(name, { ...currentState, ...updates });
    this._loadingStates.value = currentStates;
  }
  
  /**
   * Get loading state for a specific collection
   */
  getLoadingState(name: string): CollectionLoadState | null {
    return this._loadingStates.value.get(name) || null;
  }
  
  /**
   * Clear all caches
   */
  clearCaches(): void {
    this.schemaCache.clear();
  }
}

// Singleton instance
let loaderInstance: LazyCollectionLoader | null = null;

/**
 * Get or create the singleton LazyCollectionLoader instance
 */
export function getCollectionLoader(database?: RxDatabase): LazyCollectionLoader {
  if (!loaderInstance) {
    loaderInstance = new LazyCollectionLoader(database);
  } else if (database && !loaderInstance['database']) {
    loaderInstance.setDatabase(database);
  }
  
  return loaderInstance;
}