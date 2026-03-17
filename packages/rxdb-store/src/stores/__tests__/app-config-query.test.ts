/**
 * app-config-query Unit Tests
 *
 * Tests pure query/filter/build functions extracted from AppConfigStore.
 * No RxDB/Supabase dependencies — all functions are pure.
 *
 * Run: pnpm --filter @breedhub/rxdb-store test
 */

import { describe, it, expect } from 'vitest';
import {
  getPropertyColor,
  getPropertyBorderColor,
  getFieldDisplayName,
  getOppositeProperty,
  filterConfigItems,
  filterConfigTree,
  getAllNodeIds,
  buildFieldsStructure,
  filterFieldsStructure,
  buildConfigTree,
} from '../app-config-query';
import type { AppConfig, TreeNode } from '../app-config.signal-store';

// ============= HELPERS =============

function makeConfig(overrides: Partial<AppConfig> & { id: string }): AppConfig {
  return {
    type: 'property',
    self_data: {},
    override_data: {},
    data: {},
    deps: [],
    version: 1,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    ...overrides,
  } as AppConfig;
}

function makeField(id: string, type: 'field' | 'entity_field', tags?: string[], category?: string): AppConfig {
  return makeConfig({ id, type, tags, category });
}

// ============= getPropertyColor =============

describe('getPropertyColor', () => {
  it('returns yellow for system properties', () => {
    expect(getPropertyColor(makeConfig({ id: 'property_is_system' }))).toBe('text-yellow-600');
    expect(getPropertyColor(makeConfig({ id: 'property_not_system' }))).toBe('text-yellow-600');
  });

  it('returns red for required properties', () => {
    const prop = makeConfig({ id: 'property_required', data: { required: true } });
    expect(getPropertyColor(prop)).toBe('text-red-600');
  });

  it('returns purple for primary key properties', () => {
    const prop = makeConfig({ id: 'property_primary_key', data: { isPrimaryKey: true, primary: true } });
    expect(getPropertyColor(prop)).toBe('text-purple-600');
  });

  it('returns default for unknown properties', () => {
    const prop = makeConfig({ id: 'property_custom', data: { foo: 'bar' } });
    expect(getPropertyColor(prop)).toBe('text-slate-600');
  });
});

// ============= getPropertyBorderColor =============

describe('getPropertyBorderColor', () => {
  it('returns yellow for system properties', () => {
    expect(getPropertyBorderColor(makeConfig({ id: 'property_is_system' }))).toBe('border-yellow-400 bg-yellow-100');
  });

  it('returns default for unknown properties', () => {
    const prop = makeConfig({ id: 'property_custom', data: { foo: 'bar' } });
    expect(getPropertyBorderColor(prop)).toBe('border-slate-200 bg-slate-50');
  });
});

// ============= getFieldDisplayName =============

describe('getFieldDisplayName', () => {
  it('extracts field name from entity field id', () => {
    const field = makeConfig({ id: 'breed_field_name' });
    const name = getFieldDisplayName(field);
    expect(name).toBeTruthy();
    expect(typeof name).toBe('string');
  });
});

// ============= getOppositeProperty =============

describe('getOppositeProperty', () => {
  it('returns opposite for known properties', () => {
    expect(getOppositeProperty('property_required')).toBe('property_not_required');
    expect(getOppositeProperty('property_not_required')).toBe('property_required');
    expect(getOppositeProperty('property_unique')).toBe('property_not_unique');
    expect(getOppositeProperty('property_not_unique')).toBe('property_unique');
    expect(getOppositeProperty('property_readonly')).toBe('property_not_readonly');
  });

  it('returns null for unknown properties', () => {
    expect(getOppositeProperty('property_custom')).toBeNull();
    expect(getOppositeProperty('something_else')).toBeNull();
  });

  it('is symmetric', () => {
    const pairs = [
      ['property_required', 'property_not_required'],
      ['property_unique', 'property_not_unique'],
      ['property_hidden', 'property_not_hidden'],
      ['property_editable', 'property_not_editable'],
    ];
    for (const [a, b] of pairs) {
      expect(getOppositeProperty(a)).toBe(b);
      expect(getOppositeProperty(b)).toBe(a);
    }
  });
});

// ============= filterConfigItems =============

describe('filterConfigItems', () => {
  const items = [
    makeConfig({ id: 'breed_field_name', caption: 'Name' }),
    makeConfig({ id: 'breed_field_color', caption: 'Color' }),
    makeConfig({ id: 'pet_field_weight', caption: 'Weight', data: { unit: 'kg' } }),
  ];

  it('returns all items when query is empty', () => {
    expect(filterConfigItems(items, '')).toHaveLength(3);
  });

  it('filters by id', () => {
    expect(filterConfigItems(items, 'breed')).toHaveLength(2);
  });

  it('filters by caption', () => {
    expect(filterConfigItems(items, 'Weight')).toHaveLength(1);
  });

  it('filters by data content', () => {
    expect(filterConfigItems(items, 'kg')).toHaveLength(1);
  });

  it('is case-insensitive', () => {
    expect(filterConfigItems(items, 'NAME')).toHaveLength(1);
    expect(filterConfigItems(items, 'name')).toHaveLength(1);
  });

  it('returns empty array for no matches', () => {
    expect(filterConfigItems(items, 'nonexistent')).toHaveLength(0);
  });
});

// ============= filterConfigTree =============

describe('filterConfigTree', () => {
  const tree: TreeNode[] = [
    {
      id: 'app_v1', name: 'App v1', configType: 'app', data: {}, deps: [],
      children: [
        {
          id: 'workspace_main', name: 'Main Workspace', configType: 'workspace', data: {}, deps: [],
          children: [
            { id: 'space_breed', name: 'Breed Space', configType: 'space', data: {}, deps: [], children: [] },
          ],
        },
      ],
    },
  ];

  it('returns full tree when query is empty', () => {
    expect(filterConfigTree(tree, '')).toHaveLength(1);
  });

  it('finds nested nodes', () => {
    const result = filterConfigTree(tree, 'breed');
    expect(result).toHaveLength(1);
    expect(result[0].children).toHaveLength(1);
    expect(result[0].children[0].children).toHaveLength(1);
  });

  it('returns empty for no matches', () => {
    expect(filterConfigTree(tree, 'nonexistent')).toHaveLength(0);
  });

  it('preserves parent chain for deep matches', () => {
    const result = filterConfigTree(tree, 'space_breed');
    expect(result[0].id).toBe('app_v1');
    expect(result[0].children[0].id).toBe('workspace_main');
    expect(result[0].children[0].children[0].id).toBe('space_breed');
  });
});

// ============= getAllNodeIds =============

describe('getAllNodeIds', () => {
  it('collects all ids recursively', () => {
    const tree: TreeNode[] = [
      {
        id: 'root', name: 'Root', configType: 'app', data: {}, deps: [],
        children: [
          {
            id: 'child1', name: 'C1', configType: 'workspace', data: {}, deps: [],
            children: [
              { id: 'grandchild', name: 'GC', configType: 'space', data: {}, deps: [], children: [] },
            ],
          },
          { id: 'child2', name: 'C2', configType: 'workspace', data: {}, deps: [], children: [] },
        ],
      },
    ];
    const ids = getAllNodeIds(tree);
    expect(ids).toEqual(['root', 'child1', 'grandchild', 'child2']);
  });

  it('returns empty array for empty tree', () => {
    expect(getAllNodeIds([])).toEqual([]);
  });
});

// ============= buildFieldsStructure =============

describe('buildFieldsStructure', () => {
  it('separates base fields from entity fields', () => {
    const fields = [
      makeField('field_name', 'field'),
      makeField('field_description', 'field'),
      makeField('breed_field_name', 'entity_field', ['main', 'breed'], 'breed'),
    ];
    const structure = buildFieldsStructure(fields);
    expect(structure.base).toHaveLength(2);
    expect(structure.main['breed']).toBeDefined();
    expect(structure.main['breed'].fields).toHaveLength(1);
  });

  it('groups child entity fields under parent', () => {
    const fields = [
      makeField('breed_division_field_name', 'entity_field', ['child', 'breed'], 'breed_division'),
    ];
    const structure = buildFieldsStructure(fields);
    expect(structure.main['breed']).toBeDefined();
    expect(structure.main['breed'].children['breed_division']).toHaveLength(1);
  });

  it('groups dictionary fields', () => {
    const fields = [
      makeField('gender_field_name', 'entity_field', ['dictionary'], 'gender'),
    ];
    const structure = buildFieldsStructure(fields);
    expect(structure.dictionaries['gender']).toHaveLength(1);
  });

  it('puts entity fields without tags in dictionaries fallback', () => {
    const fields = [
      makeField('unknown_field_x', 'entity_field', undefined, 'unknown_table'),
    ];
    const structure = buildFieldsStructure(fields);
    expect(structure.dictionaries['unknown_table']).toHaveLength(1);
  });

  it('sorts fields alphabetically', () => {
    const fields = [
      makeField('field_z', 'field'),
      makeField('field_a', 'field'),
      makeField('field_m', 'field'),
    ];
    const structure = buildFieldsStructure(fields);
    expect(structure.base.map(f => f.id)).toEqual(['field_a', 'field_m', 'field_z']);
  });

  it('handles child belonging to multiple parents', () => {
    const fields = [
      makeField('shared_field', 'entity_field', ['child', 'breed', 'pet'], 'shared_table'),
    ];
    const structure = buildFieldsStructure(fields);
    expect(structure.main['breed'].children['shared_table']).toHaveLength(1);
    expect(structure.main['pet'].children['shared_table']).toHaveLength(1);
  });
});

// ============= filterFieldsStructure =============

describe('filterFieldsStructure', () => {
  const fields = [
    makeField('field_name', 'field', undefined, undefined),
    makeField('field_description', 'field', undefined, undefined),
    makeField('breed_field_name', 'entity_field', ['main', 'breed'], 'breed'),
    makeField('breed_field_color', 'entity_field', ['main', 'breed'], 'breed'),
    makeField('gender_field_name', 'entity_field', ['dictionary'], 'gender'),
  ];

  it('returns full structure when query is empty', () => {
    const structure = buildFieldsStructure(fields);
    const filtered = filterFieldsStructure(structure, '');
    expect(filtered).toBe(structure); // same reference
  });

  it('filters across all sections', () => {
    const structure = buildFieldsStructure(fields);
    const filtered = filterFieldsStructure(structure, 'name');
    expect(filtered.base).toHaveLength(1);
    expect(filtered.base[0].id).toBe('field_name');
    expect(filtered.main['breed'].fields).toHaveLength(1);
    expect(filtered.dictionaries['gender']).toHaveLength(1);
  });

  it('removes empty sections', () => {
    const structure = buildFieldsStructure(fields);
    const filtered = filterFieldsStructure(structure, 'color');
    expect(filtered.base).toHaveLength(0);
    expect(filtered.main['breed'].fields).toHaveLength(1);
    expect(filtered.dictionaries).toEqual({});
  });
});

// ============= buildConfigTree =============

describe('buildConfigTree', () => {
  it('builds parent-child tree from deps', () => {
    const configs = [
      makeConfig({ id: 'app_v1', type: 'app', deps: ['workspace_main'] }),
      makeConfig({ id: 'workspace_main', type: 'workspace', deps: ['space_breed'] }),
      makeConfig({ id: 'space_breed', type: 'space', deps: [] }),
    ];
    const tree = buildConfigTree(configs);
    expect(tree).toHaveLength(1);
    expect(tree[0].id).toBe('app_v1');
    expect(tree[0].children).toHaveLength(1);
    expect(tree[0].children[0].id).toBe('workspace_main');
    expect(tree[0].children[0].children).toHaveLength(1);
    expect(tree[0].children[0].children[0].id).toBe('space_breed');
  });

  it('returns multiple roots for unlinked configs', () => {
    const configs = [
      makeConfig({ id: 'app_1', type: 'app', deps: [] }),
      makeConfig({ id: 'app_2', type: 'app', deps: [] }),
    ];
    const tree = buildConfigTree(configs);
    expect(tree).toHaveLength(2);
  });

  it('creates virtual field_ref nodes for field deps in grouping configs', () => {
    const configs = [
      makeConfig({ id: 'fields_1', type: 'fields', deps: ['breed_field_name', 'breed_field_color'] }),
    ];
    const tree = buildConfigTree(configs);
    expect(tree).toHaveLength(1);
    expect(tree[0].children).toHaveLength(2);
    expect(tree[0].children[0].configType).toBe('field_ref');
    expect(tree[0].children[1].configType).toBe('field_ref');
  });

  it('uses caption as name when available', () => {
    const configs = [
      makeConfig({ id: 'app_v1', type: 'app', deps: [], caption: 'My App' }),
    ];
    const tree = buildConfigTree(configs);
    expect(tree[0].name).toBe('My App');
  });

  it('handles empty configs', () => {
    expect(buildConfigTree([])).toEqual([]);
  });
});
