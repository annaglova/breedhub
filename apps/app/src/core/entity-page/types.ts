export interface TabConfig {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  component: React.ComponentType<any>;
  fragment: string;
  order: number;
}

export interface EntityPageConfig<T> {
  entityName: string;
  headerComponent: React.ComponentType<{ entity: T }>;
  achievementsComponent?: React.ComponentType<{ entity: T }>;
  tabs: TabConfig[];
  loadEntity: (id: string) => Promise<T>;
  getTitle: (entity: T) => string;
  getDescription?: (entity: T) => string;
}

export interface EntityPageContextValue<T> {
  entity: T | null;
  isLoading: boolean;
  error: Error | null;
  config: EntityPageConfig<T>;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export interface ScrollPosition {
  fragment: string;
  top: number;
  height: number;
}