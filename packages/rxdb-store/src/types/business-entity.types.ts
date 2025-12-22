/**
 * Base interface for all business entities in the system
 */
export interface BusinessEntity {
  id: string;
  name?: string;
  created_at?: string;
  updated_at?: string;
  deleted?: boolean;
  [key: string]: unknown;
}
