import React, { createContext, useContext } from 'react';
import { SpaceConfig } from '@/core/space/types';
import { SpaceStoreState } from '@/stores/createSpaceStore';

interface SpaceContextValue<T> {
  config: SpaceConfig<T>;
  store: SpaceStoreState<T>;
}

const SpaceContext = createContext<SpaceContextValue<any> | null>(null);

export function SpaceProvider<T>({ 
  children, 
  config, 
  store 
}: { 
  children: React.ReactNode;
  config: SpaceConfig<T>;
  store: SpaceStoreState<T>;
}) {
  return (
    <SpaceContext.Provider value={{ config, store }}>
      {children}
    </SpaceContext.Provider>
  );
}

export function useSpaceContext<T>() {
  const context = useContext(SpaceContext);
  if (!context) {
    throw new Error('useSpaceContext must be used within SpaceProvider');
  }
  return context as SpaceContextValue<T>;
}