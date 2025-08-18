import { RxStorage } from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';

/**
 * Database configuration interface
 */
export interface DatabaseConfig {
  name: string;
  version?: number;
  storage?: 'dexie' | 'memory' | 'custom';
  customStorage?: RxStorage<any, any>;
  multiInstance?: boolean;
  eventReduce?: boolean;
  ignoreDuplicate?: boolean;
  cleanupPolicy?: CleanupPolicy;
  options?: Record<string, any>;
}

/**
 * Cleanup policy for old data
 */
export interface CleanupPolicy {
  enabled: boolean;
  minAge?: number; // Minimum age in milliseconds
  runInterval?: number; // How often to run cleanup
  batchSize?: number; // Documents to delete per batch
}

/**
 * Sync configuration for replication
 */
export interface SyncConfig {
  enabled: boolean;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  collections?: string[];
  batchSize?: number;
  pullInterval?: number;
  pushInterval?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

/**
 * Collection-specific configuration
 */
export interface CollectionConfigOptions {
  name: string;
  schemaPath?: string;
  autoMigrate?: boolean;
  indexes?: string[];
  cachePolicy?: 'none' | 'memory' | 'persistent';
  syncEnabled?: boolean;
  conflictHandler?: 'last-write-wins' | 'first-write-wins' | 'custom';
}

/**
 * Performance configuration
 */
export interface PerformanceConfig {
  queryTimeout?: number;
  batchSize?: number;
  indexedDBOptions?: IDBOptions;
  disableKeyCompression?: boolean;
  lazyIndexes?: boolean;
}

interface IDBOptions {
  blocking?: boolean;
  terminated?: boolean;
}

/**
 * Complete RxDB configuration
 */
export interface RxDBConfig {
  database: DatabaseConfig;
  collections?: CollectionConfigOptions[];
  sync?: SyncConfig;
  performance?: PerformanceConfig;
  environment?: 'development' | 'staging' | 'production';
  debug?: boolean;
}

/**
 * Configuration Manager for RxDB
 * Handles configuration from various sources with validation
 */
export class ConfigurationManager {
  private config: RxDBConfig;
  private readonly defaultConfig: Partial<RxDBConfig> = {
    database: {
      name: 'breedhub-db',
      version: 1,
      storage: 'dexie',
      multiInstance: false,
      eventReduce: true,
      ignoreDuplicate: false,
      cleanupPolicy: {
        enabled: true,
        minAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        runInterval: 60 * 60 * 1000, // 1 hour
        batchSize: 100
      }
    },
    sync: {
      enabled: false,
      batchSize: 50,
      pullInterval: 30000, // 30 seconds
      pushInterval: 10000, // 10 seconds
      retryAttempts: 3,
      retryDelay: 1000
    },
    performance: {
      queryTimeout: 5000,
      batchSize: 100,
      disableKeyCompression: false,
      lazyIndexes: true
    },
    environment: 'development',
    debug: true
  };
  
  constructor(config?: Partial<RxDBConfig>) {
    this.config = this.mergeWithDefaults(config);
  }
  
  /**
   * Load configuration from JSON file or URL
   */
  static async fromJSON(source: string | object): Promise<ConfigurationManager> {
    let config: Partial<RxDBConfig>;
    
    if (typeof source === 'string') {
      // Load from URL
      const response = await fetch(source);
      if (!response.ok) {
        throw new Error(`Failed to load config from ${source}: ${response.statusText}`);
      }
      config = await response.json();
    } else {
      // Use provided object
      config = source;
    }
    
    const manager = new ConfigurationManager(config);
    manager.validate();
    
    return manager;
  }
  
  /**
   * Load configuration from environment variables
   */
  static fromEnv(): ConfigurationManager {
    const config: Partial<RxDBConfig> = {
      database: {
        name: process.env.VITE_RXDB_NAME || 'breedhub-db',
        storage: (process.env.VITE_RXDB_STORAGE as any) || 'dexie'
      },
      sync: {
        enabled: process.env.VITE_SYNC_ENABLED === 'true',
        supabaseUrl: process.env.VITE_SUPABASE_URL,
        supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY
      },
      environment: (process.env.NODE_ENV as any) || 'development',
      debug: process.env.NODE_ENV !== 'production'
    };
    
    return new ConfigurationManager(config);
  }
  
  /**
   * Create configuration for specific environment
   */
  static forEnvironment(env: 'development' | 'staging' | 'production'): ConfigurationManager {
    const configs: Record<string, Partial<RxDBConfig>> = {
      development: {
        database: {
          name: 'breedhub-dev',
          storage: 'dexie',
          multiInstance: false
        },
        sync: { enabled: false },
        debug: true
      },
      staging: {
        database: {
          name: 'breedhub-staging',
          storage: 'dexie',
          multiInstance: false
        },
        sync: { enabled: true },
        debug: true
      },
      production: {
        database: {
          name: 'breedhub',
          storage: 'dexie',
          multiInstance: false,
          eventReduce: true
        },
        sync: { enabled: true },
        debug: false,
        performance: {
          queryTimeout: 3000,
          batchSize: 200,
          lazyIndexes: false
        }
      }
    };
    
    return new ConfigurationManager({
      ...configs[env],
      environment: env
    });
  }
  
  /**
   * Merge configuration with defaults
   */
  private mergeWithDefaults(config?: Partial<RxDBConfig>): RxDBConfig {
    if (!config) return this.defaultConfig as RxDBConfig;
    
    return {
      database: { ...this.defaultConfig.database!, ...config.database },
      collections: config.collections || this.defaultConfig.collections,
      sync: { ...this.defaultConfig.sync!, ...config.sync },
      performance: { ...this.defaultConfig.performance!, ...config.performance },
      environment: config.environment || this.defaultConfig.environment!,
      debug: config.debug ?? this.defaultConfig.debug!
    };
  }
  
  /**
   * Validate configuration
   */
  validate(): boolean {
    const errors: string[] = [];
    
    // Validate database config
    if (!this.config.database.name) {
      errors.push('Database name is required');
    }
    
    if (this.config.database.name.includes(' ')) {
      errors.push('Database name cannot contain spaces');
    }
    
    // Validate sync config
    if (this.config.sync?.enabled) {
      if (!this.config.sync.supabaseUrl) {
        errors.push('Supabase URL is required when sync is enabled');
      }
      if (!this.config.sync.supabaseAnonKey) {
        errors.push('Supabase anon key is required when sync is enabled');
      }
    }
    
    // Validate collections
    if (this.config.collections) {
      const names = new Set<string>();
      for (const col of this.config.collections) {
        if (names.has(col.name)) {
          errors.push(`Duplicate collection name: ${col.name}`);
        }
        names.add(col.name);
      }
    }
    
    if (errors.length > 0) {
      throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
    }
    
    return true;
  }
  
  /**
   * Get storage adapter based on configuration
   */
  getStorage(): RxStorage<any, any> {
    const storageType = this.config.database.storage;
    
    switch (storageType) {
      case 'memory':
        // Memory storage would need to be imported from rxdb/plugins/storage-memory
        // For now, default to Dexie
        console.warn('Memory storage not available, falling back to Dexie');
        return getRxStorageDexie();
      case 'dexie':
        return getRxStorageDexie();
      case 'custom':
        if (!this.config.database.customStorage) {
          throw new Error('Custom storage specified but not provided');
        }
        return this.config.database.customStorage;
      default:
        return getRxStorageDexie();
    }
  }
  
  /**
   * Get database configuration for RxDB
   */
  getDatabaseConfig(): any {
    return {
      name: this.config.database.name,
      storage: this.getStorage(),
      multiInstance: this.config.database.multiInstance,
      eventReduce: this.config.database.eventReduce,
      ignoreDuplicate: this.config.database.ignoreDuplicate,
      options: this.config.database.options
    };
  }
  
  /**
   * Get collection configuration by name
   */
  getCollectionConfig(name: string): CollectionConfigOptions | null {
    return this.config.collections?.find(col => col.name === name) || null;
  }
  
  /**
   * Add or update collection configuration
   */
  setCollectionConfig(config: CollectionConfigOptions): void {
    if (!this.config.collections) {
      this.config.collections = [];
    }
    
    const index = this.config.collections.findIndex(col => col.name === config.name);
    if (index >= 0) {
      this.config.collections[index] = config;
    } else {
      this.config.collections.push(config);
    }
  }
  
  /**
   * Get sync configuration
   */
  getSyncConfig(): SyncConfig | undefined {
    return this.config.sync;
  }
  
  /**
   * Update sync configuration
   */
  setSyncConfig(sync: Partial<SyncConfig>): void {
    this.config.sync = { ...this.config.sync!, ...sync };
  }
  
  /**
   * Check if running in debug mode
   */
  isDebugMode(): boolean {
    return this.config.debug || false;
  }
  
  /**
   * Get current environment
   */
  getEnvironment(): string {
    return this.config.environment || 'development';
  }
  
  /**
   * Export configuration as JSON
   */
  toJSON(): RxDBConfig {
    return JSON.parse(JSON.stringify(this.config));
  }
  
  /**
   * Clone configuration
   */
  clone(): ConfigurationManager {
    return new ConfigurationManager(this.toJSON());
  }
  
  /**
   * Get full configuration
   */
  getConfig(): RxDBConfig {
    return this.config;
  }
}

// Singleton instance
let configInstance: ConfigurationManager | null = null;

/**
 * Get or create singleton configuration manager
 */
export function getConfigurationManager(config?: Partial<RxDBConfig>): ConfigurationManager {
  if (!configInstance) {
    configInstance = new ConfigurationManager(config);
  }
  return configInstance;
}

/**
 * Reset configuration manager (useful for testing)
 */
export function resetConfigurationManager(): void {
  configInstance = null;
}