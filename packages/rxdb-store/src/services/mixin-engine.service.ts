import type { PropertyDefinition } from '../stores/property-registry.signal-store';

// Mixin function type
type MixinFunction = (property: PropertyDefinition) => PropertyDefinition;

// Mixin definitions with their transformation functions
const mixinDefinitions: Record<string, MixinFunction> = {
  // Feature mixins
  sortable: (property) => ({
    ...property,
    config: {
      ...property.config,
      features: {
        ...(property.config?.features || {}),
        sortable: true,
        sortPriority: property.config?.features?.sortPriority || 0
      }
    }
  }),

  searchable: (property) => ({
    ...property,
    config: {
      ...property.config,
      features: {
        ...(property.config?.features || {}),
        searchable: true,
        searchWeight: property.config?.features?.searchWeight || 1.0
      }
    }
  }),

  indexed: (property) => ({
    ...property,
    config: {
      ...property.config,
      features: {
        ...(property.config?.features || {}),
        indexed: true
      }
    }
  }),

  // Validation mixins
  required: (property) => ({
    ...property,
    config: {
      ...property.config,
      isRequired: true,
      validators: [
        ...(property.config?.validators || []),
        { type: 'required', message: `${property.caption} is required` }
      ]
    }
  }),

  // UI mixins
  readonly: (property) => ({
    ...property,
    config: {
      ...property.config,
      readOnly: true,
      features: {
        ...(property.config?.features || {}),
        readonly: true
      }
    }
  }),

  hidden: (property) => ({
    ...property,
    config: {
      ...property.config,
      features: {
        ...(property.config?.features || {}),
        hidden: true,
        showInList: false,
        showInDetail: false
      }
    }
  }),

  // Performance mixins
  cached: (property) => ({
    ...property,
    config: {
      ...property.config,
      features: {
        ...(property.config?.features || {}),
        cached: true,
        cacheTTL: property.config?.features?.cacheTTL || 3600
      }
    }
  }),

  // Security mixins
  encrypted: (property) => ({
    ...property,
    config: {
      ...property.config,
      features: {
        ...(property.config?.features || {}),
        encrypted: true,
        encryptionMethod: property.config?.features?.encryptionMethod || 'AES-256'
      }
    }
  }),

  // Feature mixins
  auditable: (property) => ({
    ...property,
    config: {
      ...property.config,
      features: {
        ...(property.config?.features || {}),
        trackChanges: true,
        auditLog: true
      }
    }
  }),

  // I18n mixins
  translatable: (property) => ({
    ...property,
    config: {
      ...property.config,
      features: {
        ...(property.config?.features || {}),
        translatable: true,
        languages: property.config?.features?.languages || ['en', 'uk', 'es']
      }
    }
  })
};

// Main Mixin Engine Service
export class MixinEngineService {
  private static instance: MixinEngineService;
  
  private constructor() {}
  
  static getInstance(): MixinEngineService {
    if (!MixinEngineService.instance) {
      MixinEngineService.instance = new MixinEngineService();
    }
    return MixinEngineService.instance;
  }
  
  /**
   * Apply a single mixin to a property
   */
  applyMixin(property: PropertyDefinition, mixinName: string): PropertyDefinition {
    const mixinFn = mixinDefinitions[mixinName];
    
    if (!mixinFn) {
      console.warn(`[MixinEngine] Unknown mixin: ${mixinName}`);
      return property;
    }
    
    console.log(`[MixinEngine] Applying mixin "${mixinName}" to property "${property.name}"`);
    return mixinFn(property);
  }
  
  /**
   * Apply multiple mixins to a property in sequence
   */
  applyMixins(property: PropertyDefinition, mixins: string[]): PropertyDefinition {
    console.log(`[MixinEngine] Applying ${mixins.length} mixins to property "${property.name}"`);
    
    return mixins.reduce((prop, mixinName) => {
      return this.applyMixin(prop, mixinName);
    }, property);
  }
  
  /**
   * Process a property with its configured mixins
   */
  processProperty(property: PropertyDefinition): PropertyDefinition {
    if (!property.mixins || property.mixins.length === 0) {
      return property;
    }
    
    return this.applyMixins(property, property.mixins);
  }
  
  /**
   * Get all available mixin names
   */
  getAvailableMixins(): string[] {
    return Object.keys(mixinDefinitions);
  }
  
  /**
   * Check if a mixin exists
   */
  mixinExists(mixinName: string): boolean {
    return mixinName in mixinDefinitions;
  }
  
  /**
   * Register a custom mixin at runtime
   */
  registerMixin(name: string, fn: MixinFunction): void {
    if (mixinDefinitions[name]) {
      console.warn(`[MixinEngine] Overwriting existing mixin: ${name}`);
    }
    
    mixinDefinitions[name] = fn;
    console.log(`[MixinEngine] Registered mixin: ${name}`);
  }
  
  /**
   * Generate RxDB schema field from a processed property
   */
  generateSchemaField(property: PropertyDefinition): any {
    const processed = this.processProperty(property);
    
    // Base schema field
    const schemaField: any = {
      type: this.mapTypeToRxDB(processed.type)
    };
    
    // Add constraints based on type
    if (processed.type === 'string') {
      if (processed.config?.maxLength) {
        schemaField.maxLength = processed.config.maxLength;
      }
      if (processed.config?.pattern) {
        schemaField.pattern = processed.config.pattern;
      }
    }
    
    if (processed.type === 'number') {
      if (processed.config?.min !== undefined) {
        schemaField.minimum = processed.config.min;
      }
      if (processed.config?.max !== undefined) {
        schemaField.maximum = processed.config.max;
      }
    }
    
    // Handle nullable fields
    if (!processed.config?.isRequired) {
      schemaField.type = [schemaField.type, 'null'];
    }
    
    // Add format for date types
    if (processed.type === 'date' || processed.type === 'datetime') {
      schemaField.format = 'date-time';
      schemaField.type = 'string';
      schemaField.maxLength = 30;
    }
    
    // Default value
    if (processed.config?.defaultValue !== undefined) {
      schemaField.default = processed.config.defaultValue;
    }
    
    return schemaField;
  }
  
  /**
   * Map property type to RxDB schema type
   */
  private mapTypeToRxDB(type: PropertyDefinition['type']): string {
    const typeMap: Record<PropertyDefinition['type'], string> = {
      'string': 'string',
      'number': 'number',
      'boolean': 'boolean',
      'date': 'string',
      'datetime': 'string',
      'json': 'object',
      'array': 'array',
      'reference': 'string'
    };
    
    return typeMap[type] || 'string';
  }
  
  /**
   * Generate indexes from properties with indexed mixin
   */
  generateIndexes(properties: PropertyDefinition[]): string[] {
    const indexes: string[] = [];
    
    for (const property of properties) {
      const processed = this.processProperty(property);
      if (processed.config?.features?.indexed) {
        indexes.push(property.name);
      }
    }
    
    return indexes;
  }
  
  /**
   * Generate required fields list
   */
  generateRequiredFields(properties: PropertyDefinition[]): string[] {
    const required: string[] = [];
    
    for (const property of properties) {
      const processed = this.processProperty(property);
      if (processed.config?.isRequired) {
        required.push(property.name);
      }
    }
    
    return required;
  }
  
  /**
   * Preview mixin application without modifying original
   */
  previewMixin(property: PropertyDefinition, mixinName: string): PropertyDefinition {
    const clone = JSON.parse(JSON.stringify(property));
    return this.applyMixin(clone, mixinName);
  }
  
  /**
   * Analyze mixin conflicts for a property
   */
  analyzeMixinConflicts(property: PropertyDefinition, newMixin: string): string[] {
    const conflicts: string[] = [];
    
    // Check for conflicting mixins
    if (property.mixins?.includes('readonly') && newMixin === 'required') {
      conflicts.push('Cannot make a readonly field required');
    }
    
    if (property.mixins?.includes('hidden') && (newMixin === 'searchable' || newMixin === 'sortable')) {
      conflicts.push('Hidden fields should not be searchable or sortable');
    }
    
    if (property.mixins?.includes('encrypted') && newMixin === 'searchable') {
      conflicts.push('Encrypted fields cannot be searchable');
    }
    
    return conflicts;
  }
}

// Export singleton instance
export const mixinEngine = MixinEngineService.getInstance();