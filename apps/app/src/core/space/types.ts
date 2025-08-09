/**
 * Space configuration types for React
 * Adapted from Angular space architecture
 */

import { ComponentType } from 'react';

export type ViewMode = 'list' | 'grid' | 'table' | 'map' | 'graph';

export interface ViewConfig {
  id: ViewMode;
  name: string;
  icon: string;
  itemHeight?: number;
  columns?: number; // for grid
  component: () => Promise<{ default: ComponentType<any> }>;
}

export interface FilterConfig {
  id: string;
  type: 'text' | 'select' | 'multiselect' | 'date' | 'range';
  label: string;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
}

export interface SpaceNaming {
  title: string;
  plural: {
    no: string;
    one: string;
    other: string;
  };
  searchPlaceholder: string;
  noSearchResults: string;
}

export interface SpaceConfig<T = any> {
  id: string;
  url: string;
  entitySchemaName: string;
  
  // View configuration
  viewConfig: ViewConfig[];
  defaultView?: ViewMode;
  
  // Data configuration
  entitiesColumns: string[];
  dateFields?: string[];
  
  // UI configuration
  naming: SpaceNaming;
  filterConfig: FilterConfig[];
  
  // Permissions
  canAdd?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  isPublic?: boolean;
  
  // Sorting
  defaultSort?: {
    field: string;
    order: 'asc' | 'desc';
  };
}

export interface SpaceListCardProps<T = any> {
  entity: T;
  selected?: boolean;
  index?: number;
  onClick?: () => void;
}

export interface SpaceDetailTab {
  id: string;
  label: string;
  icon?: string;
  component: ComponentType<any>;
}

export interface SpaceDetailConfig {
  tabs: SpaceDetailTab[];
  defaultTab?: string;
}