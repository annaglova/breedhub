# TODO: Loading UI & Skeletons

**Created:** 2025-12-01
**Status:** ✅ Completed

---

## Problem

При загрузці та навігації відбувається блимання - пустий екран або "Loading..." замість плавного UX.
В старому Angular проекті було краще: loading bar зверху + скелетони в компонентах.

---

## План реалізації

### Фаза 1: Loading Bar (глобальний індикатор) — ✅ Зроблено

**Що зроблено:**
- [x] `LoadingBar` компонент - тонка смужка зверху екрану
- [x] Використовує signal для відображення стану завантаження
- [x] Додано в Layout - рендериться завжди, показується коли є активні запити

**Файли:**
- `apps/app/src/components/shared/LoadingBar.tsx`

---

### Фаза 2: Скелетони для Space (список entities) — ✅ Зроблено

**Що зроблено:**
- [x] `SpaceView` показує скелетони замість пустого списку коли `isLoading && entities.length === 0`
- [x] Скелетон для list view: `ListCardSkeletonList` в `EntityListCardWrapper.tsx`
- [x] Скелетон для grid view: `GridCardSkeleton.tsx`
- [x] Повна шапка при loading (Title, ViewChanger, Counter, Search, Add, Filters)
- [x] Config-driven параметри: `skeletonCount`, `itemHeight`, `dividers`

**Файли:**
- `apps/app/src/components/space/SpaceView.tsx`
- `apps/app/src/components/space/EntityListCardWrapper.tsx` - містить ListCardSkeletonList
- `apps/app/src/components/space/GridCardSkeleton.tsx`
- `apps/app/src/components/space/SpaceComponent.tsx` - повна шапка в initial loading

---

### Фаза 3: Скелетони для Drawer (публічна сторінка entity) — ✅ Зроблено

**Що зроблено:**
- [x] `NameOutlet` - skeleton через `isLoading` prop
- [x] `AvatarOutlet` - skeleton через `isLoading` prop
- [x] `CoverOutlet` - skeleton через `isLoading` prop
- [x] `TabOutlet` - skeleton через `isLoading` prop
- [x] `AchievementOutlet` - skeleton через `isLoading` prop
- [x] Видалено старий `PublicPageSkeleton.tsx` - кожен outlet тепер сам відповідає за свій skeleton

**Файли:**
- `apps/app/src/components/template/outlet/NameOutlet.tsx`
- `apps/app/src/components/template/outlet/AvatarOutlet.tsx`
- `apps/app/src/components/template/cover/CoverOutlet.tsx`
- `apps/app/src/components/template/tabs/TabOutlet.tsx`
- `apps/app/src/components/template/outlet/AchievementOutlet.tsx`

---

### Фаза 4: Навігація без блимання — ✅ Зроблено

**Що зроблено:**
- [x] Тестувати Back/Forward navigation - працює коректно
- [x] Navigation показує скелетони замість пустоти
- [x] Fullscreen режим оптимізовано - Space контент не рендериться під drawer
- [x] Tab fullscreen (`/slug/tabSlug`) працює коректно

**Оптимізація:**
- `SpaceComponent.tsx` - early return для fullscreen mode, рендерить тільки drawer без списку entities

---

## Порядок виконання

1. ~~**LoadingBar** - швидко, дає візуальний feedback одразу~~ ✅
2. ~~**SpaceView skeletons** - найбільш помітне покращення~~ ✅
3. ~~**Drawer skeletons** - для повноти UX~~ ✅
4. ~~**Тестування навігації** - працює без додаткових фіксів~~ ✅

---

## Notes

- Layout (header, sidebar, структура) рендериться ВІДРАЗУ
- Контент всередині показує скелетони
- Progress bar зверху показує загальний прогрес
- Ніяких блокуючих "Loading..." на весь екран
