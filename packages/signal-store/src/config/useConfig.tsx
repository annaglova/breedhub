/**
 * React Hooks for Local Configuration Management
 * Works with local Supabase and Windmill instead of Edge Functions
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import type {
  AppConfig,
  ConfigContext,
  ConfigIdentifier,
  ConfigChangeEvent,
  UseConfigResult,
  ConfigScope,
  ConfigLoadOptions,
} from './types';

// Initialize Supabase client for local instance
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'http://dev.dogarray.com:8020';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';
const WINDMILL_URL = process.env.VITE_WINDMILL_URL || 'http://dev.dogarray.com:8000';
const WINDMILL_WORKSPACE = process.env.VITE_WINDMILL_WORKSPACE || 'breedhub';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================================================
// Windmill API Helper
// ============================================================================

async function callWindmillMerge(configs: any[]): Promise<any> {
  try {
    const response = await fetch(
      `${WINDMILL_URL}/api/w/${WINDMILL_WORKSPACE}/jobs/run/f/common/config_merge`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          configs: configs.map((c, index) => ({
            id: c.id,
            priority: index,
            base_config: c.base_config || {},
            overrides: c.overrides || {}
          })),
          strategy: 'deep',
          track_conflicts: true
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Windmill error: ${response.statusText}`);
    }

    const result = await response.json();
    return result.merged || {};
  } catch (error) {
    console.warn('Windmill merge failed, using local fallback:', error);
    
    // Fallback to simple local merge
    let merged = {};
    for (const config of configs) {
      merged = {
        ...merged,
        ...config.base_config,
        ...config.overrides
      };
    }
    return merged;
  }
}

// ============================================================================
// Cache Management (same as before)
// ============================================================================

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
}

class ConfigCache {
  private static instance: ConfigCache;
  private cache = new Map<string, CacheEntry>();
  
  static getInstance(): ConfigCache {
    if (!ConfigCache.instance) {
      ConfigCache.instance = new ConfigCache();
    }
    return ConfigCache.instance;
  }
  
  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl * 1000) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }
  
  set(key: string, data: any, ttl = 3600): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }
  
  delete(key: string): void {
    this.cache.delete(key);
  }
  
  clear(): void {
    this.cache.clear();
  }
}

const cache = ConfigCache.getInstance();

// ============================================================================
// Main Hook: useConfig (adapted for local)
// ============================================================================

export function useConfig(
  scope: ConfigScope,
  scopeId?: string,
  options: ConfigLoadOptions = {}
): UseConfigResult {
  const [config, setConfig] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const subscriptionRef = useRef<any>(null);
  
  const cacheKey = useMemo(() => 
    `${scope}${scopeId ? `.${scopeId}` : ''}`,
    [scope, scopeId]
  );
  
  // Load configuration
  const loadConfig = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Check cache first
      if (options.cacheStrategy !== 'none') {
        const cached = cache.get(cacheKey);
        if (cached) {
          setConfig(cached);
          setLoading(false);
          return;
        }
      }
      
      // Build query
      let query = supabase
        .from('app_config')
        .select('*');
      
      // Add filters
      query = query
        .eq('scope', scope)
        .eq('is_active', true);
      
      if (scopeId) {
        query = query.eq('scope_id', scopeId);
      } else {
        query = query.is('scope_id', null);
      }
      
      // Execute query
      const { data, error: fetchError } = await query.single();
      
      if (fetchError) {
        // If not found, create default config
        if (fetchError.code === 'PGRST116') {
          const defaultConfig = await createDefaultConfig(scope, scopeId);
          setConfig(defaultConfig);
          cache.set(cacheKey, defaultConfig);
          return;
        }
        throw new Error(`Failed to load config: ${fetchError.message}`);
      }
      
      // Use computed_config which includes merged values
      const configData = data?.computed_config || {};
      
      // Cache the result
      cache.set(cacheKey, configData, data?.cache_ttl || 3600);
      
      setConfig(configData);
    } catch (err) {
      setError(err as Error);
      console.error('Error loading config:', err);
    } finally {
      setLoading(false);
    }
  }, [scope, scopeId, cacheKey, options.cacheStrategy]);
  
  // Create default config if not exists
  const createDefaultConfig = async (scope: ConfigScope, scopeId?: string) => {
    const key = scopeId ? `${scope}.${scopeId}` : scope;
    const defaultConfig = getDefaultConfigForScope(scope);
    
    const { error } = await supabase
      .from('app_config')
      .insert({
        key,
        scope,
        scope_id: scopeId,
        base_config: defaultConfig,
        computed_config: defaultConfig
      });
    
    if (error) {
      console.error('Failed to create default config:', error);
    }
    
    return defaultConfig;
  };
  
  // Get default config based on scope
  const getDefaultConfigForScope = (scope: ConfigScope) => {
    switch (scope) {
      case 'global':
        return {
          app_name: 'BreedHub',
          version: '1.0.0',
          features: {
            multistore: true,
            dynamic_schemas: true
          }
        };
      case 'workspace':
        return {
          settings: {
            theme: 'light',
            notifications: true
          }
        };
      case 'space':
        return {
          view_mode: 'list',
          filters_visible: true
        };
      default:
        return {};
    }
  };
  
  // Reload configuration
  const reload = useCallback(async () => {
    cache.delete(cacheKey);
    await loadConfig();
  }, [cacheKey, loadConfig]);
  
  // Update configuration value
  const update = useCallback(async (path: string, value: any) => {
    try {
      // Update local state optimistically
      setConfig(prev => {
        if (!prev) return prev;
        
        const updated = { ...prev };
        const keys = path.split('.');
        let current: any = updated;
        
        for (let i = 0; i < keys.length - 1; i++) {
          if (!(keys[i] in current)) {
            current[keys[i]] = {};
          }
          current = current[keys[i]];
        }
        
        current[keys[keys.length - 1]] = value;
        
        // Update cache
        cache.set(cacheKey, updated);
        
        return updated;
      });
      
      // Find or create the config record
      let { data: configRecord } = await supabase
        .from('app_config')
        .select('id, overrides')
        .eq('scope', scope)
        .eq('scope_id', scopeId || '')
        .single();
      
      if (!configRecord) {
        // Create new config
        const { data: newConfig } = await supabase
          .from('app_config')
          .insert({
            key: scopeId ? `${scope}.${scopeId}` : scope,
            scope,
            scope_id: scopeId,
            base_config: {},
            overrides: { [path]: value }
          })
          .select()
          .single();
        
        configRecord = newConfig;
      } else {
        // Update existing config
        const newOverrides = { ...configRecord.overrides };
        const keys = path.split('.');
        let current: any = newOverrides;
        
        for (let i = 0; i < keys.length - 1; i++) {
          if (!(keys[i] in current)) {
            current[keys[i]] = {};
          }
          current = current[keys[i]];
        }
        
        current[keys[keys.length - 1]] = value;
        
        // Save to database
        await supabase
          .from('app_config')
          .update({ overrides: newOverrides })
          .eq('id', configRecord.id);
      }
      
    } catch (err) {
      console.error('Error updating config:', err);
      setError(err as Error);
      // Reload to get correct state
      await reload();
    }
  }, [scope, scopeId, cacheKey, reload]);
  
  // Subscribe to changes
  const subscribe = useCallback((callback: (event: ConfigChangeEvent) => void) => {
    const channel = supabase
      .channel(`config-${cacheKey}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'app_config',
        filter: `scope=eq.${scope}${scopeId ? `,scope_id=eq.${scopeId}` : ''}`
      }, (payload: any) => {
        const event: ConfigChangeEvent = {
          type: payload.eventType === 'INSERT' ? 'create' :
                payload.eventType === 'UPDATE' ? 'update' : 'delete',
          config: payload.new || payload.old,
          previousConfig: payload.old,
          timestamp: new Date(),
        };
        
        // Invalidate cache and reload
        cache.delete(cacheKey);
        loadConfig();
        
        callback(event);
      })
      .subscribe();
    
    return () => {
      channel.unsubscribe();
    };
  }, [scope, scopeId, cacheKey, loadConfig]);
  
  // Load on mount
  useEffect(() => {
    loadConfig();
    
    // Set up real-time subscription
    const channel = supabase
      .channel(`config-auto-${cacheKey}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'app_config',
        filter: `scope=eq.${scope}${scopeId ? `,scope_id=eq.${scopeId}` : ''}`
      }, () => {
        reload();
      })
      .subscribe();
    
    subscriptionRef.current = channel;
    
    return () => {
      channel.unsubscribe();
    };
  }, [scope, scopeId, cacheKey, loadConfig, reload]);
  
  return {
    config,
    loading,
    error,
    reload,
    update,
    subscribe
  };
}

// ============================================================================
// Hierarchical Config Hook with Windmill
// ============================================================================

export function useHierarchicalConfig(context: ConfigContext): UseConfigResult {
  const [config, setConfig] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const loadHierarchy = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Build hierarchy keys
      const keys: string[] = ['global'];
      
      if (context.workspaceId) {
        keys.push(`workspace.${context.workspaceId}`);
      }
      
      if (context.spaceId) {
        keys.push(`space.${context.spaceId}`);
      }
      
      if (context.viewId) {
        keys.push(`view.${context.viewId}`);
      }
      
      if (context.userId) {
        keys.push(`user.${context.userId}`);
      }
      
      // Load all configs in hierarchy
      const { data: configs, error: fetchError } = await supabase
        .from('app_config')
        .select('*')
        .in('key', keys)
        .eq('is_active', true)
        .order('scope', { ascending: true });
      
      if (fetchError) {
        throw new Error(`Failed to load configs: ${fetchError.message}`);
      }
      
      // Merge using Windmill or fallback
      const merged = await callWindmillMerge(configs || []);
      
      setConfig(merged);
    } catch (err) {
      setError(err as Error);
      console.error('Error loading hierarchical config:', err);
    } finally {
      setLoading(false);
    }
  }, [context]);
  
  useEffect(() => {
    loadHierarchy();
  }, [loadHierarchy]);
  
  const reload = useCallback(async () => {
    await loadHierarchy();
  }, [loadHierarchy]);
  
  const update = useCallback(async (path: string, value: any) => {
    // For hierarchical configs, update at the most specific level
    const scope = context.userId ? 'user' :
                  context.viewId ? 'view' :
                  context.spaceId ? 'space' :
                  context.workspaceId ? 'workspace' : 'global';
    
    const scopeId = context.userId || context.viewId || context.spaceId || context.workspaceId;
    
    // Use the regular update logic
    const { error: updateError } = await supabase
      .from('app_config')
      .update({
        overrides: { [path]: value }
      })
      .eq('scope', scope)
      .eq('scope_id', scopeId || '');
    
    if (updateError) {
      console.error('Error updating config:', updateError);
    }
    
    // Reload to get updated merged config
    await reload();
  }, [context, reload]);
  
  const subscribe = useCallback((callback: (event: ConfigChangeEvent) => void) => {
    // Subscribe to all levels in hierarchy
    const channels: any[] = [];
    
    ['global', 'workspace', 'space', 'view', 'user'].forEach(scope => {
      const channel = supabase
        .channel(`config-hier-${scope}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'app_config',
          filter: `scope=eq.${scope}`
        }, (payload: any) => {
          const event: ConfigChangeEvent = {
            type: payload.eventType === 'INSERT' ? 'create' :
                  payload.eventType === 'UPDATE' ? 'update' : 'delete',
            config: payload.new || payload.old,
            previousConfig: payload.old,
            timestamp: new Date(),
            context
          };
          
          callback(event);
          reload();
        })
        .subscribe();
      
      channels.push(channel);
    });
    
    return () => {
      channels.forEach(ch => ch.unsubscribe());
    };
  }, [context, reload]);
  
  return {
    config,
    loading,
    error,
    reload,
    update,
    subscribe
  };
}