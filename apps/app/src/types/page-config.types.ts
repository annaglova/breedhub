// Page configuration types for dynamic rendering

export type PageType = 'view' | 'edit' | 'create';

export interface BlockConfig {
  component: string;
  outlet?: string;
  type?: string;
  order?: number;
  [key: string]: any;
}

export interface PageConfig {
  component: 'PublicPageTemplate' | 'EditPageTemplate';
  pageType?: PageType;
  isDefault?: boolean;
  menus?: Record<string, any>;
  blocks: Record<string, BlockConfig>;
}
