# Аналіз порядку елементів у конфігах

## Поточна ситуація

### 1. Як зберігається порядок

**База даних:**
- Конфіги мають поле `deps` - масив ID залежностей
- Порядок елементів у масиві `deps` НЕ зберігається при запитах Supabase `.in()`
- Тест показав: Supabase повертає результати в довільному порядку (ймовірно, за ID)

**Код rebuild:**
```javascript
const menuItemIds = menuSection.deps || [];
const { data: menuItems } = await supabase
  .select('id, data')
  .in('id', menuItemIds);  // ⚠️ Порядок НЕ зберігається!

// Створення структури через for loop
for (const item of menuItems) {
  itemsData[item.id] = item.data;
}
```

**UI відображення:**
- Конфіги відображаються через `Object.entries()` або `Object.keys()`
- JavaScript ES2015+ **зберігає** порядок ключів об'єктів (insertion order)
- Тобто порядок у `itemsData` залежить від порядку loop, а не від deps

### 2. Проблема

Є два місця, де порядок може бути втрачений:

1. **При запиті з БД**: `.in('id', deps)` не зберігає порядок deps масиву
2. **При створенні об'єкта**: `for (const item of menuItems)` - порядок залежить від порядку в `menuItems`, а не від `deps`

### 3. Як зараз працює UI

В `AppConfig.tsx` (line 1128):
```tsx
{node.children.map((child) => renderConfigNode(child, level + 1, node.id))}
```

Порядок `node.children` визначається тим, як `buildConfigTree` створює дерево на основі `data` об'єкта.

## Рішення

### Опція 1: Сортувати результати після запиту (РЕКОМЕНДОВАНО)

**Переваги:**
- Deps масив повністю контролює порядок
- Простіше змінювати порядок (просто переставити елементи в deps)
- Не потрібні додаткові поля (position, order тощо)

**Реалізація:**

1. **Змінити rebuild-hierarchy.cjs** - додати сортування після кожного запиту:

```javascript
// Замість:
const { data: menuItems } = await supabase
  .select('id, data')
  .in('id', menuItemIds);

// Використовувати:
const { data: menuItems } = await supabase
  .select('id, data')
  .in('id', menuItemIds);

// Сортувати за порядком у deps
const sortedMenuItems = menuItemIds
  .map(id => menuItems.find(item => item.id === id))
  .filter(item => item !== undefined);
```

2. **Функція для реюзу:**

```javascript
function sortByDepsOrder(items, depsArray) {
  return depsArray
    .map(depId => items.find(item => item.id === depId))
    .filter(item => item !== undefined);
}
```

### Опція 2: Використовувати position поле

**Недоліки:**
- Додаткове поле в БД
- Треба синхронізувати position при додаванні/видаленні
- Складніше підтримувати

**НЕ РЕКОМЕНДОВАНО** (як ти правильно сказала)

## План реалізації

### Крок 1: Оновити rebuild-hierarchy.cjs

Додати утиліту для сортування та використовувати її у всіх місцях:

```javascript
/**
 * Sort items array by the order specified in deps array
 */
function sortByDepsOrder(items, depsArray) {
  if (!items || !depsArray) return items || [];

  const itemsMap = new Map(items.map(item => [item.id, item]));
  return depsArray
    .map(depId => itemsMap.get(depId))
    .filter(item => item !== undefined);
}
```

Застосувати у:
- `rebuildMenuItem` (якщо є deps)
- `rebuildMenuSection` (для items)
- `rebuildMenuConfig` (для sections та items)
- `rebuildUserConfig` (для menu_configs)
- `rebuildPageConfig` (для tabs, fields, menus)
- `rebuildViewConfig` (для fields, sorts, filters)
- `rebuildSpaceConfig` (для views, pages)
- `rebuildWorkspaceConfig` (для spaces)
- `rebuildAppConfig` (для workspaces, user_configs)

### Крок 2: Додати UI для зміни порядку

Дві опції для UI:

**Опція A: Move Up / Move Down кнопки**
```tsx
<button onClick={() => moveItemUp(itemId)}>↑</button>
<button onClick={() => moveItemDown(itemId)}>↓</button>
```

**Опція B: Drag & Drop для реорганізації** (більш інтуїтивно)
```tsx
<div draggable onDragStart={...} onDrop={...}>
  {/* child item */}
</div>
```

Обидва варіанти просто переставляють елементи в deps масиві:

```javascript
async function reorderChild(parentId, childId, newPosition) {
  const parent = configs.find(c => c.id === parentId);
  const deps = [...parent.deps];

  const oldIndex = deps.indexOf(childId);
  deps.splice(oldIndex, 1);
  deps.splice(newPosition, 0, childId);

  await appConfigStore.updateConfig(parentId, { deps });
  await appConfigStore.rebuildParentSelfData(parentId);
  await appConfigStore.cascadeUpdateUp(parentId);
}
```

### Крок 3: Тестування

1. Створити меню з декількома items/sections
2. Змінити порядок через UI
3. Перевірити, що deps масив оновився
4. Перевірити, що rebuild зберігає новий порядок
5. Перевірити, що UI відображає правильний порядок

## Висновок

**Рекомендація:** Використовувати deps масив як єдине джерело істини для порядку елементів.

**Необхідні зміни:**
1. ✅ Сортувати результати запитів за deps порядком у rebuild-hierarchy.cjs
2. ✅ Додати UI для зміни порядку (move up/down або drag-drop)
3. ✅ Функція reorder просто переставляє елементи в deps

**Переваги цього підходу:**
- Простота (нема додаткових полів)
- Надійність (один source of truth)
- Зрозумілість (порядок = порядок в deps)
- Гнучкість (легко міняти порядок)
