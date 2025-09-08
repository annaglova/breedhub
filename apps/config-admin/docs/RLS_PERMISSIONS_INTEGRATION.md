# RLS Permissions Integration Guide

## Огляд

Інтеграція RLS (Row Level Security) політик Supabase з системою генерації конфігурацій дозволяє автоматично визначати права доступу на основі реальних політик безпеки бази даних.

## Компоненти

### 1. Існуюча SQL Функція `get_table_policies`

Функція вже існує в базі даних і використовує `pg_policies` view:

```sql
-- Функція приймає параметр tablename
-- Повертає JSON об'єкт з полями:
{
  "rls_enabled": boolean,  -- чи включений RLS для таблиці
  "policies": [            -- масив політик з pg_policies
    {
      "schemaname": "public",
      "tablename": "table_name",
      "policyname": "policy_name",
      "permissive": "PERMISSIVE" | "RESTRICTIVE",
      "roles": ["role1", "role2"],  -- масив ролей
      "cmd": "SELECT" | "INSERT" | "UPDATE" | "DELETE" | "ALL",
      "qual": "expression",          -- умова для читання
      "with_check": "expression"     -- умова для запису
    }
  ]
}
```

### 2. Скрипт генерації з підтримкою RLS

```bash
# Використання нового скрипта
node scripts/generate-entity-configs-with-rls.cjs

# Для дебагу RLS парсингу
DEBUG_RLS=true node scripts/generate-entity-configs-with-rls.cjs
```

### 3. Маппінг RLS → Permissions

#### Стандартні патерни які розпізнаються:

**Для читання (SELECT):**
- `true` або відсутність умови → `["*"]` (публічний доступ)
- `auth.uid() IS NOT NULL` → `["authenticated"]`
- `auth.uid() = user_id` → `["owner"]`
- `auth.jwt() ->> 'role' = 'admin'` → `["admin"]`

**Для запису (INSERT/UPDATE/DELETE):**
- Системні поля → `["system"]`
- `auth.uid() = user_id` → `["owner"]`
- `auth.jwt() ->> 'role' IN ('admin', 'editor')` → `["admin", "editor"]`

## Приклади RLS політик

### 1. Публічне читання, авторизований запис

```sql
-- Політика для публічного читання
CREATE POLICY "Public read access" ON breed
  FOR SELECT USING (true);

-- Політика для запису тільки адмінами
CREATE POLICY "Admin write access" ON breed
  FOR ALL USING (
    auth.jwt() ->> 'role' = 'admin'
  );
```

Результат в permissions:
```json
{
  "read": ["*"],
  "write": ["admin"]
}
```

### 2. Власник може редагувати свої записи

```sql
CREATE POLICY "Users can update own records" ON contact
  FOR UPDATE USING (
    auth.uid() = user_id
  );
```

Результат:
```json
{
  "read": ["authenticated"],
  "write": ["owner"]
}
```

### 3. Ролі з різними правами

```sql
-- Читання для всіх авторизованих
CREATE POLICY "Authenticated read" ON pet
  FOR SELECT USING (
    auth.uid() IS NOT NULL
  );

-- Запис для редакторів та адмінів
CREATE POLICY "Editor write" ON pet
  FOR ALL USING (
    auth.jwt() ->> 'role' IN ('admin', 'editor', 'moderator')
  );
```

Результат:
```json
{
  "read": ["authenticated"],
  "write": ["admin", "editor", "moderator"]
}
```

## Fallback логіка

Якщо RLS політики відсутні або не можуть бути прочитані:

1. **Системні поля** (`id`, `created_at`, etc.):
   - read: `["*"]`
   - write: `["system"]`

2. **Звичайні поля**:
   - read: `["*"]`
   - write: `["admin", "editor"]`

## Розширення системи

### Додавання нових патернів

В функції `extractPermissionsFromPolicies`:

```javascript
// Додайте новий патерн
if (policy.qual && policy.qual.includes('your_custom_check')) {
  permissions.read.push("custom_role");
}
```

### Column-level permissions

Система підтримує перевірку згадок колонок в політиках:

```javascript
const columnPerms = checkColumnLevelPermissions(policies, fieldName);
if (columnPerms.hasSpecificPolicy) {
  // Використовуємо специфічні права для колонки
}
```

## Тестування

1. Створіть тестові RLS політики:
```sql
-- Тестова політика
CREATE POLICY "test_policy" ON your_table
  FOR SELECT USING (true);
```

2. Запустіть генератор:
```bash
DEBUG_RLS=true node scripts/generate-entity-configs-with-rls.cjs
```

3. Перевірте згенеровані permissions в JSON файлах

## Міграція

Для переходу на RLS-based permissions:

1. Створіть SQL функцію `get_table_policies`
2. Замініть `generate-entity-configs.cjs` на `generate-entity-configs-with-rls.cjs`
3. Перегенеруйте всі конфігурації
4. Перевірте що permissions відповідають очікуванням

## Відомі обмеження

1. **Складні умови** - деякі складні SQL вирази можуть не розпізнаватись автоматично
2. **Dynamic roles** - ролі що визначаються в runtime можуть потребувати ручного налаштування
3. **Cross-table policies** - політики з JOIN не повністю підтримуються

## Рекомендації

1. Використовуйте стандартні патерни RLS для кращого розпізнавання
2. Документуйте нестандартні політики
3. Тестуйте permissions після кожної зміни RLS політик
4. Використовуйте DEBUG_RLS=true для діагностики