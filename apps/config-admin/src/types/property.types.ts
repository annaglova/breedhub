// Property Registry Type Definitions

export type PropertyType = 'string' | 'number' | 'boolean' | 'date' | 'datetime' | 'json' | 'array' | 'reference';

export type ComponentType = 
  | 0  // EntitySelect
  | 3  // DatePicker
  | 4  // NumberInput
  | 5  // Checkbox
  | 10; // TextInput

export interface PropertyDefinition {
  uid: string;
  name: string;
  type: PropertyType;
  dataType?: string; // SQL type: varchar, integer, jsonb, etc.
  
  // UI Configuration
  caption: string;
  component: ComponentType;
  placeholder?: string;
  helpText?: string;
  icon?: string;
  
  // Validation
  isRequired?: boolean;
  validators?: Validator[];
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  pattern?: string;
  enum?: any[];
  
  // Relations
  entitySchemaName?: string; // For reference fields
  displayField?: string;
  entitiesColumns?: string[];
  
  // Access Control
  levelAccess?: number;
  permissions?: Permission[];
  
  // Mixins & Features
  mixins?: string[];
  features?: Record<string, any>;
  
  // Metadata
  category?: string;
  tags?: string[];
  version?: number;
  isSystem?: boolean;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
}

export interface Validator {
  type: 'required' | 'pattern' | 'custom' | 'min' | 'max' | 'minLength' | 'maxLength' | 'email' | 'url';
  value?: any;
  message?: string;
  validator?: (value: any) => boolean;
}

export interface Permission {
  role: string;
  actions: ('read' | 'create' | 'update' | 'delete')[];
}

export interface PropertyUsage {
  id: string;
  propertyUid: string;
  configId: string;
  fieldName: string;
  overrides?: Partial<PropertyDefinition>;
  createdAt: string;
}

export interface PropertyMixin {
  id: string;
  name: string;
  description?: string;
  applyFunction: string; // JavaScript function as string
  config?: any;
  category?: string;
  isSystem?: boolean;
  createdAt?: string;
  updatedAt?: string;
}