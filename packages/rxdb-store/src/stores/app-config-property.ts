/**
 * Property & Field operations for AppConfigStore.
 *
 * Extracted to reduce store size. All methods receive the store instance
 * to access configs and call CRUD/cascade methods.
 */

import type { AppConfig } from './app-config.signal-store';

/** Minimal store interface needed by property operations */
interface ConfigStore {
  configs: { value: Map<string, AppConfig> };
  configsList: { value: AppConfig[] };
  createConfig(config: any): Promise<AppConfig>;
  updateConfig(id: string, updates: any): Promise<void>;
  updateConfigWithCascade(id: string, updates: any): Promise<void>;
  deleteConfig(id: string): Promise<void>;
  cascadeUpdate(configId: string): Promise<void>;
  addDependency(configId: string, depId: string): Promise<{ success: boolean; error?: string }>;
  removeDependency(configId: string, depToRemove: string): Promise<{ success: boolean; error?: string }>;
  deleteWithDependencies(configId: string): Promise<{ success: boolean; error?: string }>;
}

// ============= PROPERTY CRUD =============

export async function createProperty(
  store: ConfigStore, id: string, data: any
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!id.startsWith('property_')) {
      return { success: false, error: 'Property ID must start with "property_"' };
    }
    if (store.configs.value.has(id)) {
      return { success: false, error: 'Property with this ID already exists' };
    }

    await store.createConfig({
      id,
      type: 'property',
      self_data: {},
      override_data: data,
      deps: [],
      category: 'custom',
      tags: ['property'],
      version: 1,
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create property',
    };
  }
}

export async function createPropertyWithTags(
  store: ConfigStore, id: string, data: any, tags: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!id.startsWith('property_')) {
      return { success: false, error: 'Property ID must start with "property_"' };
    }
    if (store.configs.value.has(id)) {
      return { success: false, error: 'Property with this ID already exists' };
    }

    await store.createConfig({
      id,
      type: 'property',
      self_data: {},
      override_data: data,
      deps: [],
      category: 'custom',
      tags: Array.isArray(tags) ? tags : [],
      version: 1,
    });

    return { success: true };
  } catch (error: any) {
    console.error('[createPropertyWithTags] Error:', error);
    return { success: false, error: error.message || 'Failed to create property' };
  }
}

export async function updateProperty(
  store: ConfigStore, id: string, data: any
): Promise<{ success: boolean; error?: string }> {
  try {
    const property = store.configs.value.get(id);
    if (!property || property.type !== 'property') {
      return { success: false, error: 'Property not found' };
    }

    await store.updateConfig(id, { override_data: data });
    await store.cascadeUpdate(id);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update property',
    };
  }
}

export async function deleteProperty(
  store: ConfigStore, id: string
): Promise<{ success: boolean; error?: string }> {
  return store.deleteWithDependencies(id);
}

export async function updatePropertyWithIdChangeAndTags(
  store: ConfigStore,
  oldId: string, newId: string, selfData: any, tags: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!newId.startsWith('property_')) {
      return { success: false, error: 'Property ID must start with "property_"' };
    }

    const existingProperty = store.configs.value.get(oldId);
    if (!existingProperty) {
      return { success: false, error: 'Property not found' };
    }

    // No ID change — just update data and tags
    if (oldId === newId) {
      const tagsArray = Array.isArray(tags) ? tags : [];
      await store.updateConfigWithCascade(oldId, {
        override_data: selfData,
        data: selfData,
        tags: tagsArray,
      });
      return { success: true };
    }

    if (store.configs.value.has(newId)) {
      return { success: false, error: 'Property with this ID already exists' };
    }

    // Find all dependents
    const dependents = store.configsList.value.filter(
      (c) => c.deps && c.deps.includes(oldId)
    );

    // Create new property
    await store.createConfig({
      ...existingProperty,
      id: newId,
      override_data: selfData,
      data: selfData,
      tags,
      version: (existingProperty.version || 0) + 1,
    });

    // Update all dependents
    for (const dependent of dependents) {
      const newDeps = dependent.deps!.map((dep) => (dep === oldId ? newId : dep));
      await store.updateConfigWithCascade(dependent.id, { deps: newDeps });
    }

    // Delete old property
    await store.deleteConfig(oldId);

    return { success: true };
  } catch (error: any) {
    console.error('[updatePropertyWithIdChangeAndTags] Error:', error);
    return { success: false, error: error.message || 'Failed to update property' };
  }
}

export async function updatePropertyWithIdChange(
  store: ConfigStore,
  oldId: string, newId: string, selfData: any
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!newId.startsWith('property_')) {
      return { success: false, error: 'Property ID must start with "property_"' };
    }

    const existingProperty = store.configs.value.get(oldId);
    if (!existingProperty) {
      return { success: false, error: 'Property not found' };
    }

    if (oldId === newId) {
      return await updateProperty(store, oldId, selfData);
    }

    if (store.configs.value.has(newId)) {
      return { success: false, error: 'Property with this ID already exists' };
    }

    const dependents = store.configsList.value.filter(
      (c) => c.deps && c.deps.includes(oldId)
    );

    await store.createConfig({
      id: newId,
      type: 'property',
      self_data: {},
      override_data: selfData,
      deps: existingProperty.deps || [],
      tags: existingProperty.tags || [],
      version: existingProperty.version || 1,
      caption: existingProperty.caption || null,
      category: existingProperty.category || null,
      _deleted: false,
    });

    for (const dependent of dependents) {
      const updatedDeps = dependent.deps!.map((d) => (d === oldId ? newId : d));
      await store.updateConfig(dependent.id, { deps: updatedDeps });
    }

    await store.deleteConfig(oldId);
    await store.cascadeUpdate(newId);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update property',
    };
  }
}

// ============= FIELD-PROPERTY LINKAGE =============

export async function addPropertyToField(
  store: ConfigStore, fieldId: string, propertyId: string
): Promise<{ success: boolean; error?: string }> {
  const property = store.configs.value.get(propertyId);
  if (!property || property.type !== 'property') {
    return { success: false, error: 'Property not found' };
  }
  return store.addDependency(fieldId, propertyId);
}

export async function removePropertyFromField(
  store: ConfigStore, fieldId: string, propertyId: string
): Promise<{ success: boolean; error?: string }> {
  return store.removeDependency(fieldId, propertyId);
}

export async function updateFieldOverride(
  store: ConfigStore, fieldId: string, overrideData: any
): Promise<{ success: boolean; error?: string }> {
  try {
    const field = store.configs.value.get(fieldId);
    if (!field) {
      return { success: false, error: 'Field not found' };
    }

    await store.updateConfig(fieldId, { override_data: overrideData });
    await store.cascadeUpdate(fieldId);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update field',
    };
  }
}

// ============= UI WRAPPERS =============

export async function addDependencyWithUI(
  store: ConfigStore, fieldId: string, propertyId: string
): Promise<void> {
  try {
    const result = await addPropertyToField(store, fieldId, propertyId);
    if (!result.success) {
      if (result.error === 'Dependency already exists') {
        console.log('Dependency already exists');
      } else {
        alert(result.error || 'Failed to add dependency');
      }
      return;
    }
    console.log(`Successfully added ${propertyId} to ${fieldId}`);
  } catch (error) {
    console.error('Error adding dependency:', error);
    alert('Failed to add dependency');
  }
}

export async function removeDependencyWithUI(
  store: ConfigStore, fieldId: string, depToRemove: string
): Promise<void> {
  if (!confirm(
    `Remove dependency "${depToRemove.replace('property_', '')}" from field "${fieldId}"?`
  )) {
    return;
  }

  try {
    const result = await removePropertyFromField(store, fieldId, depToRemove);
    if (!result.success) {
      alert(result.error || 'Failed to remove dependency');
      return;
    }
    console.log(`Successfully removed ${depToRemove} from ${fieldId}`);
  } catch (error) {
    console.error('Error removing dependency:', error);
    alert('Failed to remove dependency');
  }
}
