import React, { createContext, useContext, useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { EntityPageConfig, EntityPageContextValue } from './types';

const EntityPageContext = createContext<EntityPageContextValue<any> | null>(null);

export function EntityPageProvider<T extends { Id: string }>({ 
  children, 
  config 
}: { 
  children: React.ReactNode;
  config: EntityPageConfig<T>;
}) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [entity, setEntity] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  // Get active tab from URL fragment
  const fragment = location.hash.slice(1);
  const activeTab = fragment || config.tabs[0]?.fragment || '';

  const setActiveTab = (tab: string) => {
    navigate(`#${tab}`, { replace: true });
  };

  // Load entity
  useEffect(() => {
    if (!id) return;
    
    setIsLoading(true);
    setError(null);
    
    config.loadEntity(id)
      .then(setEntity)
      .catch(setError)
      .finally(() => setIsLoading(false));
  }, [id, config]);

  // Set default tab if none specified
  useEffect(() => {
    if (!fragment && config.tabs.length > 0) {
      setActiveTab(config.tabs[0].fragment);
    }
  }, [fragment, config.tabs]);

  const value: EntityPageContextValue<T> = {
    entity,
    isLoading,
    error,
    config,
    activeTab,
    setActiveTab
  };

  return (
    <EntityPageContext.Provider value={value}>
      {children}
    </EntityPageContext.Provider>
  );
}

export function useEntityPage<T>() {
  const context = useContext(EntityPageContext);
  if (!context) {
    throw new Error('useEntityPage must be used within EntityPageProvider');
  }
  return context as EntityPageContextValue<T>;
}