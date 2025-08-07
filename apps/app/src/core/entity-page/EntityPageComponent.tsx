import React, { useRef, useEffect, useState } from 'react';
import { cn } from '@ui/lib/utils';
import { useEntityPage } from './EntityPageContext';
import { Button } from '@ui/components/button';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function EntityPageComponent() {
  const { entity, isLoading, error, config, activeTab, setActiveTab } = useEntityPage();
  const [isTabsSticky, setIsTabsSticky] = useState(false);
  const tabsRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Handle tabs sticky behavior
  useEffect(() => {
    const handleScroll = () => {
      if (tabsRef.current) {
        const rect = tabsRef.current.getBoundingClientRect();
        setIsTabsSticky(rect.top <= 0);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (error || !entity) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-red-600">Failed to load {config.entityName}</div>
      </div>
    );
  }

  const HeaderComponent = config.headerComponent;
  const AchievementsComponent = config.achievementsComponent;
  const activeTabConfig = config.tabs.find(tab => tab.fragment === activeTab);
  const ActiveTabComponent = activeTabConfig?.component;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Back button */}
      <div className="container mx-auto px-4 py-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>
      </div>

      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4">
          <HeaderComponent entity={entity} />
        </div>
      </div>

      {/* Achievements/Quick Info */}
      {AchievementsComponent && (
        <div className="bg-white border-b">
          <div className="container mx-auto px-4 py-6">
            <AchievementsComponent entity={entity} />
          </div>
        </div>
      )}

      {/* Tabs */}
      <div 
        ref={tabsRef}
        className={cn(
          "bg-white border-b sticky top-0 z-20 transition-shadow",
          isTabsSticky && "shadow-md"
        )}
      >
        <div className="container mx-auto px-4">
          <nav className="flex overflow-x-auto scrollbar-hide -mb-px">
            {config.tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.fragment)}
                  className={cn(
                    "flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 whitespace-nowrap transition-colors",
                    activeTab === tab.fragment
                      ? "text-primary-600 border-primary-600"
                      : "text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300"
                  )}
                >
                  {Icon && <Icon className="h-4 w-4" />}
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="container mx-auto px-4 py-8">
        {ActiveTabComponent && <ActiveTabComponent entity={entity} />}
      </div>
    </div>
  );
}