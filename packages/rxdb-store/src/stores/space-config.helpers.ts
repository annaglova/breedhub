import { removeFieldPrefix } from "../utils/field-normalization";
import { ENTITY_VIEW_SOURCES } from "../utils/schema-builder";

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

export interface PartitionConfig {
  keyField: string;
  childFilterField: string;
}

export interface EntitySchemaConfig {
  entitySchemaName: string;
  fields: Record<string, any>;
  partition?: PartitionConfig;
}

export interface ParsedSpaceConfigurations {
  entitySchemas: Map<string, EntitySchemaConfig>;
  spaceConfigs: Map<string, SpaceConfig>;
  entityTypes: string[];
}

export function buildEntitySchemasMap(appConfig: any): Map<string, EntitySchemaConfig> {
  const entitySchemas = new Map<string, EntitySchemaConfig>();

  if (!appConfig?.entities) {
    console.warn("[SpaceStore] No entities found in app config");
    return entitySchemas;
  }

  Object.entries(appConfig.entities).forEach(([_, schema]: [string, any]) => {
    if (schema.entitySchemaName) {
      entitySchemas.set(schema.entitySchemaName, schema);
    }
  });

  console.log(
    `[SpaceStore] Built entity schemas map with ${entitySchemas.size} schemas:`,
    Array.from(entitySchemas.keys()),
  );
  return entitySchemas;
}

export function getEntityFieldsSchema(
  entitySchema: any,
  entitySchemaName: string,
): Map<string, FieldConfig> {
  const uniqueFields = new Map<string, FieldConfig>();

  if (!entitySchema?.fields || typeof entitySchema.fields !== "object") {
    return uniqueFields;
  }

  Object.entries(entitySchema.fields).forEach(([fieldKey, fieldValue]: [string, any]) => {
    const normalizedFieldName = removeFieldPrefix(fieldKey, entitySchemaName);
    const fieldData = fieldValue;

    uniqueFields.set(normalizedFieldName, {
      fieldType: fieldData.fieldType || "string",
      displayName: fieldData.displayName || fieldKey,
      required: fieldData.required || false,
      isSystem: fieldData.isSystem || false,
      isUnique: fieldData.isUnique || false,
      isPrimaryKey: fieldData.isPrimaryKey || false,
      maxLength: fieldData.maxLength,
      validation: fieldData.validation,
      permissions: fieldData.permissions,
      defaultValue: fieldData.defaultValue,
      component: fieldData.component,
      originalConfigKey: fieldKey,
    });
  });

  return uniqueFields;
}

export function parseSpaceConfigurations(
  appConfig: any,
): ParsedSpaceConfigurations | null {
  if (!appConfig?.workspaces) {
    console.warn("[SpaceStore] No workspaces found in app config");
    return null;
  }

  const entityTypes: string[] = [];
  const spaceConfigs = new Map<string, SpaceConfig>();
  const entitySchemas = buildEntitySchemasMap(appConfig);

  Object.entries(appConfig.workspaces).forEach(([_, workspace]: [string, any]) => {
    if (!workspace.spaces) {
      return;
    }

    Object.entries(workspace.spaces).forEach(([spaceKey, space]: [string, any]) => {
      if (!space.entitySchemaName) {
        return;
      }

      const entitySchema = entitySchemas.get(space.entitySchemaName);
      const uniqueFields = entitySchema
        ? getEntityFieldsSchema(entitySchema, space.entitySchemaName)
        : new Map<string, FieldConfig>();

      if (!entitySchema) {
        console.warn(`[SpaceStore] No entity schema found for ${space.entitySchemaName}`);
      }

      const normalizedSortFields = space.sort_fields
        ? Object.fromEntries(
            Object.entries(space.sort_fields).map(([key, value]) => [
              removeFieldPrefix(key, space.entitySchemaName),
              value,
            ]),
          )
        : undefined;

      const normalizedFilterFields = space.filter_fields
        ? Object.fromEntries(
            Object.entries(space.filter_fields).map(([key, value]) => [
              removeFieldPrefix(key, space.entitySchemaName),
              value,
            ]),
          )
        : undefined;

      const entitySchemaModel = space.entitySchemaModel || space.entitySchemaName;

      spaceConfigs.set(space.entitySchemaName, {
        id: space.id || spaceKey,
        icon: space.icon,
        slug: space.slug || space.path?.replace(/^\//, ""),
        path: space.path,
        label: space.label,
        order: space.order,
        entitySchemaName: space.entitySchemaName,
        entitySchemaModel,
        totalFilterKey: space.totalFilterKey,
        fields: Object.fromEntries(uniqueFields),
        sort_fields: normalizedSortFields,
        filter_fields: normalizedFilterFields,
        recordsCount: space.recordsCount,
        pages: space.pages,
        views: space.views,
        canAdd: !!space.canAdd,
        canEdit: !!space.canEdit,
        canDelete: !!space.canDelete,
        defaultFilters: space.defaultFilters,
      });
      entityTypes.push(space.entitySchemaName);
    });
  });

  return {
    entitySchemas,
    spaceConfigs,
    entityTypes,
  };
}

export function getSupabaseSource(entityType: string): string {
  return ENTITY_VIEW_SOURCES[entityType]?.viewName || entityType;
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
