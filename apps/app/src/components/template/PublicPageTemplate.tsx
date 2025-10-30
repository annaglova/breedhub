import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@ui/lib/utils';
import { NameContainerOutlet } from './NameContainerOutlet';
import { BreedNameComponent } from '@/domain/breed/BreedNameComponent';
import { spaceStore } from '@breedhub/rxdb-store';
import { useSignals } from '@preact/signals-react/runtime';
import { getComponent } from '@/components/space/componentRegistry';
import { getCoverComponent, CoverTypeIDs, NavigationButtons } from './cover';
import coverBackground from '@/assets/images/background-images/cover_background.png';

interface PublicPageTemplateProps {
  className?: string;
  isDrawerMode?: boolean;
}

/**
 * PublicPageTemplate - Config-driven public page template
 *
 * Динамічний рендеринг public pages з tabs
 * Supports drawer and fullscreen modes
 */
export function PublicPageTemplate({ className, isDrawerMode = false }: PublicPageTemplateProps) {
  useSignals();

  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('overview');

  // Get entity from store (reactive!)
  // For now hardcoded to breed, later will be dynamic based on entity type
  const entitySignal = spaceStore.getSelectedEntity('breed');
  const entity = entitySignal.value;

  // MOCK DATA for cover testing
  // TODO: Remove when real entity.Cover data is available
  const mockCover = {
    Type: {
      Id: CoverTypeIDs.BreedCoverV1,
    },
    AvatarUrl: coverBackground,
  };

  const mockBreed = {
    Id: 'mock-breed-1',
    Name: 'German Shepherd',
    TopPatrons: [
      {
        Id: '1',
        Contact: {
          Name: 'John Doe',
          Url: 'john-doe',
          AvatarUrl: 'https://i.pravatar.cc/150?img=12',
        },
        Place: 1,
        Rating: 100,
      },
      {
        Id: '2',
        Contact: {
          Name: 'Jane Smith',
          Url: 'jane-smith',
          AvatarUrl: 'https://i.pravatar.cc/150?img=47',
        },
        Place: 2,
        Rating: 90,
      },
      {
        Id: '3',
        Contact: {
          Name: 'Bob Johnson',
          Url: 'bob-johnson',
          AvatarUrl: 'https://i.pravatar.cc/150?img=33',
        },
        Place: 3,
        Rating: 80,
      },
    ],
  };

  // Get cover component based on type
  const coverTypeId = mockCover?.Type?.Id;
  const CoverComponent = getCoverComponent(coverTypeId);

  // TODO: Get tabs from config
  // For now, hardcoded tabs
  const tabs = [
    { id: 'overview', label: 'Overview', component: 'OverviewTab' },
    { id: 'details', label: 'Details', component: 'DetailsTab' },
  ];

  console.log('[PublicPageTemplate] Render:', {
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

  // Check if we're on a detail tab (not overview)
  const isDetailTab = activeTab !== 'overview';

  // Determine if we need full width (for pedigree or other wide-content tabs)
  const needsFullWidth = activeTab === 'pedigree';

  return (
    <div className={cn(
      "size-full flex flex-col",
      isDrawerMode && "bg-white dark:bg-gray-900",
      // Paddings: only when NOT on detail tab (regardless of drawer/fullscreen mode)
      // In Angular: !hasActiveDetail() - no check for drawer mode
      !isDetailTab && "content-padding",
      className
    )}>
      <div className="flex flex-auto flex-col items-center overflow-auto">
        <div className={cn(
          "w-full",
          // Max-width: standard for most content, full for pedigree
          !needsFullWidth && "max-w-3xl lg:max-w-4xl xxl:max-w-5xl",
          needsFullWidth && "max-w-full lg:max-w-full xxl:max-w-full"
        )}>
          {/* Cover Section - only show on overview tab (not on detail tabs) */}
          {!isDetailTab && (
            <div className="relative flex size-full justify-center overflow-hidden rounded-lg border border-gray-200 px-6 pt-4 shadow-sm sm:pb-3 sm:pt-6 h-64 md:h-80 lg:h-96 mb-6">
              {/* Top gradient overlay */}
              <div className="absolute top-0 z-10 h-28 w-full bg-gradient-to-b from-[#200e4c]/40 to-transparent"></div>

              {/* Cover component */}
              <div className="flex w-full max-w-3xl flex-col lg:max-w-4xl xxl:max-w-5xl">
                {/* Navigation buttons - on template level, above cover content */}
                <div className="z-20 flex w-full">
                  {/* Expand button (fullscreen) - show IN drawer mode to allow expanding */}
                  {isDrawerMode && (
                    <button
                      onClick={() => console.log('[TODO] Expand to fullscreen')}
                      title="Expand"
                      className="mr-auto hidden md:block"
                    >
                      <i className="pi pi-arrows-alt rotate-45 transform text-3xl text-white"></i>
                    </button>
                  )}

                  {/* Back/Navigate buttons */}
                  <NavigationButtons mode="white" className="sticky top-0 ml-auto" />
                </div>

                {/* Cover content - will have padding-top to avoid button overlap */}
                <CoverComponent
                  coverImg={mockCover.AvatarUrl}
                  isFullscreen={!isDrawerMode}
                  breed={mockBreed}
                />
              </div>
            </div>
          )}

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