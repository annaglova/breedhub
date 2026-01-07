import React from 'react';
import { OverviewTab } from './tabs';
import { ContactGeneralTab } from '../contact/tabs/ContactGeneralTab';

// Component registry for dynamic component loading
const componentRegistry = new Map<string, React.ComponentType<any>>();

export function registerComponent(name: string, component: React.ComponentType<any>) {
  componentRegistry.set(name, component);
}

// Register default tab components
registerComponent('OverviewTab', OverviewTab);
registerComponent('ContactGeneralTab', ContactGeneralTab);

export function getComponent(name: string): React.ComponentType<any> | undefined {
  return componentRegistry.get(name);
}

export function hasComponent(name: string): boolean {
  return componentRegistry.has(name);
}

// Get all registered component names
export function getRegisteredComponents(): string[] {
  return Array.from(componentRegistry.keys());
}

// Clear all registrations (useful for testing)
export function clearRegistry() {
  componentRegistry.clear();
}

// Default fallback component - will be replaced after registration
export let FallbackComponent: React.ComponentType<any> = ({ entity }) => (
  <div className="p-4 border rounded">
    <p className="text-slate-500">Component not found</p>
    <pre className="text-xs mt-2">{JSON.stringify(entity, null, 2)}</pre>
  </div>
);

// Set a better fallback component if available
export function setFallbackComponent(component: React.ComponentType<any>) {
  FallbackComponent = component;
}