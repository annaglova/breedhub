import type { RxDocument, RxCollection } from 'rxdb';

export interface PropertyDefinition {
  id: string; // UUID v4 format
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'datetime' | 'json' | 'array' | 'reference';
  data_type: string;
  caption: string;
  component: number;
  config?: any;
  mixins?: string[];
  tags?: string[];
  category: string;
  version?: number;
  is_system?: boolean;
  created_at?: string;
  updated_at?: string;
  created_by: string;
  _deleted?: boolean;
}

export type PropertyDocument = RxDocument<PropertyDefinition>;
export type PropertyCollection = RxCollection<PropertyDefinition>;