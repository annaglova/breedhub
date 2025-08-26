import { createClient } from '@supabase/supabase-js';
import type {
  PropertyType,
  ComponentType,
  PropertyDefinition,
  Validator,
  Permission,
  PropertyUsage,
  PropertyMixin
} from '../types/property.types';

// Re-export types for backward compatibility
export type {
  PropertyType,
  ComponentType,
  PropertyDefinition,
  Validator,
  Permission,
  PropertyUsage,
  PropertyMixin
} from '../types/property.types';

export class PropertyRegistryService {
  private static instance: PropertyRegistryService;
  private supabase;
  private propertyCache = new Map<string, PropertyDefinition>();
  private mixinCache = new Map<string, PropertyMixin>();

  private constructor() {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  static getInstance(): PropertyRegistryService {
    if (!this.instance) {
      this.instance = new PropertyRegistryService();
    }
    return this.instance;
  }

  // ============= Property CRUD Operations =============

  /**
   * Get all properties from registry
   */
  async getAllProperties(): Promise<PropertyDefinition[]> {
    try {
      const { data, error } = await this.supabase
        .from('property_registry')
        .select('*')
        .order('name');

      if (error) throw error;

      const properties = (data || []).map(row => this.parsePropertyFromDB(row));
      
      // Update cache
      properties.forEach(prop => {
        this.propertyCache.set(prop.uid, prop);
      });

      return properties;
    } catch (error) {
      console.error('Failed to load properties:', error);
      return Array.from(this.propertyCache.values());
    }
  }

  /**
   * Get a single property by UID
   */
  async getProperty(uid: string): Promise<PropertyDefinition | null> {
    // Check cache first
    if (this.propertyCache.has(uid)) {
      return this.propertyCache.get(uid)!;
    }

    try {
      const { data, error } = await this.supabase
        .from('property_registry')
        .select('*')
        .eq('uid', uid)
        .single();

      if (error) throw error;
      if (!data) return null;

      const property = this.parsePropertyFromDB(data);
      this.propertyCache.set(uid, property);
      
      return property;
    } catch (error) {
      console.error(`Failed to load property ${uid}:`, error);
      return null;
    }
  }

  /**
   * Create a new property
   */
  async createProperty(property: Omit<PropertyDefinition, 'uid' | 'createdAt' | 'updatedAt'>): Promise<PropertyDefinition> {
    const uid = this.generateUID();
    const now = new Date().toISOString();

    const newProperty: PropertyDefinition = {
      ...property,
      uid,
      createdAt: now,
      updatedAt: now,
      version: 1
    };

    try {
      const { data, error } = await this.supabase
        .from('property_registry')
        .insert(this.propertyToDB(newProperty))
        .select()
        .single();

      if (error) throw error;

      const created = this.parsePropertyFromDB(data);
      this.propertyCache.set(created.uid, created);
      
      return created;
    } catch (error) {
      console.error('Failed to create property:', error);
      throw error;
    }
  }

  /**
   * Update an existing property
   */
  async updateProperty(uid: string, updates: Partial<PropertyDefinition>): Promise<PropertyDefinition> {
    const existing = await this.getProperty(uid);
    if (!existing) {
      throw new Error(`Property ${uid} not found`);
    }

    const updated: PropertyDefinition = {
      ...existing,
      ...updates,
      uid, // Ensure UID doesn't change
      updatedAt: new Date().toISOString(),
      version: (existing.version || 0) + 1
    };

    try {
      const { data, error } = await this.supabase
        .from('property_registry')
        .update(this.propertyToDB(updated))
        .eq('uid', uid)
        .select()
        .single();

      if (error) throw error;

      const result = this.parsePropertyFromDB(data);
      this.propertyCache.set(uid, result);
      
      return result;
    } catch (error) {
      console.error(`Failed to update property ${uid}:`, error);
      throw error;
    }
  }

  /**
   * Delete a property (soft delete if system property)
   */
  async deleteProperty(uid: string): Promise<void> {
    const property = await this.getProperty(uid);
    if (!property) {
      throw new Error(`Property ${uid} not found`);
    }

    if (property.isSystem) {
      throw new Error('Cannot delete system properties');
    }

    // Check if property is in use
    const usage = await this.getPropertyUsage(uid);
    if (usage.length > 0) {
      throw new Error(`Property is in use in ${usage.length} configurations`);
    }

    try {
      const { error } = await this.supabase
        .from('property_registry')
        .delete()
        .eq('uid', uid);

      if (error) throw error;

      this.propertyCache.delete(uid);
    } catch (error) {
      console.error(`Failed to delete property ${uid}:`, error);
      throw error;
    }
  }

  // ============= Property Usage Tracking =============

  /**
   * Track where a property is used
   */
  async trackPropertyUsage(
    propertyUid: string,
    configId: string,
    fieldName: string,
    overrides?: Partial<PropertyDefinition>
  ): Promise<PropertyUsage> {
    const usage: Omit<PropertyUsage, 'id' | 'createdAt'> = {
      propertyUid,
      configId,
      fieldName,
      overrides
    };

    try {
      const { data, error } = await this.supabase
        .from('property_usage')
        .insert({
          property_uid: propertyUid,
          config_id: configId,
          field_name: fieldName,
          overrides: overrides || {}
        })
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        propertyUid: data.property_uid,
        configId: data.config_id,
        fieldName: data.field_name,
        overrides: data.overrides,
        createdAt: data.created_at
      };
    } catch (error) {
      console.error('Failed to track property usage:', error);
      throw error;
    }
  }

  /**
   * Get all usage of a property
   */
  async getPropertyUsage(propertyUid: string): Promise<PropertyUsage[]> {
    try {
      const { data, error } = await this.supabase
        .from('property_usage')
        .select('*')
        .eq('property_uid', propertyUid);

      if (error) throw error;

      return (data || []).map(row => ({
        id: row.id,
        propertyUid: row.property_uid,
        configId: row.config_id,
        fieldName: row.field_name,
        overrides: row.overrides,
        createdAt: row.created_at
      }));
    } catch (error) {
      console.error(`Failed to get usage for property ${propertyUid}:`, error);
      return [];
    }
  }

  // ============= Mixin Management =============

  /**
   * Get all available mixins
   */
  async getAllMixins(): Promise<PropertyMixin[]> {
    try {
      const { data, error } = await this.supabase
        .from('mixin_registry')
        .select('*')
        .order('name');

      if (error) throw error;

      const mixins = (data || []).map(row => this.parseMixinFromDB(row));
      
      // Update cache
      mixins.forEach(mixin => {
        this.mixinCache.set(mixin.name, mixin);
      });

      return mixins;
    } catch (error) {
      console.error('Failed to load mixins:', error);
      return Array.from(this.mixinCache.values());
    }
  }

  /**
   * Apply mixins to a property
   */
  applyMixins(property: PropertyDefinition, mixinNames: string[]): PropertyDefinition {
    let result = { ...property };

    for (const mixinName of mixinNames) {
      const mixin = this.mixinCache.get(mixinName);
      if (!mixin) {
        console.warn(`Mixin ${mixinName} not found`);
        continue;
      }

      try {
        // Execute mixin apply function
        const applyFn = new Function('property', mixin.applyFunction);
        result = applyFn(result);
      } catch (error) {
        console.error(`Failed to apply mixin ${mixinName}:`, error);
      }
    }

    return result;
  }

  // ============= Import/Export =============

  /**
   * Import properties from JSON
   */
  async importProperties(json: string | object): Promise<PropertyDefinition[]> {
    const data = typeof json === 'string' ? JSON.parse(json) : json;
    const properties: PropertyDefinition[] = [];

    if (Array.isArray(data)) {
      for (const item of data) {
        const property = await this.createProperty(item);
        properties.push(property);
      }
    } else if (data.fieldsConfig) {
      // Import from legacy format (like breed.json)
      for (const [fieldName, fieldConfig] of Object.entries(data.fieldsConfig as any)) {
        const property = this.convertLegacyField(fieldName, fieldConfig);
        const created = await this.createProperty(property);
        properties.push(created);
      }
    }

    return properties;
  }

  /**
   * Export properties to JSON
   */
  exportProperties(properties: PropertyDefinition[]): string {
    return JSON.stringify(properties, null, 2);
  }

  // ============= Helper Methods =============

  private generateUID(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private propertyToDB(property: PropertyDefinition): any {
    return {
      uid: property.uid,
      name: property.name,
      type: property.type,
      data_type: property.dataType,
      caption: property.caption,
      component: property.component,
      config: {
        ...property,
        uid: undefined,
        name: undefined,
        type: undefined,
        dataType: undefined,
        caption: undefined,
        component: undefined
      },
      mixins: property.mixins || [],
      tags: property.tags || [],
      category: property.category,
      version: property.version || 1,
      is_system: property.isSystem || false,
      created_at: property.createdAt,
      updated_at: property.updatedAt,
      created_by: property.createdBy
    };
  }

  private parsePropertyFromDB(row: any): PropertyDefinition {
    return {
      uid: row.uid,
      name: row.name,
      type: row.type,
      dataType: row.data_type,
      caption: row.caption,
      component: row.component,
      ...(row.config || {}),
      mixins: row.mixins,
      tags: row.tags,
      category: row.category,
      version: row.version,
      isSystem: row.is_system,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by
    };
  }

  private parseMixinFromDB(row: any): PropertyMixin {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      applyFunction: row.apply_function,
      config: row.config,
      category: row.category,
      isSystem: row.is_system,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private convertLegacyField(fieldName: string, fieldConfig: any): Omit<PropertyDefinition, 'uid' | 'createdAt' | 'updatedAt'> {
    const typeMap: Record<string, PropertyType> = {
      'string': 'string',
      'number': 'number',
      'boolean': 'boolean',
      'Date': 'datetime',
      'object': 'json'
    };

    return {
      name: fieldConfig.name || fieldName,
      type: typeMap[fieldConfig.type] || 'string',
      caption: fieldConfig.caption || fieldName,
      component: fieldConfig.component || 10,
      isRequired: fieldConfig.isRequired || false,
      levelAccess: fieldConfig.levelAccess,
      entitySchemaName: fieldConfig.entitySchemaName,
      displayField: fieldConfig.displayField,
      entitiesColumns: fieldConfig.entitiesColumns,
      validators: fieldConfig.validators || [],
      mixins: [],
      tags: [],
      category: 'imported'
    };
  }

  // ============= Bulk Operations =============

  /**
   * Bulk create properties
   */
  async bulkCreateProperties(properties: Omit<PropertyDefinition, 'uid' | 'createdAt' | 'updatedAt'>[]): Promise<PropertyDefinition[]> {
    const created: PropertyDefinition[] = [];

    for (const property of properties) {
      try {
        const result = await this.createProperty(property);
        created.push(result);
      } catch (error) {
        console.error(`Failed to create property ${property.name}:`, error);
      }
    }

    return created;
  }

  /**
   * Search properties by name or caption
   */
  async searchProperties(query: string): Promise<PropertyDefinition[]> {
    try {
      const { data, error } = await this.supabase
        .from('property_registry')
        .select('*')
        .or(`name.ilike.%${query}%,caption.ilike.%${query}%`)
        .order('name');

      if (error) throw error;

      return (data || []).map(row => this.parsePropertyFromDB(row));
    } catch (error) {
      console.error('Failed to search properties:', error);
      return [];
    }
  }

  /**
   * Get properties by category
   */
  async getPropertiesByCategory(category: string): Promise<PropertyDefinition[]> {
    try {
      const { data, error } = await this.supabase
        .from('property_registry')
        .select('*')
        .eq('category', category)
        .order('name');

      if (error) throw error;

      return (data || []).map(row => this.parsePropertyFromDB(row));
    } catch (error) {
      console.error(`Failed to get properties for category ${category}:`, error);
      return [];
    }
  }

  /**
   * Get properties by type
   */
  async getPropertiesByType(type: PropertyType): Promise<PropertyDefinition[]> {
    try {
      const { data, error } = await this.supabase
        .from('property_registry')
        .select('*')
        .eq('type', type)
        .order('name');

      if (error) throw error;

      return (data || []).map(row => this.parsePropertyFromDB(row));
    } catch (error) {
      console.error(`Failed to get properties for type ${type}:`, error);
      return [];
    }
  }
}