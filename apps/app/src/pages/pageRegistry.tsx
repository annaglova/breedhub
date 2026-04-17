import React from 'react';

type RegisteredPageComponent = React.ComponentType<any>;

function RouteFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
    </div>
  );
}

function lazyRegisteredPage(
  loader: () => Promise<{ default: React.ComponentType<any> }>
): RegisteredPageComponent {
  const LazyComponent = React.lazy(loader);

  return function RegisteredLazyPage(props: any) {
    return (
      <React.Suspense fallback={<RouteFallback />}>
        <LazyComponent {...props} />
      </React.Suspense>
    );
  };
}

/**
 * Page component registry for tool pages (non-entity workspaces)
 *
 * Maps component names from app_config to actual React components.
 * Used by AppRouter to dynamically create routes for workspace pages.
 */
const pageRegistry = new Map<string, RegisteredPageComponent>();

export function registerPage(name: string, component: RegisteredPageComponent) {
  pageRegistry.set(name, component);
}

export function getPage(name: string): RegisteredPageComponent | undefined {
  return pageRegistry.get(name);
}

export function hasPage(name: string): boolean {
  return pageRegistry.has(name);
}

// Register tool pages
registerPage('MatingPage', lazyRegisteredPage(() =>
  import('./MatingPage').then((module) => ({ default: module.MatingPage }))
));
registerPage('BillingPage', lazyRegisteredPage(() =>
  import('./BillingPage').then((module) => ({ default: module.BillingPage }))
));
registerPage('ReferralPage', lazyRegisteredPage(() =>
  import('./ReferralPage').then((module) => ({ default: module.ReferralPage }))
));
registerPage('GiftPage', lazyRegisteredPage(() =>
  import('./GiftPage').then((module) => ({ default: module.GiftPage }))
));
registerPage('WelcomePage', lazyRegisteredPage(() =>
  import('./WelcomePage').then((module) => ({ default: module.WelcomePage }))
));

// Fallback component for unknown pages
export const PageNotFound: React.FC<{ componentName?: string }> = ({ componentName }) => (
  <div className="flex items-center justify-center h-full">
    <div className="text-center p-8">
      <p className="text-slate-500">Page component not found</p>
      {componentName && (
        <p className="text-xs text-slate-400 mt-2">
          Component: {componentName}
        </p>
      )}
    </div>
  </div>
);
