# 📋 Інструкція для тестування каскаду

## 🔄 Повний цикл регенерації конфігурацій

### Крок 1: Згенерувати semantic tree
```bash
cd apps/config-admin
node scripts/analyze-fields.cjs
```
Це аналізує всі entity JSON файли та створює semantic-tree.json

### Крок 2: Згенерувати SQL та запустити каскад
```bash
node scripts/generate-sql-inserts.cjs
```
Коли з'явиться питання "Do you want to insert these records to Supabase? (y/n)"
Відповідай **y** щоб:
- Вставити записи в базу даних
- Автоматично запустити каскадні оновлення
- Перебудувати ієрархію

### Крок 3: Перевірити результат (опціонально)
```bash
node scripts/check-cascade.cjs
```

## 🧪 Тестування каскаду вручну

### Тест 1: Змінити поле та запустити каскад
```bash
# Змінити конкретне поле (наприклад breed_field_account_id)
node -e "
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_KEY);
(async () => {
  await supabase.from('app_config').update({
    override_data: {test: Date.now()}
  }).eq('id', 'breed_field_account_id');
  console.log('Field updated');
})();"

# Запустити каскад для цього поля
node scripts/cascading-updates-v3.cjs update breed_field_account_id
```

### Тест 2: Перевірити секційовану структуру
```bash
node -e "
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_KEY);
(async () => {
  const { data } = await supabase
    .from('app_config')
    .select('id, self_data')
    .eq('type', 'page')
    .limit(1)
    .single();
  
  if (data?.self_data?.fields) {
    console.log('✅ Page має секцію fields');
  } else {
    console.log('❌ Page не має секції fields');
  }
})();"
```

## 🔧 Додаткові команди

### Перебудувати всю ієрархію
```bash
node scripts/rebuild-hierarchy.cjs full
```

### Перебудувати після зміни конкретного config
```bash
node scripts/rebuild-hierarchy.cjs after <config_id>
```

### Перевірити з'єднання з базою даних
```bash
node scripts/check-db.cjs
```

## ⚠️ Важливо знати

1. **Каскад НЕ запускається автоматично** при зміні полів в базі даних
2. **Каскад запускається тільки** через:
   - `generate-sql-inserts.cjs` (при вставці в БД)
   - `cascading-updates-v3.cjs update <id>` (вручну)
3. **override_data завжди зберігається** при регенерації
4. **Секційована структура** створюється тільки для grouping configs (fields, sort, filter)

## 🎯 Що має бути в результаті

Після успішного каскаду, page/space/workspace/app configs мають містити:
```json
{
  "self_data": {
    "fields": {
      // дані від fields config
    },
    "sort_fields": {
      // дані від sort config
    },
    "filter_fields": {
      // дані від filter config
    }
  }
}
```

## 🐛 Якщо щось не працює

1. Перевір що ти в правильній директорії: `apps/config-admin`
2. Перевір що є файл `.env` з ключами Supabase
3. Спробуй запустити `npm install` якщо модулі не знайдені
4. Подивись логи в консолі - вони покажуть що відбувається