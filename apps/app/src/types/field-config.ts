/**
 * Shared field configuration types for all form-like components:
 * - EditFormTab (entity edit page)
 * - EditChildRecordDialog (child record modal)
 * - FiltersDialog (filter modal)
 *
 * Single source of truth — don't duplicate these interfaces.
 */

/** Base field config — shared across all form contexts */
export interface BaseFieldConfig {
  displayName: string;
  component?: string;
  fieldType: string;
  required?: boolean;
  placeholder?: string;
  order?: number;
  sortOrder?: number;
  options?: Array<{ value: string; label: string; disabled?: boolean }>;

  // FK / dictionary
  referencedTable?: string;
  referencedFieldID?: string;
  referencedFieldName?: string;
  dataSource?: "dictionary" | "collection";
  isForeignKey?: boolean;

  // Cascade filtering
  dependsOn?: string;
  disabledUntil?: string;
  filterBy?: string;

  // Junction table filtering (many-to-many)
  junctionTable?: string;
  junctionField?: string;
  junctionFilterField?: string;

  // Layout
  fullWidth?: boolean;
  group?: string;
  groupLayout?: "horizontal" | "vertical";

  // Catch-all for extra config props
  [key: string]: any;
}

/** Edit form field config — extends base with edit-specific features */
export interface EditFieldConfig extends BaseFieldConfig {
  // Conditional behavior
  readonlyWhen?: string;
  visibleWhen?: { field: string; value: string | string[] };
  hidden?: boolean;

  // Validation
  validation?: any;
  maxLength?: number;

  // Create mode
  prefillFromFilter?: boolean;
  defaultValue?: string;

  // PetPickerInput
  pairedField?: string;
  sexFilter?: "male" | "female";

  // Table display
  showInForm?: boolean;
  showInTable?: boolean;
  searchable?: boolean;
  isPrimaryKey?: boolean;
  isUnique?: boolean;
  isSystem?: boolean;

  // Dependent field auto-fill
  fillDependent?: Array<{ sourceField: string; targetField: string }>;
}

/** Filter field config — extends base with filter-specific features */
export interface FilterFieldConfig extends BaseFieldConfig {
  id: string;
  operator?: string;
  slug?: string;
  mainFilterField?: boolean;
  orFields?: string[];
  value?: any;
}
