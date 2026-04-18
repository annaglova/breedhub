export interface FieldConfig {
  fieldType: string;
  displayName: string;
  required?: boolean;
  isSystem?: boolean;
  isUnique?: boolean;
  isPrimaryKey?: boolean;
  maxLength?: number;
  validation?: any;
  permissions?: any;
  defaultValue?: any;
  component?: string;
  originalConfigKey?: string;
}

export interface SpaceConfig {
  id: string;
  icon?: string;
  slug?: string;
  path?: string;
  label?: string;
  order?: number;
  entitySchemaName?: string;
  entitySchemaModel?: string;
  totalFilterKey?: string;
  fields?: Record<string, FieldConfig>;
  sort_fields?: Record<string, any>;
  filter_fields?: Record<string, any>;
  recordsCount?: number;
  rows?: number;
  pages?: Record<string, any>;
  views?: Record<string, any>;
  canAdd?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  defaultFilters?: Record<string, any>;
}

export interface SpaceViewConfig {
  viewType: string;
  icon?: string;
  tooltip?: string;
  component?: string;
  itemHeight?: number;
  dividers?: boolean;
  overscan?: number;
  recordsCount?: number;
}

export interface SpaceSortOption {
  id: string;
  name: string;
  icon?: string;
  field: string;
  direction?: string;
  parameter?: string;
  isDefault?: boolean;
  tieBreaker?: {
    field: string;
    direction: "asc" | "desc";
    parameter?: string;
  };
}

export interface SpaceFilterField {
  id: string;
  displayName: string;
  component: string;
  placeholder?: string;
  fieldType: string;
  required?: boolean;
  operator?: string;
  slug?: string;
  value?: any;
  validation?: any;
  order: number;
  referencedTable?: string;
  referencedFieldID?: string;
  referencedFieldName?: string;
  dataSource?: "dictionary" | "collection";
  dependsOn?: string;
  disabledUntil?: string;
  filterBy?: string;
  junctionTable?: string;
  junctionField?: string;
  junctionFilterField?: string;
  orFields?: string[];
}

export interface SpaceMainFilterField {
  id: string;
  displayName: string;
  component: string;
  placeholder?: string;
  fieldType: string;
  operator?: string;
  slug?: string;
}

export interface SpaceMainFilterFieldsResult {
  fields: SpaceMainFilterField[];
  searchSlug?: string;
}

export interface UiSpaceConfig extends SpaceConfig {
  title: string;
  viewTypes?: string[];
  viewConfigs?: SpaceViewConfig[];
}

export function resolveSpaceConfig(
  spaceConfigs: Map<string, SpaceConfig>,
  entityType: string,
): SpaceConfig | undefined {
  const exact = spaceConfigs.get(entityType);
  if (exact) {
    return exact;
  }

  const lower = entityType.toLowerCase();
  for (const [key, config] of spaceConfigs.entries()) {
    if (key.toLowerCase() === lower) {
      return config;
    }
  }

  return undefined;
}

export function buildUiSpaceConfig(
  spaceConfig: SpaceConfig,
  entityType: string,
): UiSpaceConfig {
  const viewConfigs = extractViewConfigs(spaceConfig);

  return {
    ...spaceConfig,
    title: spaceConfig.label || spaceConfig.entitySchemaName || entityType,
    viewTypes: viewConfigs.length > 0 ? viewConfigs.map((view) => view.viewType) : undefined,
    viewConfigs: viewConfigs.length > 0 ? viewConfigs : undefined,
  };
}

function extractViewConfigs(spaceConfig: SpaceConfig): SpaceViewConfig[] {
  const viewConfigs: SpaceViewConfig[] = [];

  if (!spaceConfig.views) {
    return viewConfigs;
  }

  Object.values(spaceConfig.views).forEach((view: any) => {
    if (!view?.viewType) {
      return;
    }

    viewConfigs.push({
      viewType: view.viewType,
      icon: view.icon,
      tooltip: view.tooltip,
      component: view.component,
      itemHeight: view.itemHeight,
      dividers: view.dividers,
      overscan: view.overscan,
      recordsCount: view.recordsCount,
    });
  });

  return viewConfigs;
}

export function getViewRecordsCountFromConfig(
  spaceConfig: SpaceConfig | undefined,
  entityType: string,
  viewType: string,
): number {
  if (!spaceConfig) {
    console.warn(
      `[SpaceStore] No space config found for ${entityType}, using default recordsCount: 50`,
    );
    return 50;
  }

  if (spaceConfig.views) {
    for (const viewConfig of Object.values(spaceConfig.views)) {
      if (viewConfig.viewType === viewType && viewConfig.recordsCount) {
        return viewConfig.recordsCount;
      }
    }
  }

  if (spaceConfig.recordsCount) {
    return spaceConfig.recordsCount;
  }

  console.warn(
    `[SpaceStore] No recordsCount config found for ${entityType}/${viewType}, using default: 50`,
  );
  return 50;
}

export function getDefaultViewFromConfig(
  spaceConfig: SpaceConfig | undefined,
  entityType: string,
): string {
  if (!spaceConfig) {
    console.warn(
      `[SpaceStore] No space config found for ${entityType}, using default view: 'list'`,
    );
    return "list";
  }

  if (spaceConfig.views) {
    for (const viewConfig of Object.values(spaceConfig.views)) {
      if (viewConfig.isDefault && viewConfig.slug) {
        return viewConfig.slug;
      }
    }

    const firstView = Object.values(spaceConfig.views)[0];
    if (firstView?.slug) {
      return firstView.slug;
    }
    if (firstView?.viewType) {
      return firstView.viewType;
    }
  }

  console.warn(
    `[SpaceStore] No views config found for ${entityType}, using default: 'list'`,
  );
  return "list";
}

export function getSortOptionsFromConfig(
  spaceConfig: SpaceConfig | undefined,
  entityType: string,
): SpaceSortOption[] {
  if (!spaceConfig) {
    console.warn(`[SpaceStore] No space config found for ${entityType}`);
    return [];
  }

  const sortFields = spaceConfig.sort_fields;
  if (!sortFields) {
    console.warn(`[SpaceStore] No sort_fields found for ${entityType}`);
    return [];
  }

  const sortOptions: Array<SpaceSortOption & { fieldOrder?: number; optionOrder?: number }> = [];

  for (const [fieldId, fieldConfig] of Object.entries(sortFields)) {
    const field = fieldConfig as any;
    const fieldOrder = field.order || 0;

    if (!field.sortOrder || !Array.isArray(field.sortOrder)) {
      continue;
    }

    field.sortOrder.forEach((sortOption: any) => {
      const optionId = sortOption.slug || (
        sortOption.parametr
          ? `${fieldId}_${sortOption.parametr}_${sortOption.direction}`
          : `${fieldId}_${sortOption.direction}`
      );

      sortOptions.push({
        id: optionId,
        name: sortOption.label || field.displayName || fieldId,
        icon: sortOption.icon,
        field: fieldId,
        direction: sortOption.direction,
        parameter: sortOption.parametr,
        isDefault: sortOption.isDefault === "true" || sortOption.isDefault === true,
        fieldOrder,
        optionOrder: sortOption.order || 0,
        tieBreaker: sortOption.tieBreaker ? {
          field: sortOption.tieBreaker.field,
          direction: sortOption.tieBreaker.direction,
          parameter: sortOption.tieBreaker.parameter,
        } : undefined,
      });
    });
  }

  sortOptions.sort((a, b) => {
    if (a.fieldOrder !== b.fieldOrder) {
      return (a.fieldOrder || 0) - (b.fieldOrder || 0);
    }
    return (a.optionOrder || 0) - (b.optionOrder || 0);
  });

  return sortOptions.map(({ fieldOrder, optionOrder, ...rest }) => rest);
}

export function getFilterFieldsFromConfig(
  spaceConfig: SpaceConfig | undefined,
  entityType: string,
): SpaceFilterField[] {
  if (!spaceConfig) {
    console.warn(`[SpaceStore] No space config found for ${entityType}`);
    return [];
  }

  const filterFields = spaceConfig.filter_fields;
  if (!filterFields) {
    console.warn(`[SpaceStore] No filter_fields found for ${entityType}`);
    return [];
  }

  const filterOptions: SpaceFilterField[] = [];

  for (const [fieldId, fieldConfig] of Object.entries(filterFields)) {
    const field = fieldConfig as any;
    if (field.mainFilterField === true) {
      continue;
    }

    filterOptions.push({
      id: fieldId,
      displayName: field.displayName || fieldId,
      component: field.component || "TextInput",
      placeholder: field.placeholder,
      fieldType: field.fieldType || "string",
      required: field.required,
      operator: field.operator,
      slug: field.slug,
      value: field.value,
      validation: field.validation,
      order: field.order || 0,
      referencedTable: field.referencedTable,
      referencedFieldID: field.referencedFieldID,
      referencedFieldName: field.referencedFieldName,
      dataSource: field.dataSource,
      dependsOn: field.dependsOn,
      disabledUntil: field.disabledUntil,
      filterBy: field.filterBy,
      junctionTable: field.junctionTable,
      junctionField: field.junctionField,
      junctionFilterField: field.junctionFilterField,
      orFields: field.orFields,
    });
  }

  filterOptions.sort((a, b) => a.order - b.order);
  return filterOptions;
}

export function getMainFilterFieldFromConfig(
  spaceConfig: SpaceConfig | undefined,
): SpaceMainFilterField | null {
  if (!spaceConfig?.filter_fields) {
    return null;
  }

  for (const [fieldId, fieldConfig] of Object.entries(spaceConfig.filter_fields)) {
    const field = fieldConfig as any;
    if (field.mainFilterField === true) {
      return {
        id: fieldId,
        displayName: field.displayName || fieldId,
        component: field.component || "TextInput",
        placeholder: field.placeholder,
        fieldType: field.fieldType || "string",
        operator: field.operator,
        slug: field.slug,
      };
    }
  }

  return null;
}

export function getMainFilterFieldsFromConfig(
  spaceConfig: SpaceConfig | undefined,
): SpaceMainFilterFieldsResult {
  if (!spaceConfig?.filter_fields) {
    return { fields: [] };
  }

  const mainFields: SpaceMainFilterField[] = [];
  let searchSlug: string | undefined;

  for (const [fieldId, fieldConfig] of Object.entries(spaceConfig.filter_fields)) {
    const field = fieldConfig as any;
    if (field.mainFilterField !== true) {
      continue;
    }

    mainFields.push({
      id: fieldId,
      displayName: field.displayName || fieldId,
      component: field.component || "TextInput",
      placeholder: field.placeholder,
      fieldType: field.fieldType || "string",
      operator: field.operator,
      slug: field.slug,
    });

    if (field.searchSlug && !searchSlug) {
      searchSlug = field.searchSlug;
    }
  }

  return { fields: mainFields, searchSlug };
}
