/**
 * Template operations for AppConfigStore.
 *
 * Extracted to reduce store size. All methods receive the store instance
 * to access configs and call CRUD/cascade methods.
 */

import type { AppConfig } from './app-config.signal-store';

/** Minimal store interface needed by template operations */
interface ConfigStore {
  configs: { value: Map<string, AppConfig> };
  configsList: { value: AppConfig[] };
  createConfig(config: any): Promise<AppConfig>;
  updateConfig(id: string, updates: any): Promise<void>;
  deleteConfig(id: string): Promise<void>;
  addChildToParent(parentId: string, childId: string): Promise<void>;
  removeChildFromParent(parentId: string, childId: string): Promise<void>;
  rebuildParentSelfData(configId: string): Promise<void>;
  cascadeUpdateUp(configId: string): Promise<void>;
  canAddConfigType(parentId: string, configType: string): boolean;
  isHighLevelType(type: string): boolean;
  isGroupingConfigType(type: string): boolean;
  deleteWithDependencies(configId: string, options?: any): Promise<{ success: boolean; error?: string }>;
}

// ============= PURE FUNCTIONS =============

/** Build tree structure from templates */
export function buildTemplateTree(templates: AppConfig[]): any[] {
  const nodeMap = new Map<string, any>();
  const roots: any[] = [];

  templates.forEach((template) => {
    const node = {
      id: template.id,
      name: template.caption || template.id.replace('template_', '').replace(/_/g, ' '),
      templateType: template.type,
      children: [],
      data: template.self_data || {},
    };
    nodeMap.set(template.id, node);
    roots.push(node);
  });

  templates.forEach((template) => {
    const parentNode = nodeMap.get(template.id);
    if (!parentNode) return;

    if (template.deps && template.deps.length > 0) {
      template.deps.forEach((childId) => {
        const childNode = nodeMap.get(childId);
        if (childNode) {
          parentNode.children.push(childNode);
          const rootIndex = roots.indexOf(childNode);
          if (rootIndex > -1) {
            roots.splice(rootIndex, 1);
          }
        }
      });
    }
  });

  return roots;
}

/** Recalculate template data (self_data + override_data merge) */
export function recalculateTemplateData(templates: AppConfig[]): AppConfig[] {
  return templates.map((template) => ({
    ...template,
    data: {
      ...(template.self_data || {}),
      ...(template.override_data || {}),
    },
  }));
}

// ============= TEMPLATE CRUD =============

const templateTypeNames: Record<string, string> = {
  app: 'App',
  workspace: 'Workspace',
  space: 'Space',
  view: 'View',
  page: 'Page',
  tab: 'Tab',
  sort: 'Sort Config',
  fields: 'Fields Config',
  sort_fields: 'Sort Fields',
  filter_fields: 'Filter Fields',
  user_config: 'User Config',
  menu_config: 'Menu Config',
  menu_section: 'Menu Section',
  menu_item: 'Menu Item',
};

export async function createTemplate(
  store: ConfigStore, type: string, parentId: string | null = null
): Promise<AppConfig> {
  if (parentId && !store.canAddConfigType(parentId, type)) {
    throw new Error(`Cannot add ${type} template - it already exists in parent`);
  }

  const timestamp = Date.now();
  const newId = `template_${type}_${timestamp}`;

  const created = await store.createConfig({
    id: newId,
    type: type as AppConfig['type'],
    tags: ['template'],
    self_data: {},
    override_data: {},
    deps: [],
    caption: `New ${templateTypeNames[type] || type}`,
    version: 1,
  });

  if (parentId) {
    await store.addChildToParent(parentId, newId);
  }

  return created;
}

export async function deleteTemplateWithChildren(
  store: ConfigStore, templateId: string
): Promise<void> {
  const parents = Array.from(store.configs.value.values()).filter(
    (config) => config.deps?.includes(templateId)
  );

  for (const parent of parents) {
    await store.removeChildFromParent(parent.id, templateId);
  }

  const result = await store.deleteWithDependencies(templateId, { deleteChildren: true });
  if (!result.success) {
    throw new Error(result.error || 'Failed to delete template');
  }
}

export async function cloneTemplate(
  store: ConfigStore, templateId: string
): Promise<AppConfig> {
  const template = store.configs.value.get(templateId);
  if (!template) throw new Error(`Template ${templateId} not found`);

  const cloneRecursive = async (
    originalId: string, parentCloneId: string | null = null
  ): Promise<AppConfig> => {
    const original = store.configs.value.get(originalId);
    if (!original) throw new Error(`Template ${originalId} not found`);

    const timestamp = Date.now();
    const cloneId = `${original.id}_copy_${timestamp}`;

    const cloned = await store.createConfig({
      ...original,
      id: cloneId,
      caption: parentCloneId ? original.caption : `${original.caption || original.id} (copy)`,
      deps: [],
      _deleted: false,
      _rev: undefined,
    });

    if (original.deps && original.deps.length > 0) {
      const clonedChildIds: string[] = [];

      for (const childId of original.deps) {
        const child = store.configs.value.get(childId);
        if (child && child.type !== 'field') {
          const clonedChild = await cloneRecursive(childId, cloneId);
          clonedChildIds.push(clonedChild.id);
        } else if (child && child.type === 'field') {
          clonedChildIds.push(childId);
        }
      }

      if (clonedChildIds.length > 0) {
        await store.updateConfig(cloneId, { deps: clonedChildIds });
        if (store.isHighLevelType(cloned.type)) {
          await store.rebuildParentSelfData(cloneId);
        }
      }
    }

    return cloned;
  };

  const clonedTemplate = await cloneRecursive(templateId);

  const allConfigs = Array.from(store.configs.value.values());
  const parent = allConfigs.find(
    (config) => config.tags?.includes('template') && config.deps?.includes(templateId)
  );

  if (parent) {
    const updatedDeps = [...(parent.deps || []), clonedTemplate.id];
    await store.updateConfig(parent.id, { deps: updatedDeps });
    if (store.isHighLevelType(parent.type)) {
      await store.rebuildParentSelfData(parent.id);
      await store.cascadeUpdateUp(parent.id);
    }
  }

  return clonedTemplate;
}

// ============= WORKING CONFIG FROM TEMPLATE/EXISTING =============

export async function createConfigFromTemplate(
  store: ConfigStore, templateId: string, parentId: string | null = null
): Promise<AppConfig> {
  const template = store.configs.value.get(templateId);
  if (!template) throw new Error(`Template ${templateId} not found`);

  const timestamp = Date.now();
  const configId = template.id.replace('template_', 'config_').replace(/_\d+$/, `_${timestamp}`);

  const created = await store.createConfig({
    id: configId,
    type: template.type,
    self_data: {},
    override_data: { ...template.override_data },
    deps: [],
    tags: [],
    caption: template.caption,
    version: template.version || 1,
    _deleted: false,
  });

  if (template.deps && template.deps.length > 0) {
    const childConfigIds: string[] = [];

    for (const childTemplateId of template.deps) {
      const childTemplate = store.configs.value.get(childTemplateId);
      if (childTemplate && (childTemplate.tags?.includes('template') || store.isHighLevelType(childTemplate.type))) {
        const childConfig = await createConfigFromTemplate(store, childTemplateId, configId);
        childConfigIds.push(childConfig.id);
      }
    }

    if (childConfigIds.length > 0) {
      await store.updateConfig(configId, { deps: childConfigIds });
      if (store.isHighLevelType(created.type)) {
        await store.rebuildParentSelfData(configId);
      }
    }
  }

  if (parentId) {
    await store.addChildToParent(parentId, configId);
  }

  return created;
}

export async function createConfigFromExisting(
  store: ConfigStore, sourceConfigId: string, parentId: string | null = null
): Promise<AppConfig> {
  const source = store.configs.value.get(sourceConfigId);
  if (!source) throw new Error(`Source config ${sourceConfigId} not found`);

  const timestamp = Date.now();
  const configId = `${source.type}_${timestamp}`;

  const created = await store.createConfig({
    id: configId,
    type: source.type,
    self_data: {},
    override_data: { ...source.override_data },
    deps: [],
    tags: [],
    caption: `${source.caption || source.id} (copy)`,
    version: source.version || 1,
    _deleted: false,
  });

  if (source.deps && source.deps.length > 0) {
    const childConfigIds: string[] = [];

    for (const childSourceId of source.deps) {
      const childSource = store.configs.value.get(childSourceId);
      if (childSource && (store.isHighLevelType(childSource.type) || store.isGroupingConfigType(childSource.type))) {
        const childConfig = await createConfigFromExisting(store, childSourceId, configId);
        childConfigIds.push(childConfig.id);
      } else if (childSource && (childSource.type === 'field' || childSource.type === 'entity_field')) {
        childConfigIds.push(childSourceId);
      } else if (childSource && childSource.type === 'property') {
        childConfigIds.push(childSourceId);
      }
    }

    if (childConfigIds.length > 0) {
      await store.updateConfig(configId, { deps: childConfigIds });
      if (store.isHighLevelType(created.type) || store.isGroupingConfigType(created.type)) {
        await store.rebuildParentSelfData(configId);
      }
    }
  }

  if (parentId) {
    await store.addChildToParent(parentId, configId);
  }

  return created;
}
