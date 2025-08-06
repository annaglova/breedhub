import { SpaceConfig, ViewMode } from './types';

/**
 * Default view configuration for list mode
 */
export const DEFAULT_LIST_VIEW = {
  id: 'list' as ViewMode,
  name: 'List',
  icon: 'list',
  itemHeight: 68,
};

/**
 * Default view configuration for grid mode
 */
export const DEFAULT_GRID_VIEW = {
  id: 'grid' as ViewMode,
  name: 'Grid', 
  icon: 'grid',
  itemHeight: 280,
  columns: 3,
};

/**
 * Default columns that all spaces should fetch
 */
export const FIELD_NAMES_SPACE_MINIMUM = [
  'Id',
  'Name',
  'CreatedOn',
  'ModifiedOn',
];

/**
 * Common filters used across spaces
 */
export const NAME_FILTER = {
  id: 'name',
  type: 'text' as const,
  label: 'Name',
  placeholder: 'Filter by name...',
};

/**
 * Helper to create space configuration with defaults
 */
export function createSpaceConfig<T>(config: Partial<SpaceConfig<T>>): SpaceConfig<T> {
  return {
    id: '',
    url: '',
    entitySchemaName: '',
    viewConfig: [],
    entitiesColumns: FIELD_NAMES_SPACE_MINIMUM,
    naming: {
      title: '',
      plural: { no: 'no items', one: 'item', other: 'items' },
      searchPlaceholder: 'Search...',
      noSearchResults: 'No items found',
    },
    filterConfig: [],
    canAdd: false,
    canEdit: true,
    canDelete: false,
    isPublic: true,
    ...config,
  };
}