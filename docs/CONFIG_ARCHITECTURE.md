# Dynamic Configuration Architecture for BreedHub

## Overview
Система динамічної конфігурації для BreedHub з підтримкою ієрархічного наслідування та lazy loading.

## Database Structure

### 1. Main Config Table (покращена версія)

```sql
-- Основна таблиця конфігурацій
CREATE TABLE public.app_config (
    -- Identifiers
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE, -- e.g., 'workspace.123', 'space.breeds', 'view.list'
    
    -- Hierarchy
    parent_id UUID REFERENCES app_config(id) ON DELETE CASCADE,
    scope TEXT NOT NULL, -- 'global', 'workspace', 'space', 'view', 'user'
    scope_id TEXT, -- ID конкретного workspace/space/view
    
    -- Configuration data
    base_config JSONB DEFAULT '{}', -- Базова конфігурація
    overrides JSONB DEFAULT '{}', -- Перевизначення
    computed_config JSONB DEFAULT '{}', -- Обчислений результат
    
    -- Metadata
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    -- Performance
    cache_ttl INTEGER DEFAULT 3600, -- TTL в секундах
    last_accessed TIMESTAMPTZ,
    access_count INTEGER DEFAULT 0
);

-- Індекси для швидкого пошуку
CREATE INDEX idx_config_scope ON app_config(scope, scope_id);
CREATE INDEX idx_config_parent ON app_config(parent_id);
CREATE INDEX idx_config_key ON app_config(key);
CREATE INDEX idx_config_active ON app_config(is_active) WHERE is_active = true;
```

### 2. Config Templates Table

```sql
-- Шаблони конфігурацій для різних типів entities
CREATE TABLE public.config_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    entity_type TEXT NOT NULL, -- 'workspace', 'space', 'breed', 'pet', etc.
    
    -- Template structure
    schema JSONB NOT NULL, -- JSON Schema для валідації
    default_config JSONB NOT NULL, -- Значення за замовчуванням
    ui_schema JSONB, -- Схема для генерації UI форм
    
    -- Permissions
    required_role TEXT[], -- Ролі які можуть використовувати шаблон
    
    -- Metadata
    description TEXT,
    category TEXT,
    tags TEXT[],
    is_system BOOLEAN DEFAULT false, -- Системний шаблон не можна видалити
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3. Config Dependencies Table

```sql
-- Явні залежності між конфігураціями
CREATE TABLE public.config_dependencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_id UUID REFERENCES app_config(id) ON DELETE CASCADE,
    depends_on_id UUID REFERENCES app_config(id) ON DELETE RESTRICT,
    dependency_type TEXT DEFAULT 'inherit', -- 'inherit', 'reference', 'compute'
    priority INTEGER DEFAULT 0, -- Пріоритет при злитті
    
    UNIQUE(config_id, depends_on_id)
);
```

## Configuration Hierarchy

```
global
  └── workspace
        ├── workspace_settings
        ├── space (breeds)
        │     ├── space_settings
        │     ├── view (list)
        │     │     └── view_settings
        │     └── entity_schemas
        │           ├── breed_schema
        │           └── custom_fields
        └── space (pets)
              └── ...
```

## Loading Strategies

### Strategy 1: Incremental Loading (Рекомендований)

```typescript
// Завантаження конфігурації по частинам
class ConfigLoader {
  private cache = new Map<string, CachedConfig>();
  
  // Завантажує тільки необхідні конфігурації
  async loadForContext(context: AppContext): Promise<Config> {
    const configs = await this.loadHierarchy([
      `global`,
      `workspace.${context.workspaceId}`,
      `space.${context.spaceId}`,
      `view.${context.viewId}`
    ]);
    
    return this.mergeConfigs(configs);
  }
  
  // Кешування з TTL
  private async loadWithCache(key: string): Promise<Config> {
    const cached = this.cache.get(key);
    if (cached && !this.isExpired(cached)) {
      return cached.config;
    }
    
    const config = await this.fetchConfig(key);
    this.cache.set(key, {
      config,
      timestamp: Date.now(),
      ttl: config.cache_ttl
    });
    
    return config;
  }
  
  // Підписка на зміни через Realtime
  subscribeToChanges(keys: string[], callback: (config: Config) => void) {
    return supabase
      .channel('config-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'app_config',
        filter: `key=in.(${keys.join(',')})`
      }, callback)
      .subscribe();
  }
}
```

### Strategy 2: Full Preload (для малих проектів)

```typescript
// Завантаження всієї конфігурації одразу
class ConfigPreloader {
  private fullConfig: Config | null = null;
  
  async preloadAll(): Promise<void> {
    const { data } = await supabase
      .from('app_config')
      .select(`
        *,
        parent:parent_id(*),
        dependencies:config_dependencies(
          depends_on:depends_on_id(*)
        )
      `)
      .eq('is_active', true);
    
    this.fullConfig = this.buildConfigTree(data);
  }
  
  getConfig(path: string): any {
    return this.resolvePath(this.fullConfig, path);
  }
}
```

## Config Merge Function (покращена)

```typescript
// Edge Function для злиття конфігурацій
export async function mergeConfigs(
  configs: ConfigData[],
  strategy: 'deep' | 'shallow' = 'deep'
): Promise<ConfigData> {
  // Сортуємо за пріоритетом
  const sorted = configs.sort((a, b) => a.priority - b.priority);
  
  // Базова конфігурація
  let result = {};
  
  for (const config of sorted) {
    if (strategy === 'deep') {
      result = deepMerge(result, config.base_config);
      result = deepMerge(result, config.overrides);
    } else {
      result = { ...result, ...config.base_config, ...config.overrides };
    }
  }
  
  return result;
}

// Розумне глибоке злиття
function deepMerge(target: any, source: any): any {
  if (!source) return target;
  
  const result = { ...target };
  
  for (const key in source) {
    if (source[key] === null) {
      // null видаляє значення
      delete result[key];
    } else if (Array.isArray(source[key])) {
      // Масиви замінюються, не мержаться
      result[key] = [...source[key]];
    } else if (typeof source[key] === 'object') {
      // Об'єкти мержаться рекурсивно
      result[key] = deepMerge(result[key] || {}, source[key]);
    } else {
      // Примітиви замінюються
      result[key] = source[key];
    }
  }
  
  return result;
}
```

## React Integration

```typescript
// React hook для роботи з конфігураціями
export function useConfig(scope: string, scopeId?: string) {
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const loader = new ConfigLoader();
    
    // Завантажуємо конфігурацію
    loader.loadForContext({ scope, scopeId })
      .then(setConfig)
      .finally(() => setLoading(false));
    
    // Підписуємося на зміни
    const subscription = loader.subscribeToChanges(
      [`${scope}.${scopeId}`],
      (newConfig) => setConfig(newConfig)
    );
    
    return () => subscription.unsubscribe();
  }, [scope, scopeId]);
  
  return { config, loading };
}

// Context для глобальної конфігурації
export const ConfigContext = React.createContext<ConfigContextValue>({
  config: {},
  updateConfig: () => {},
  reloadConfig: () => {}
});

// Provider компонент
export function ConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<Config>({});
  
  const updateConfig = useCallback(async (path: string, value: any) => {
    // Оновлюємо локально
    setConfig(prev => setValueByPath(prev, path, value));
    
    // Зберігаємо в БД
    await supabase.from('app_config').update({
      overrides: { [path]: value }
    }).eq('key', getCurrentConfigKey());
  }, []);
  
  return (
    <ConfigContext.Provider value={{ config, updateConfig }}>
      {children}
    </ConfigContext.Provider>
  );
}
```

## Dynamic Schema Example

```typescript
// Приклад динамічної схеми для custom entity
const customHealthCheckSchema = {
  entity_type: 'custom_health_check',
  extends: 'base_entity',
  
  fields: [
    {
      name: 'checkDate',
      type: 'date',
      required: true,
      ui: {
        label: 'Check Date',
        widget: 'date'
      }
    },
    {
      name: 'veterinarian',
      type: 'reference',
      validation: {
        referenceType: 'contact'
      },
      ui: {
        label: 'Veterinarian',
        widget: 'lookup'
      }
    },
    {
      name: 'results',
      type: 'json',
      ui: {
        label: 'Test Results',
        widget: 'json-editor'
      }
    }
  ],
  
  permissions: {
    create: ['owner', 'admin'],
    read: ['owner', 'admin', 'viewer'],
    update: ['owner', 'admin'],
    delete: ['admin']
  },
  
  ui: {
    icon: 'health',
    color: 'green',
    listColumns: ['checkDate', 'veterinarian', 'status'],
    searchFields: ['veterinarian', 'notes']
  }
};
```

## Performance Optimizations

### 1. Materialized Views для часто використовуваних конфігів

```sql
CREATE MATERIALIZED VIEW workspace_configs AS
SELECT 
  w.id as workspace_id,
  jsonb_build_object(
    'settings', w.computed_config,
    'spaces', jsonb_agg(s.computed_config)
  ) as full_config
FROM app_config w
LEFT JOIN app_config s ON s.parent_id = w.id AND s.scope = 'space'
WHERE w.scope = 'workspace'
GROUP BY w.id;

-- Оновлення кожні 5 хвилин
CREATE INDEX ON workspace_configs(workspace_id);
REFRESH MATERIALIZED VIEW CONCURRENTLY workspace_configs;
```

### 2. Redis Cache Layer

```typescript
// Redis для швидкого доступу
class ConfigCache {
  private redis: Redis;
  
  async get(key: string): Promise<Config | null> {
    const cached = await this.redis.get(`config:${key}`);
    return cached ? JSON.parse(cached) : null;
  }
  
  async set(key: string, config: Config, ttl = 3600): Promise<void> {
    await this.redis.setex(
      `config:${key}`,
      ttl,
      JSON.stringify(config)
    );
  }
  
  async invalidate(pattern: string): Promise<void> {
    const keys = await this.redis.keys(`config:${pattern}*`);
    if (keys.length) {
      await this.redis.del(...keys);
    }
  }
}
```

## Migration from Current Structure

```sql
-- Міграція з існуючої таблиці config
INSERT INTO app_config (key, base_config, scope, scope_id)
SELECT 
  id as key,
  self_data as base_config,
  CASE 
    WHEN type LIKE 'workspace%' THEN 'workspace'
    WHEN type LIKE 'space%' THEN 'space'
    ELSE 'global'
  END as scope,
  CASE 
    WHEN type LIKE '%_%' THEN split_part(type, '_', 2)
    ELSE NULL
  END as scope_id
FROM config;
```

## Benefits

1. **Гнучкість** - легко додавати нові типи конфігурацій
2. **Продуктивність** - lazy loading та кешування
3. **Масштабованість** - працює з великими обсягами конфігурацій
4. **Версіонування** - підтримка версій конфігурацій
5. **Realtime** - автоматичне оновлення при змінах
6. **Type Safety** - валідація через JSON Schema

## Recommended Approach

Для BreedHub рекомендую **Incremental Loading** тому що:
- Економить трафік та пам'ять
- Швидший початковий запуск
- Завантажує тільки необхідне
- Підтримує realtime оновлення
- Легко масштабується