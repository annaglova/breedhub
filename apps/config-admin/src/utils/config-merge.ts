import { appConfigStore } from '@breedhub/rxdb-store';

// Deep merge function
export function deepMerge(target: any, ...sources: any[]): any {
  if (!sources.length) return target;
  
  const result = { ...target };
  
  for (const source of sources) {
    if (!source) continue;
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
  }
  
  return result;
}

// Get all configs that depend on a given config ID
export function getDependentConfigs(configId: string, allConfigs: any[]): any[] {
  const dependents: any[] = [];
  
  for (const config of allConfigs) {
    if (config.deps && config.deps.includes(configId)) {
      dependents.push(config);
      // Recursively get configs that depend on this one
      const childDependents = getDependentConfigs(config.id, allConfigs);
      dependents.push(...childDependents);
    }
  }
  
  return dependents;
}

// Compute merged data for a config (simplified: self_data + override_data)
export async function computeMergedData(config: any): Promise<any> {
  // Start with self_data
  let merged = config.self_data || {};
  
  // Apply override_data on top
  if (config.override_data) {
    merged = deepMerge(merged, config.override_data);
  }
  
  return merged;
}

// Compute and update self_data when adding property
export async function computeUpdatedSelfData(field: any, propertyId: string, allConfigs: any[]): Promise<any> {
  // Get the property to add
  const property = allConfigs.find(c => c.id === propertyId);
  if (!property || property.type !== 'property') {
    return field.self_data;
  }
  
  // Merge property's data with field's current self_data
  return deepMerge(field.self_data || {}, property.data || {});
}

// Remove property fields from self_data when removing property
export async function removePropertyFromSelfData(field: any, propertyId: string, allConfigs: any[]): Promise<any> {
  // Get the property to remove
  const property = allConfigs.find(c => c.id === propertyId);
  if (!property || property.type !== 'property' || !property.data) {
    return field.self_data;
  }
  
  // Clone current self_data
  const updatedSelfData = { ...(field.self_data || {}) };
  
  // Remove all keys that exist in property's data
  const propertyKeys = Object.keys(property.data);
  for (const key of propertyKeys) {
    delete updatedSelfData[key];
  }
  
  // Re-apply properties that are still in deps
  const remainingDeps = (field.deps || []).filter(d => d !== propertyId);
  for (const depId of remainingDeps) {
    const depConfig = allConfigs.find(c => c.id === depId);
    if (depConfig && depConfig.type === 'property' && depConfig.data) {
      Object.assign(updatedSelfData, depConfig.data);
    }
  }
  
  return updatedSelfData;
}

// Add property to field and update all dependents
export async function addPropertyToField(
  fieldId: string, 
  propertyId: string
): Promise<{ success: boolean; updatedConfigs: any[]; error?: string }> {
  try {
    const allConfigs = appConfigStore.configsList.value || [];
    
    // Find the field and property
    const field = allConfigs.find(c => c.id === fieldId);
    const property = allConfigs.find(c => c.id === propertyId);
    
    if (!field) {
      return { success: false, updatedConfigs: [], error: 'Field not found' };
    }
    
    if (!property) {
      return { success: false, updatedConfigs: [], error: 'Property not found' };
    }
    
    // Check if dependency already exists
    if (field.deps && field.deps.includes(propertyId)) {
      return { success: false, updatedConfigs: [], error: 'Dependency already exists' };
    }
    
    // Prepare updates array
    const updates: any[] = [];
    
    // 1. Update the field itself - merge property data into self_data
    const updatedSelfData = await computeUpdatedSelfData(field, propertyId, allConfigs);
    const updatedField = {
      ...field,
      deps: [...(field.deps || []), propertyId],
      self_data: updatedSelfData,
      data: await computeMergedData({
        ...field,
        self_data: updatedSelfData,
        override_data: field.override_data
      }),
      updated_at: new Date().toISOString()
    };
    updates.push(updatedField);
    
    // 2. Find and update all dependent configs (up the tree)
    const dependents = getDependentConfigs(fieldId, allConfigs);
    
    // Create temporary configs list with updated field
    const tempConfigs = allConfigs.map(c => c.id === fieldId ? updatedField : c);
    
    for (const dependent of dependents) {
      // For dependent configs, we need to recompute based on their deps
      let mergedFromDeps = {};
      if (dependent.deps && dependent.deps.length > 0) {
        for (const depId of dependent.deps) {
          const depConfig = tempConfigs.find(c => c.id === depId);
          if (depConfig) {
            // Use data from the dependency
            mergedFromDeps = deepMerge(mergedFromDeps, depConfig.data || {});
          }
        }
      }
      
      const updatedDependent = {
        ...dependent,
        self_data: mergedFromDeps,
        data: await computeMergedData({
          ...dependent,
          self_data: mergedFromDeps,
          override_data: dependent.override_data
        }),
        updated_at: new Date().toISOString()
      };
      updates.push(updatedDependent);
    }
    
    // 3. Perform bulk update
    console.log(`Updating ${updates.length} configs after adding ${propertyId} to ${fieldId}`);
    
    // Update each config in the store
    for (const config of updates) {
      await appConfigStore.updateConfig(config.id, config);
    }
    
    return { success: true, updatedConfigs: updates };
    
  } catch (error) {
    console.error('Error adding property to field:', error);
    return { 
      success: false, 
      updatedConfigs: [], 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// Remove property from field and update all dependents
export async function removePropertyFromField(
  fieldId: string, 
  propertyId: string
): Promise<{ success: boolean; updatedConfigs: any[]; error?: string }> {
  try {
    const allConfigs = appConfigStore.configsList.value || [];
    
    // Find the field
    const field = allConfigs.find(c => c.id === fieldId);
    
    if (!field) {
      return { success: false, updatedConfigs: [], error: 'Field not found' };
    }
    
    // Remove the dependency
    const newDeps = (field.deps || []).filter(d => d !== propertyId);
    
    // Prepare updates array
    const updates: any[] = [];
    
    // 1. Update the field itself - remove property data from self_data
    const updatedSelfData = await removePropertyFromSelfData(field, propertyId, allConfigs);
    const updatedField = {
      ...field,
      deps: newDeps,
      self_data: updatedSelfData,
      data: await computeMergedData({
        ...field,
        self_data: updatedSelfData,
        override_data: field.override_data
      }),
      updated_at: new Date().toISOString()
    };
    updates.push(updatedField);
    
    // 2. Find and update all dependent configs (up the tree)
    const dependents = getDependentConfigs(fieldId, allConfigs);
    
    // Create temporary configs list with updated field
    const tempConfigs = allConfigs.map(c => c.id === fieldId ? updatedField : c);
    
    for (const dependent of dependents) {
      // For dependent configs, we need to recompute based on their deps
      let mergedFromDeps = {};
      if (dependent.deps && dependent.deps.length > 0) {
        for (const depId of dependent.deps) {
          const depConfig = tempConfigs.find(c => c.id === depId);
          if (depConfig) {
            // Use data from the dependency
            mergedFromDeps = deepMerge(mergedFromDeps, depConfig.data || {});
          }
        }
      }
      
      const updatedDependent = {
        ...dependent,
        self_data: mergedFromDeps,
        data: await computeMergedData({
          ...dependent,
          self_data: mergedFromDeps,
          override_data: dependent.override_data
        }),
        updated_at: new Date().toISOString()
      };
      updates.push(updatedDependent);
    }
    
    // 3. Perform bulk update
    console.log(`Updating ${updates.length} configs after removing ${propertyId} from ${fieldId}`);
    
    // Update each config in the store
    for (const config of updates) {
      await appConfigStore.updateConfig(config.id, config);
    }
    
    return { success: true, updatedConfigs: updates };
    
  } catch (error) {
    console.error('Error removing property from field:', error);
    return { 
      success: false, 
      updatedConfigs: [], 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}