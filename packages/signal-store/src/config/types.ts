/**
 * Dynamic Configuration System Types
 * 
 * Provides type definitions for hierarchical configuration management
 * with support for inheritance, caching, and real-time updates.
 */

// ============================================================================
// Core Types
// ============================================================================

export type ConfigScope = 'global' | 'workspace' | 'space' | 'view' | 'user';

export type DependencyType = 'inherit' | 'reference' | 'compute';

export type MergeStrategy = 'deep' | 'shallow' | 'replace';

export interface ConfigIdentifier {
  scope: ConfigScope;
  scopeId?: string;
  key?: string;
}

// ============================================================================
// Database Models
// ============================================================================

export interface AppConfig {
  id: string;
  key: string;
  parent_id?: string;
  scope: ConfigScope;
  scope_id?: string;
  
  // Configuration data
  base_config: Record<string, any>;
  overrides: Record<string, any>;
  computed_config: Record<string, any>;
  
  // Metadata
  version: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  created_by?: string;
  
  // Performance
  cache_ttl?: number;
  last_accessed?: Date;
  access_count: number;
}

export interface ConfigTemplate {
  id: string;
  name: string;
  entity_type: string;
  
  // Template structure
  schema: JSONSchema;
  default_config: Record<string, any>;
  ui_schema?: UISchema;
  
  // Permissions
  required_role?: string[];
  
  // Metadata
  description?: string;
  category?: string;
  tags?: string[];
  is_system: boolean;
  created_at: Date;
}

export interface ConfigDependency {
  id: string;
  config_id: string;
  depends_on_id: string;
  dependency_type: DependencyType;
  priority: number;
}

// ============================================================================
// Schema Types
// ============================================================================

export interface JSONSchema {
  type: string;
  properties?: Record<string, JSONSchema>;
  required?: string[];
  additionalProperties?: boolean | JSONSchema;
  items?: JSONSchema;
  enum?: any[];
  const?: any;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string;
  default?: any;
  description?: string;
  title?: string;
}

export interface UISchema {
  'ui:widget'?: string;
  'ui:options'?: Record<string, any>;
  'ui:order'?: string[];
  'ui:disabled'?: boolean;
  'ui:readonly'?: boolean;
  'ui:help'?: string;
  'ui:placeholder'?: string;
  [key: string]: any;
}

export interface DynamicFieldSchema {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'json' | 'reference' | 'array' | 'object';
  required: boolean;
  defaultValue?: any;
  
  validation?: {
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    options?: any[];
    referenceType?: string;
    unique?: boolean;
    custom?: string; // JavaScript validation function as string
  };
  
  ui?: {
    label: string;
    placeholder?: string;
    helpText?: string;
    widget?: 'text' | 'textarea' | 'select' | 'date' | 'toggle' | 'number' | 'lookup' | 'json' | 'file';
    hidden?: boolean;
    readonly?: boolean;
    order?: number;
    group?: string;
    columns?: number; // For grid layout
    conditional?: {
      field: string;
      operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
      value: any;
    };
  };
  
  computed?: {
    formula?: string; // JavaScript expression
    dependencies?: string[]; // Field names this computed field depends on
  };
}

export interface DynamicEntitySchema {
  id: string;
  entityType: string;
  extends?: string;
  
  fields: DynamicFieldSchema[];
  
  permissions: {
    create: string[];
    read: string[];
    update: string[];
    delete: string[];
    admin?: string[];
  };
  
  ui: {
    icon?: string;
    color?: string;
    listColumns?: string[];
    searchFields?: string[];
    sortFields?: string[];
    defaultSort?: { field: string; order: 'asc' | 'desc' };
    groupBy?: string;
    displayName?: string | { singular: string; plural: string };
  };
  
  hooks?: {
    beforeCreate?: string;
    afterCreate?: string;
    beforeUpdate?: string;
    afterUpdate?: string;
    beforeDelete?: string;
    afterDelete?: string;
    beforeValidate?: string;
    afterValidate?: string;
  };
  
  relationships?: {
    belongsTo?: Array<{
      entity: string;
      field: string;
      required?: boolean;
    }>;
    hasMany?: Array<{
      entity: string;
      foreignKey: string;
      cascade?: boolean;
    }>;
    manyToMany?: Array<{
      entity: string;
      through: string;
      foreignKey: string;
      otherKey: string;
    }>;
  };
  
  indexes?: Array<{
    fields: string[];
    unique?: boolean;
    name?: string;
  }>;
  
  metadata?: {
    description?: string;
    category?: string;
    tags?: string[];
    version?: number;
    deprecated?: boolean;
    experimental?: boolean;
  };
}

// ============================================================================
// Runtime Types
// ============================================================================

export interface ConfigContext {
  workspaceId?: string;
  spaceId?: string;
  viewId?: string;
  userId?: string;
  role?: string;
  permissions?: string[];
}

export interface CachedConfig {
  config: AppConfig;
  timestamp: number;
  ttl: number;
  hits?: number;
}

export interface ConfigLoadOptions {
  includeInactive?: boolean;
  includeParents?: boolean;
  includeDependencies?: boolean;
  maxDepth?: number;
  cacheStrategy?: 'none' | 'memory' | 'redis' | 'both';
}

export interface ConfigMergeResult {
  merged: Record<string, any>;
  sources: Array<{
    id: string;
    key: string;
    contribution: Record<string, any>;
  }>;
  conflicts?: Array<{
    path: string;
    values: any[];
    resolution: 'override' | 'merge' | 'keep';
  }>;
}

// ============================================================================
// Event Types
// ============================================================================

export interface ConfigChangeEvent {
  type: 'create' | 'update' | 'delete';
  config: AppConfig;
  previousConfig?: AppConfig;
  timestamp: Date;
  userId?: string;
  context?: ConfigContext;
}

export interface ConfigValidationResult {
  valid: boolean;
  errors?: Array<{
    path: string;
    message: string;
    value?: any;
    rule?: string;
  }>;
  warnings?: Array<{
    path: string;
    message: string;
  }>;
}

// ============================================================================
// Service Interfaces
// ============================================================================

export interface IConfigLoader {
  load(identifier: ConfigIdentifier, options?: ConfigLoadOptions): Promise<AppConfig>;
  loadMultiple(identifiers: ConfigIdentifier[], options?: ConfigLoadOptions): Promise<AppConfig[]>;
  loadHierarchy(context: ConfigContext, options?: ConfigLoadOptions): Promise<AppConfig[]>;
  preloadAll(): Promise<void>;
  clearCache(): void;
}

export interface IConfigMerger {
  merge(configs: AppConfig[], strategy?: MergeStrategy): ConfigMergeResult;
  resolveConflicts(conflicts: any[], resolution: 'override' | 'merge' | 'keep'): any;
  computeDependencies(config: AppConfig): Promise<Record<string, any>>;
}

export interface IConfigValidator {
  validate(config: Record<string, any>, schema: JSONSchema): ConfigValidationResult;
  validateField(value: any, field: DynamicFieldSchema): ConfigValidationResult;
  validateEntity(entity: Record<string, any>, schema: DynamicEntitySchema): ConfigValidationResult;
}

export interface IConfigPersistence {
  save(config: Partial<AppConfig>): Promise<AppConfig>;
  update(id: string, updates: Partial<AppConfig>): Promise<AppConfig>;
  delete(id: string): Promise<void>;
  find(query: Partial<AppConfig>): Promise<AppConfig[]>;
  findOne(query: Partial<AppConfig>): Promise<AppConfig | null>;
}

// ============================================================================
// Hook Types
// ============================================================================

export interface UseConfigResult {
  config: Record<string, any> | null;
  loading: boolean;
  error: Error | null;
  reload: () => Promise<void>;
  update: (path: string, value: any) => Promise<void>;
  subscribe: (callback: (event: ConfigChangeEvent) => void) => () => void;
}

export interface UseEntitySchemaResult {
  schema: DynamicEntitySchema | null;
  loading: boolean;
  error: Error | null;
  createEntity: (data: Record<string, any>) => Promise<any>;
  updateEntity: (id: string, data: Record<string, any>) => Promise<any>;
  deleteEntity: (id: string) => Promise<void>;
  validateEntity: (data: Record<string, any>) => ConfigValidationResult;
}

// ============================================================================
// Utility Types
// ============================================================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type ConfigPath = string | string[];

export type ConfigValue = any;

export type ConfigPatch = Array<{
  op: 'add' | 'remove' | 'replace' | 'move' | 'copy';
  path: string;
  value?: any;
  from?: string;
}>;

// ============================================================================
// Constants
// ============================================================================

export const CONFIG_SCOPES: ConfigScope[] = ['global', 'workspace', 'space', 'view', 'user'];

export const DEFAULT_CACHE_TTL = 3600; // 1 hour in seconds

export const MAX_CONFIG_DEPTH = 10; // Maximum hierarchy depth

export const RESERVED_FIELD_NAMES = ['id', '_type', '_parentId', '_metadata', 'created_at', 'updated_at'];

// ============================================================================
// Type Guards
// ============================================================================

export function isAppConfig(value: any): value is AppConfig {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'key' in value &&
    'scope' in value &&
    CONFIG_SCOPES.includes(value.scope)
  );
}

export function isDynamicEntitySchema(value: any): value is DynamicEntitySchema {
  return (
    typeof value === 'object' &&
    value !== null &&
    'entityType' in value &&
    'fields' in value &&
    Array.isArray(value.fields)
  );
}

export function isConfigChangeEvent(value: any): value is ConfigChangeEvent {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    ['create', 'update', 'delete'].includes(value.type) &&
    'config' in value &&
    isAppConfig(value.config)
  );
}