import { Package, Layers, Grid, File, Settings, List, Filter } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// Common interfaces
export interface BaseConfig {
  id: string;
  type: string;
  self_data: any;
  override_data?: any;
  data: any;
  deps: string[];
  caption?: string;
  category?: string;
  tags?: string[];
  version?: number;
  _deleted?: boolean;
}

export interface TreeNode {
  id: string;
  name: string;
  configType?: string;
  templateType?: string;
  children: TreeNode[];
  data: any;
  deps?: string[];
  expanded?: boolean;
}

export interface ConfigTypeInfo {
  name: string;
  icon: LucideIcon;
  color: string;
}

// Config type definitions with icons and colors
export const configTypes: Record<string, ConfigTypeInfo> = {
  app: { name: "App", icon: Package, color: "text-purple-600" },
  workspace: { name: "Workspace", icon: Layers, color: "text-blue-600" },
  space: { name: "Space", icon: Grid, color: "text-green-600" },
  view: { name: "View", icon: Grid, color: "text-yellow-600" },
  page: { name: "Page", icon: File, color: "text-orange-600" },
  sort: { name: "Sort Config", icon: Settings, color: "text-gray-600" },
  filter: { name: "Filter Config", icon: Filter, color: "text-cyan-600" },
  fields: { name: "Fields Config", icon: List, color: "text-indigo-600" },
  tab: { name: "Tab", icon: Layers, color: "text-pink-600" },
};

// Child type mappings
export const childTypeMapping: Record<string, string[]> = {
  app: ["workspace"],
  workspace: ["space"],
  space: ["view", "page"],
  view: ["fields", "sort", "filter"],
  page: ["fields", "tab"],
  tab: ["fields"],
};

// Get available child types for a parent type
export function getAvailableChildTypes(parentType: string): string[] {
  return childTypeMapping[parentType] || [];
}

// Get template type from config
export function getConfigType(config: BaseConfig): string {
  return config.type;
}