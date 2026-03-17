/**
 * Pure query/filter/build functions for app-config store.
 * No side effects, no state mutations — only reads and transforms.
 */

import type { AppConfig, TreeNode } from './app-config.signal-store';
import { extractFieldName } from '../utils/field-normalization';

// ============= PROPERTY STYLING =============

export function getPropertyColor(property: AppConfig): string {
  if (property.id === 'property_is_system' || property.id === 'property_not_system') {
    return 'text-yellow-600';
  }
  const data = JSON.stringify(property.data || {});
  if (data.includes('required')) return 'text-red-600';
  if (data.includes('system')) return 'text-yellow-600';
  if (data.includes('primary')) return 'text-purple-600';
  if (data.includes('unique')) return 'text-blue-600';
  if (data.includes('maxLength')) return 'text-green-600';
  return 'text-slate-600';
}

export function getPropertyBorderColor(property: AppConfig): string {
  if (property.id === 'property_is_system' || property.id === 'property_not_system') {
    return 'border-yellow-400 bg-yellow-100';
  }
  const data = JSON.stringify(property.data || {});
  if (data.includes('required')) return 'border-red-200 bg-red-50';
  if (data.includes('system')) return 'border-yellow-200 bg-yellow-50';
  if (data.includes('primary')) return 'border-purple-200 bg-purple-50';
  if (data.includes('unique')) return 'border-blue-200 bg-blue-50';
  if (data.includes('maxLength')) return 'border-green-200 bg-green-50';
  return 'border-slate-200 bg-slate-50';
}

export function getFieldDisplayName(field: AppConfig): string {
  return extractFieldName(field.id);
}

// ============= OPPOSITE PROPERTY MAPPING =============

const oppositePropertyMap: Record<string, string> = {
  property_unique: 'property_not_unique',
  property_not_unique: 'property_unique',
  property_required: 'property_not_required',
  property_not_required: 'property_required',
  property_nullable: 'property_not_nullable',
  property_not_nullable: 'property_nullable',
  property_readonly: 'property_not_readonly',
  property_not_readonly: 'property_readonly',
  property_indexed: 'property_not_indexed',
  property_not_indexed: 'property_indexed',
  property_primary: 'property_not_primary',
  property_not_primary: 'property_primary',
  property_searchable: 'property_not_searchable',
  property_not_searchable: 'property_searchable',
  property_sortable: 'property_not_sortable',
  property_not_sortable: 'property_sortable',
  property_filterable: 'property_not_filterable',
  property_not_filterable: 'property_filterable',
  property_hidden: 'property_not_hidden',
  property_not_hidden: 'property_hidden',
  property_editable: 'property_not_editable',
  property_not_editable: 'property_editable',
  property_visible: 'property_not_visible',
  property_not_visible: 'property_visible',
};

export function getOppositeProperty(propertyId: string): string | null {
  return oppositePropertyMap[propertyId] || null;
}

// ============= FILTERING =============

export function filterConfigItems<T extends { id: string; caption?: string; data?: any }>(
  items: T[],
  searchQuery: string
): T[] {
  if (!searchQuery) return items;

  const query = searchQuery.toLowerCase();
  return items.filter((item) => {
    if (item.id.toLowerCase().includes(query)) return true;
    if (item.caption && item.caption.toLowerCase().includes(query)) return true;
    if (item.data) {
      const dataStr = JSON.stringify(item.data).toLowerCase();
      if (dataStr.includes(query)) return true;
    }
    return false;
  });
}

export function filterConfigTree(nodes: TreeNode[], searchQuery: string): TreeNode[] {
  if (!searchQuery) return nodes;

  const query = searchQuery.toLowerCase();

  return nodes.reduce<TreeNode[]>((acc, node) => {
    const matchesSearch =
      node.name.toLowerCase().includes(query) ||
      node.id.toLowerCase().includes(query);

    const filteredChildren = filterConfigTree(node.children, searchQuery);

    if (matchesSearch || filteredChildren.length > 0) {
      acc.push({ ...node, children: filteredChildren });
    }

    return acc;
  }, []);
}

export function getAllNodeIds(nodes: TreeNode[]): string[] {
  const ids: string[] = [];

  const collectIds = (nodeList: TreeNode[]) => {
    for (const node of nodeList) {
      ids.push(node.id);
      if (node.children && node.children.length > 0) {
        collectIds(node.children);
      }
    }
  };

  collectIds(nodes);
  return ids;
}

// ============= STRUCTURE BUILDERS =============

export interface FieldsStructure {
  base: AppConfig[];
  main: Record<string, { fields: AppConfig[]; children: Record<string, AppConfig[]> }>;
  dictionaries: Record<string, AppConfig[]>;
}

export function buildFieldsStructure(fields: AppConfig[]): FieldsStructure {
  const structure: FieldsStructure = {
    base: [],
    main: {},
    dictionaries: {},
  };

  fields.forEach((field) => {
    if (field.type === 'field') {
      structure.base.push(field);
    } else if (field.type === 'entity_field' && field.tags) {
      if (field.tags.includes('main')) {
        const entityName = field.tags.find((t) => t !== 'main') || field.category || '';
        if (!structure.main[entityName]) {
          structure.main[entityName] = { fields: [], children: {} };
        }
        structure.main[entityName].fields.push(field);
      } else if (field.tags.includes('child')) {
        const parentEntities = field.tags.filter((t) => t !== 'child');
        const category = field.category || 'unknown';
        for (const parentEntity of parentEntities) {
          if (!structure.main[parentEntity]) {
            structure.main[parentEntity] = { fields: [], children: {} };
          }
          if (!structure.main[parentEntity].children[category]) {
            structure.main[parentEntity].children[category] = [];
          }
          structure.main[parentEntity].children[category].push(field);
        }
      } else if (field.tags.includes('dictionary')) {
        const category = field.category || 'unknown';
        if (!structure.dictionaries[category]) {
          structure.dictionaries[category] = [];
        }
        structure.dictionaries[category].push(field);
      }
    } else if (field.type === 'entity_field') {
      const category = field.category || 'unknown';
      if (!structure.dictionaries[category]) {
        structure.dictionaries[category] = [];
      }
      structure.dictionaries[category].push(field);
    }
  });

  // Sort
  structure.base.sort((a, b) => a.id.localeCompare(b.id));
  Object.values(structure.main).forEach((entity) => {
    entity.fields.sort((a, b) => a.id.localeCompare(b.id));
    Object.values(entity.children).forEach((childFields) => {
      childFields.sort((a, b) => a.id.localeCompare(b.id));
    });
  });
  Object.values(structure.dictionaries).forEach((dictFields) => {
    dictFields.sort((a, b) => a.id.localeCompare(b.id));
  });

  return structure;
}

export function filterFieldsStructure(
  structure: FieldsStructure,
  searchQuery: string
): FieldsStructure {
  if (!searchQuery) return structure;

  const filtered: FieldsStructure = {
    base: filterConfigItems(structure.base, searchQuery),
    main: {},
    dictionaries: {},
  };

  Object.entries(structure.main).forEach(([entityName, entityData]) => {
    const filteredFields = filterConfigItems(entityData.fields, searchQuery);
    const filteredChildren: Record<string, AppConfig[]> = {};

    Object.entries(entityData.children).forEach(([childName, childFields]) => {
      const filteredChildFields = filterConfigItems(childFields, searchQuery);
      if (filteredChildFields.length > 0) {
        filteredChildren[childName] = filteredChildFields;
      }
    });

    if (filteredFields.length > 0 || Object.keys(filteredChildren).length > 0) {
      filtered.main[entityName] = { fields: filteredFields, children: filteredChildren };
    }
  });

  Object.entries(structure.dictionaries).forEach(([dictName, dictFields]) => {
    const filteredDictFields = filterConfigItems(dictFields, searchQuery);
    if (filteredDictFields.length > 0) {
      filtered.dictionaries[dictName] = filteredDictFields;
    }
  });

  return filtered;
}

export function buildConfigTree(configs: AppConfig[]): TreeNode[] {
  const nodeMap = new Map<string, TreeNode>();
  const childIds = new Set<string>();

  configs.forEach((config) => {
    const node: TreeNode = {
      id: config.id,
      name: config.caption || config.id,
      configType: config.type,
      children: [],
      data: config.data || {},
      deps: config.deps,
    };
    nodeMap.set(config.id, node);
  });

  configs.forEach((config) => {
    const parentNode = nodeMap.get(config.id);
    if (!parentNode) return;

    if (config.deps && config.deps.length > 0) {
      config.deps.forEach((childId) => {
        if (
          childId.includes('field') &&
          ['fields', 'sort', 'filter'].includes(config.type)
        ) {
          const fieldNode: TreeNode = {
            id: childId,
            name: childId,
            configType: 'field_ref',
            children: [],
            data: {},
            deps: [],
          };
          parentNode.children.push(fieldNode);
        } else {
          const childNode = nodeMap.get(childId);
          const childConfig = configs.find((c) => c.id === childId);
          if (childNode && childConfig) {
            parentNode.children.push(childNode);
            childIds.add(childId);
          }
        }
      });
    }
  });

  const roots: TreeNode[] = [];
  configs.forEach((config) => {
    if (!childIds.has(config.id)) {
      const node = nodeMap.get(config.id);
      if (node) roots.push(node);
    }
  });

  return roots;
}
