# Windmill + Supabase Integration Setup

## Архітектура інтеграції

У вашій системі:
- **Windmill** має доступ до **Supabase** (через resource connection)
- **Supabase** викликає **Windmill** скрипти через `http_post`
- Токени не потрібні (або налаштовані на рівні Windmill)

## Покрокова інструкція

### 1. Запустіть SQL міграції

```bash
# Підключіться до локального Supabase
psql -h dev.dogarray.com -p 5432 -U postgres -d postgres

# Виконайте міграції по черзі:
\i /path/to/001_create_config_tables.sql
\i /path/to/002_windmill_integration.sql
```

### 2. Перевірте роботу Windmill

```sql
-- Тест з'єднання з Windmill
SELECT test_windmill_connection();
-- Має повернути: 'SUCCESS: Windmill integration working'
```

### 3. Створіть/оновіть Windmill скрипт

У Windmill проекті файл `f/common/config_merge.deno.ts` вже створений і підтримує:
- Старий формат: `deps_data`, `self_data`, `override_data`
- Новий формат: `configs[]` з пріоритетами

### 4. Використання в React

```typescript
// Імпортуйте hooks
import { useConfig, useHierarchicalConfig } from '@/packages/signal-store/src/config/useConfig';

// Для одного рівня
function MyComponent() {
  const { config, loading, update } = useConfig('workspace', 'ws-123');
  
  if (loading) return <div>Loading...</div>;
  
  return (
    <div>
      <h1>{config?.name || 'Default Workspace'}</h1>
      <button onClick={() => update('theme', 'dark')}>
        Switch to Dark Theme
      </button>
    </div>
  );
}

// Для ієрархії
function MyApp() {
  const { config } = useHierarchicalConfig({
    workspaceId: 'ws-123',
    spaceId: 'space-breeds'
  });
  
  // config містить змержені налаштування з усіх рівнів
  return <div style={{ theme: config?.theme }}>...</div>;
}
```

## Як працює система

### 1. При завантаженні конфігурації:
```
React Component 
  → useConfig hook
  → Supabase query (app_config table)
  → computed_config (вже змержений)
```

### 2. При оновленні конфігурації:
```
React update() 
  → Supabase UPDATE 
  → Trigger compute_merged_config()
  → PostgreSQL http_post to Windmill
  → Windmill merge logic
  → Result saved to computed_config
```

### 3. Real-time sync:
```
Supabase Realtime 
  → React subscription
  → Auto reload on changes
```

## Перевірка роботи системи

### 1. Створіть тестовий workspace:

```sql
INSERT INTO app_config (key, scope, scope_id, base_config)
VALUES (
  'workspace.test',
  'workspace',
  'test',
  '{"name": "Test Workspace", "theme": "light"}'::jsonb
);
```

### 2. Перевірте computed_config:

```sql
SELECT key, computed_config 
FROM app_config 
WHERE key = 'workspace.test';
-- Має показати змержену конфігурацію
```

### 3. Створіть дочірній space:

```sql
INSERT INTO app_config (key, scope, scope_id, parent_id, base_config)
VALUES (
  'space.breeds',
  'space', 
  'breeds',
  (SELECT id FROM app_config WHERE key = 'workspace.test'),
  '{"collection": "breeds", "view_mode": "grid"}'::jsonb
);
```

### 4. Перевірте наслідування:

```sql
SELECT key, computed_config 
FROM app_config 
WHERE key = 'space.breeds';
-- Має містити theme з workspace + свої налаштування
```

## Troubleshooting

### Якщо Windmill недоступний:
- SQL функції мають fallback на простий merge (`||` оператор)
- Система продовжить працювати, але без складної логіки злиття

### Якщо computed_config пустий:
1. Перевірте чи працює trigger:
```sql
SELECT * FROM pg_trigger WHERE tgname = 'compute_config_on_change';
```

2. Спробуйте ручний виклик:
```sql
UPDATE app_config 
SET computed_config = compute_merged_config(id)
WHERE key = 'your-key';
```

### Логування для debug:
```sql
-- Додайте логування в функцію
CREATE OR REPLACE FUNCTION compute_merged_config(config_id UUID)
RETURNS JSONB AS $$
BEGIN
  RAISE NOTICE 'Computing config for %', config_id;
  -- ... решта коду
END;
$$ LANGUAGE plpgsql;
```

## Переваги цього підходу

1. **Без токенів** - не потрібно зберігати секрети в SQL
2. **Fallback** - працює навіть якщо Windmill недоступний
3. **Кешування** - computed_config зберігається в БД
4. **Real-time** - автоматичні оновлення через Supabase Realtime
5. **Простота** - React компоненти не знають про Windmill