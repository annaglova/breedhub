import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@ui/lib/utils';
import { NameContainerOutlet } from './NameContainerOutlet';
import { BreedNameComponent } from '@/domain/breed/BreedNameComponent';
import { spaceStore } from '@breedhub/rxdb-store';
import { useSignals } from '@preact/signals-react/runtime';
import { getComponent } from '@/components/space/componentRegistry';

interface PageTemplateV3Props {
  className?: string;
  isDrawerMode?: boolean;
}

/**
 * PageTemplateV3 - Universal config-driven page template
 *
 * Based on Angular PageTemplateV3Component
 * Supports drawer and fullscreen modes with dynamic tab rendering
 */
export function PageTemplateV3({ className, isDrawerMode = false }: PageTemplateV3Props) {
  useSignals();

  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('overview');

  // Get entity from store (reactive!)
  // For now hardcoded to breed, later will be dynamic based on entity type
  const entitySignal = spaceStore.getSelectedEntity('breed');
  const entity = entitySignal.value;

  // TODO: Get tabs from config
  // For now, hardcoded tabs
  const tabs = [
    { id: 'overview', label: 'Overview', component: 'OverviewTab' },
    { id: 'details', label: 'Details', component: 'DetailsTab' },
  ];

  console.log('[PageTemplateV3] Render:', {
    isDrawerMode,
    id,
    entity,
    activeTab
  });

  // Sync activeTab with URL hash (for drawer mode)
  useEffect(() => {
    if (isDrawerMode) {
      const hash = location.hash.slice(1);
      if (hash && tabs.some(tab => tab.id === hash)) {
        setActiveTab(hash);
      } else {
        setActiveTab('overview');
        navigate('#overview', { replace: true });
      }
    }
  }, [location.hash, isDrawerMode, navigate]);

  if (!entity) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  const handleTabChange = (newTabId: string) => {
    setActiveTab(newTabId);
    if (isDrawerMode) {
      navigate(`#${newTabId}`, { replace: true });
    }
  };

  // Get active tab component
  const activeTabConfig = tabs.find(tab => tab.id === activeTab);
  const TabComponent = activeTabConfig
    ? getComponent(activeTabConfig.component)
    : null;

  // Визначаємо який name компонент використовувати (поки що тільки для breed)
  const NameComponent = BreedNameComponent;

  return (
    <div className={cn(
      "size-full flex flex-col",
      isDrawerMode && "bg-white dark:bg-gray-900",
      className
    )}>
      <div className={cn(
        "flex flex-auto flex-col items-center",
        !isDrawerMode && "px-4 pt-4 sm:px-6 sm:pt-6"
      )}>
        <div className={cn(
          "w-full",
          !isDrawerMode && "max-w-3xl lg:max-w-4xl xxl:max-w-5xl"
        )}>
          {/* Name container outlet with the breed name component */}
          <NameContainerOutlet>
            <NameComponent />
          </NameContainerOutlet>

          {/* Tabs Navigation */}
          <div className="border-b bg-white dark:bg-gray-900">
            <nav className="flex overflow-x-auto scrollbar-hide">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors",
                    activeTab === tab.id
                      ? "text-primary-600 border-primary-600"
                      : "text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300"
                  )}
                >
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content Area */}
          <div className="flex-1">
            {TabComponent ? (
              <TabComponent
                entity={entity}
                mode={isDrawerMode ? 'drawer' : 'fullscreen'}
                recordsLimit={10}
              />
            ) : (
              <div className="p-6">
                <div className="text-center text-gray-500">
                  <p>Component "{activeTabConfig?.component}" not found</p>
                  <p className="text-sm mt-2">
                    Register it in componentRegistry.tsx
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}