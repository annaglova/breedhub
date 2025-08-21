# BreedHub Project Guidelines

> 📌 Цей документ описує архітектуру, принципи та конвенції проекту BreedHub. 
> 🆕 **Актуальна архітектура:** [ARCHITECTURE.md](./ARCHITECTURE.md) - Local-First PWA з CRDT та AI

## 📁 Структура проекту

### Поточна структура (legacy)
```
breedhub/
├── apps/
│   ├── app/          # Основний додаток (React) - legacy
│   ├── landing/      # Лендінг сторінка (React + Vite)
│   ├── signal-store-playground/ # Testing playground
│   └── shared/       # Спільні компоненти та утиліти
├── packages/         # Планується для shared code
├── docs/            # Документація
│   └── ARCHITECTURE.md # Local-First архітектура
├── supabase/
│   └── migrations/  # SQL міграції
└── package.json
```

### Нова структура (планується)
```
breedhub-pwa/        # Новий Local-First PWA
├── src/
│   ├── local-first/ # CRDT stores, sync engine
│   ├── ai/         # Gemma 270M integration
│   └── stores/     # LocalFirstStore instances
└── public/
    └── models/     # Gemma AI models
```

### Основні модулі та директорії

- **apps/app** - основний додаток з авторизацією та функціоналом
- **apps/landing** - публічний сайт з інформацією про продукт
- **apps/shared** - спільні компоненти між додатками:
  - `/pages/auth` - сторінки авторизації (SignIn, SignUp, ForgotPassword, ResetPassword)
  - `/components/auth` - компоненти для auth сторінок
  - `/utils` - утиліти (валідація, безпека)
  - `/theme` - тема та стилі
  - `/hooks` - кастомні React hooks
  - `/layouts` - layout компоненти
- **packages/ui** - бібліотека UI компонентів:
  - `/components/form-inputs` - всі інпути форм
  - `/components/auth-forms` - обгортки для форм
  - `/lib` - утиліти для UI

## 🛠 Технологічний стек

### Основні технології
- **React 18** - UI фреймворк
- **TypeScript** - типізація
- **Vite** - збірка для landing
- **Tailwind CSS** - стилізація
- **React Hook Form** - управління формами
- **Zod** - валідація схем
- **Lucide React** - іконки

### Встановлені пакети
```json
{
  "dependencies": {
    "react": "^18.x",
    "react-dom": "^18.x",
    "react-hook-form": "^7.x",
    "@hookform/resolvers": "^3.x",
    "zod": "^3.x",
    "lucide-react": "latest",
    "@tailwindcss/typography": "^0.5.x",
    "@tailwindcss/aspect-ratio": "^0.4.x",
    "class-variance-authority": "^0.7.x",
    "clsx": "^2.x",
    "tailwind-merge": "^2.x"
  }
}
```

## 🎨 Дизайн система

### Кольори
```css
--primary: purple-500 (#6B3AB7)
--accent: pink-600 (#DB2777)
--secondary: slate-500
--warning/error: red-500 (#EF4444)
--success: green-500 (#10B981)
```

### Іконки
Використовуємо **Lucide React** для всіх іконок:
```tsx
import { Mail, Lock, User, Eye, EyeOff, Check, AlertCircle } from "lucide-react";
```

### Компоненти форм

#### Базові інпути (`packages/ui/components/form-inputs/`)
- `TextInput` - текстовий інпут
- `EmailInput` - email з валідацією
- `PasswordInput` - пароль з показом/приховуванням
- `NumberInput` - числовий інпут
- `TextareaInput` - багаторядковий текст
- `DropdownInput` - випадаючий список
- `LookupInput` - пошуковий випадаючий список
- `DateInput` - вибір дати
- `FileInput` - завантаження файлів
- `CheckboxInput` - чекбокс
- `RadioInput` - радіо кнопки
- `TimeInput` - вибір часу
- `SwitchInput` - перемикач

#### Візуальні стани інпутів
1. **Default** - сірий border, на hover темніший
2. **Focus** - primary border + ring ефект (CSS псевдо-клас)
3. **Error** - червоний border та іконка
4. **Success** - зелений border, галочка справа
5. **Disabled** - сірий фон

### CSS принципи

#### Підхід до стилізації
- **Utility-first** через Tailwind CSS
- **Компонентні стилі** в самих компонентах (НЕ в глобальних CSS)
- **CSS псевдо-класи** для інтерактивних станів (focus, hover)
- **НЕ використовуємо** глобальні стилі з `!important`

#### Анімації
```css
animate-fadeIn     /* Плавна поява (opacity) */
animate-slideDown  /* НЕ використовуємо для помилок */
animate-scaleIn    /* Збільшення при появі */
animate-shake      /* Трясіння при помилці */
```

## 📝 Робота з формами

### Стек для форм
1. **React Hook Form** - управління станом форми
2. **Zod** - схеми валідації
3. **Централізовані валідатори** - `apps/shared/utils/validation.ts`

### Приклад форми
```tsx
// 1. Схема валідації
const schema = z.object({
  email: emailValidator,
  password: passwordValidator
});

// 2. Ініціалізація форми
const { register, handleSubmit, formState: { errors, touchedFields } } = useForm({
  resolver: zodResolver(schema),
  mode: "onTouched" // Валідація після першої взаємодії
});

// 3. Використання в компоненті
<EmailInput
  {...register("email")}
  error={errors.email?.message}
  touched={touchedFields.email}
/>
```

### Централізовані валідатори (`apps/shared/utils/validation.ts`)
- `emailValidator` - валідація email
- `passwordValidator` - сильний пароль (8+ символів, великі/малі літери, цифри)
- `simplePasswordValidator` - простий пароль (8+ символів)
- `nameValidator` - валідація імені
- `requiredString(fieldName)` - обов'язкове текстове поле
- `optionalString` - опціональне текстове поле
- `mustBeTrue(message)` - для чекбоксів

### Існуючі форми
1. **SignIn** - вхід (email + password)
2. **SignUp** - реєстрація (name + email + password + kennel + agreements)
3. **ForgotPassword** - відновлення паролю (email)
4. **ResetPassword** - скидання паролю (password + passwordConfirm)
5. **test-inputs** - тестова сторінка всіх інпутів

## 🏗 Архітектурні принципи

### Компонентний підхід
- Кожен компонент відповідає за свої стилі
- Логіка валідації в компонентах, а не в темі
- Використовуємо composition over inheritance

### Стан форм
- **touched** - поле було в фокусі
- **error** - показується тільки якщо touched && має помилку
- **success** - показується тільки якщо touched && валідне


### Focus/Hover стани
- Використовуємо CSS псевдо-класи (`peer-focus`, `group-focus-within`)
- НЕ покладаємося на JavaScript стан для візуальних ефектів
- Плавні переходи через `transition-colors`

## 🚀 Vite конфігурація

Лендінг використовує Vite з наступними алісами:
```js
alias: {
  "@": "/apps/landing/src",
  "@ui": "/packages/ui",
  "@shared": "/apps/shared"
}
```

## 📋 Правила оновлення цього файлу

### Коли оновлювати
- Після додавання нових компонентів
- При зміні архітектурних принципів
- При додаванні нових залежностей
- При зміні структури проекту

### Як оновлювати
1. AI запитує дозвіл: "Чи можу я оновити docs/PROJECT_GUIDELINES.md з новими змінами?"
2. Опишіть що саме змінилося
3. Після підтвердження - оновіть відповідні секції
4. Додайте дату останнього оновлення внизу

### Формат змін
```markdown
## 📅 Історія змін
- **2024-01-31** - Початкова версія
- **YYYY-MM-DD** - Опис змін
```

---

## 🎯 UX/UI Guidelines

### Доступність (Accessibility)
- **Клавіатурна навігація** - всі інтерактивні елементи доступні з клавіатури
- **ARIA атрибути** - role, aria-selected, aria-controls для табів
- **Фокус індикатори** - ring-2 ring-primary-500 для всіх елементів
- **Skip links** - для навігації screen reader
- **Мінімальні розміри** - кнопки мінімум 44px для touch targets

### Loading States
- **LoadingButton** - компонент з вбудованим станом завантаження
- **LoadingSpinner** - універсальний спіннер (розміри: sm, md, lg)
- **Skeleton screens** - для контенту що завантажується
- **Native lazy loading** - для зображень (loading="lazy")

### Анімації та переходи
- **НЕ використовуємо** pulse анімації - дратують користувачів
- **Плавні переходи** - transition-opacity, transition-colors
- **Фокус на функціональності** - анімації мають бути швидкими і ненав'язливими

### Mobile-first підхід
- **Responsive текст** - text-4xl sm:text-5xl lg:text-6xl
- **Адаптивні відступи** - mt-24 md:mt-32
- **Горизонтальний скролл** - scrollbar-hide для табів
- **MobileStickyButton** - липка CTA кнопка для мобільних

### Кольоровий контраст
- **text-secondary** → **text-secondary-600** для кращого контрасту
- **Неактивні таби** - text-slate-500 замість text-slate-400
- **WCAG compliance** - мінімум 4.5:1 для звичайного тексту

### Специфічні рішення для BreedHub
- **Немає trial періоду** - тільки free forever план
- **Немає social proof** - продукт ще без користувачів
- **Benefits замість social proof** - список переваг продукту
- **CTA тексти** - орієнтовані на дію ("Start for Free", "Choose Your Breed")

## 🏛️ Space Architecture (Архітектура просторів)

### Контекст та референс
- **Angular проект**: `/Users/annaglova/projects/org` - оригінальна реалізація з NgRx Signal Store
- **React адаптація**: спрощена версія для роботи з потужним бекендом

### Концепція Space
Space - це універсальний компонент для роботи з колекціями сутностей (breeds, kennels, pets, contacts). Кожен space підтримує:
- Різні режими відображення (list, grid, table, map)
- Віртуальний скрол з lazy loading
- Фільтрацію та пошук
- Сортування
- Деталі в drawer/sidebar

### Основні компоненти

#### SpaceComponent (`/apps/app/src/components/space/SpaceComponent.tsx`)
Універсальний компонент для всіх spaces. Аналог Angular SpaceComponent.
```typescript
interface SpaceComponentProps<T> {
  config: SpaceConfig<T>;           // Конфігурація space
  useEntitiesHook: (params) => {}; // Hook для завантаження даних
  filters?: React.ReactNode;        // Додаткові фільтри
}
```

#### SpaceConfig (`/apps/app/src/core/space/types.ts`)
```typescript
interface SpaceConfig<T> {
  id: string;                    // Унікальний ID space
  url: string;                   // URL сегмент
  entitySchemaName: string;      // Назва сутності
  viewConfig: ViewConfig[];      // Конфігурації view modes
  entitiesColumns: string[];     // Колонки для API
  naming: SpaceNaming;           // Назви для UI
  filterConfig: FilterConfig[];  // Доступні фільтри
  canAdd?: boolean;              // Чи можна додавати
  defaultSort?: SortConfig;      // Сортування за замовчуванням
}
```

#### VirtualSpaceView (`/apps/app/src/components/space/VirtualSpaceView.tsx`)
Віртуальний скрол з підтримкою різних view modes. Використовує @tanstack/react-virtual.

### Приклад використання

#### 1. Створення конфігурації (`/apps/app/src/config/spaces/breed-space.config.ts`)
```typescript
export const breedSpaceConfig: SpaceConfig<Breed> = createSpaceConfig({
  id: 'Breed',
  url: 'breeds',
  viewConfig: [
    {
      ...DEFAULT_LIST_VIEW,
      component: () => import('@/components/breed/BreedListCard')
    },
    {
      ...DEFAULT_GRID_VIEW,
      component: () => import('@/components/breed/BreedGridCard')
    }
  ],
  // ...
});
```

#### 2. Створення сторінки (`/apps/app/src/pages/breeds/BreedSpacePage.tsx`)
```typescript
export function BreedSpacePage() {
  return (
    <SpaceComponent 
      config={breedSpaceConfig} 
      useEntitiesHook={useBreeds}
    />
  );
}
```

### State Management (Поточний стан)

#### Zustand Stores
- `createSpaceStore.ts` - фабрика для створення space stores
- `breedSpaceStore.ts` - конкретний store для breeds
- `SpaceContext.tsx` - React Context для передачі store

**⚠️ ВАЖЛИВО**: Ця частина буде спрощена після готовності бекенду. Планується:
- Видалити Zustand stores
- Покладатися на React Query для server state
- Використовувати URL params для UI state
- Всю логіку фільтрації/сортування перенести на бекенд

### View Modes

#### List View
- Компонент: `BreedListCard` (68px висота)
- Стратегія: sidebar для деталей
- Оптимізований для швидкого перегляду

#### Grid View  
- Компонент: `BreedGridCard` (280px висота)
- Стратегія: публічна сторінка для деталей
- Карткове відображення з превью

#### Table View (планується)
- Табличне відображення
- Inline редагування

#### Map View (планується)
- Географічне відображення
- Для kennels/contacts

### Компоненти для швидкого доступу

- **ViewChanger** (`/apps/app/src/components/space/ViewChanger.tsx`) - перемикач view modes
- **EntitiesCounter** (`/apps/app/src/components/space/EntitiesCounter.tsx`) - лічильник сутностей
- **SpaceFilters** (`/apps/app/src/components/space/SpaceFilters.tsx`) - контейнер для фільтрів
- **SpaceScroller** (`/apps/app/src/components/space/SpaceScroller.tsx`) - скрол контейнер

### Додавання нового Space

1. Створити конфігурацію в `/config/spaces/[entity]-space.config.ts`
2. Створити компоненти карток для view modes
3. Створити hook для завантаження даних
4. Створити просту сторінку з SpaceComponent

### Поточні реалізовані Spaces
- **Breeds** - повністю реалізований з list/grid views
- **Kennels** - створена конфігурація (приклад)

### TODO та плани
- [ ] Спростити архітектуру після готовності бекенду
- [ ] Додати table view
- [ ] Реалізувати фільтрацію через URL params
- [ ] Додати інші spaces (pets, contacts, litters)
- [ ] Покращити мобільну версію

## 🚧 План розробки App модуля

### Поточний стан
- **apps/landing** - 80% готовий, залишилося: інтеграція платежів, підключення до БД
- **apps/app** - базова структура перенесена з Angular, потребує оновлення
- **packages/ui** - бібліотека компонентів активно розвивається
- **Supabase + ra-admin** - структура БД та адмінка готові

### Фаза 1: Аналіз та підготовка (1-2 дні) ⏳
- [ ] Аналіз існуючих компонентів в app vs Angular проект
- [ ] Порівняння структури та функціоналу
- [ ] Створення mock даних для всіх сутностей (pets, breeds, kennels, litters)
- [ ] Документування відмінностей та потреб в оновленні

### Фаза 2: Публічні сторінки (5-7 днів) ⏳
- [ ] **Сторінки порід**
  - [ ] Список порід з фільтрами та пошуком
  - [ ] Детальна сторінка породи
  - [ ] SEO оптимізація (meta tags, structured data)
- [ ] **Сторінки питомців**
  - [ ] Список питомців з фільтрацією
  - [ ] Детальна сторінка питомця
  - [ ] Візуалізація родоводу
- [ ] **Сторінки розплідників**
  - [ ] Каталог розплідників
  - [ ] Профіль розплідника
  - [ ] Список питомців розплідника

### Фаза 3: Інтеграція UI компонентів (3-4 дні) ⏳
- [ ] Заміна старих компонентів на нові з packages/ui
- [ ] Створення специфічних компонентів:
  - [ ] PedigreeTree - візуалізація родоводу
  - [ ] PetCard - картка питомця
  - [ ] BreedCard - картка породи
  - [ ] KennelCard - картка розплідника
- [ ] Уніфікація стилів згідно дизайн-системи

### Фаза 4: Підключення до БД (3-4 дні) ⏳
- [ ] Налаштування Supabase RLS для публічних даних
- [ ] Створення API сервісів для публічних даних
- [ ] Оптимізація запитів та кешування
- [ ] Створення JSONB таблиці для лендінгу (landing_data)
- [ ] Процеси агрегації даних для лендінгу

### Фаза 5: Авторизація та приватні сторінки (5-7 днів) ⏳
- [ ] Інтеграція auth сторінок з apps/shared
- [ ] Protected routes та ролі користувачів
- [ ] CRUD операції для власників:
  - [ ] Управління питомцями
  - [ ] Управління послідами
  - [ ] Особистий кабінет
- [ ] Форми створення/редагування з валідацією

### Фаза 6: Фінальні кроки (2-3 дні) ⏳
- [ ] Інтеграція платіжної системи
- [ ] Налаштування тарифних планів
- [ ] Система підписок
- [ ] Тестування та виправлення багів

### Технічні деталі

#### Структура публічних сторінок
```
/breeds                    # Список порід
/breeds/:id               # Деталі породи
/pets                     # Список питомців
/pets/:id                 # Деталі питомця
/kennels                  # Список розплідників
/kennels/:id              # Профіль розплідника
/kennels/:id/pets         # Питомці розплідника
```

#### Mock дані структура
```typescript
interface MockBreed {
  id: string;
  name: string;
  description: string;
  origin: string;
  characteristics: string[];
  images: string[];
}

interface MockPet {
  id: string;
  name: string;
  breed: MockBreed;
  birthDate: Date;
  gender: 'male' | 'female';
  kennel: MockKennel;
  pedigree: PedigreeData;
  images: string[];
}

interface MockKennel {
  id: string;
  name: string;
  description: string;
  location: string;
  breeds: MockBreed[];
  pets: MockPet[];
}
```

## 🗺️ Routing та Navigation

### Принципи роутингу
Проект використовує ієрархічну систему роутингу з React Router, яка підтримує:
- Nested routes для вкладених сторінок
- Hash-based navigation для табів
- Drawer та full page views для деталей сутностей

### Структура URL

#### Space Routes (Списки сутностей)
```
/breeds                    # Список порід
/pets                     # Список питомців  
/kennels                  # Список розплідників
/contacts                 # Список контактів
/litters                  # Список послідів
```

#### Detail Routes (Деталі сутностей)

##### Drawer Mode (Quick Preview)
```
/breeds/:id#tab           # Drawer з табами для швидкого перегляду
/breeds/:id#overview      # Таб огляду
/breeds/:id#pets          # Таб питомців породи
/breeds/:id#kennels       # Таб розплідників
/breeds/:id#stats         # Таб статистики
```

##### Full Page Mode (Повний перегляд)
```
/:breedId#tab             # Повна сторінка породи з табами
/:petId#tab               # Повна сторінка питомця
/:kennelId#tab            # Повна сторінка розплідника
```

### Drawer Behavior

#### Responsive Modes
Drawer має три режими в залежності від розміру екрану (використовуються кастомні breakpoints):

1. **Over Mode (< 960px)**
   - Повноекранний overlay
   - Закриває весь контент в межах space компонента
   - Не виходить за межі header/footer

2. **Side Mode (960px - 1535px)**
   - Drawer накладається на список справа
   - Список залишається повної ширини
   - Темний напівпрозорий backdrop тільки над списком
   - Drawer має закруглені кути зліва

3. **Side-Transparent Mode (≥ 1536px)**
   - Drawer як окрема картка справа
   - Проміжок 20px (1.25rem) між списком та drawer
   - Список звужується для розміщення drawer
   - Без backdrop, можна взаємодіяти зі списком

#### Custom Breakpoints
```javascript
// Кастомні breakpoints з Angular проекту
sm: 600px     // (native Tailwind: 640px)
md: 960px     // (native Tailwind: 768px)  
lg: 1280px    // (native Tailwind: 1024px)
xl: 1440px    // (native Tailwind: 1280px)
xxl: 1536px   // (native Tailwind: 1536px - same)
xxxl: 1920px  // (native Tailwind: doesn't exist)
```

### Навігація між views

#### Відкриття drawer
```javascript
// З списку при кліку на сутність
navigate(`/breeds/${id}#overview`);
```

#### Перехід на full page
```javascript
// З drawer через кнопку expand
navigate(`/${id}#${activeTab}`);
```

#### Закриття drawer
```javascript
// Повернення до списку
navigate('/breeds');
```

### Tab Navigation
Таби використовують hash-based navigation для збереження стану при переході між drawer та full page:

```javascript
// Зміна табу
navigate(`#${tabId}`, { replace: true });

// Синхронізація з URL
useEffect(() => {
  const hash = location.hash.slice(1);
  if (hash && tabs.some(tab => tab.id === hash)) {
    setActiveTab(hash);
  }
}, [location.hash]);
```

### Router Configuration
```typescript
// Основні роути додатку
<Routes>
  {/* Space routes з вкладеними drawer routes */}
  <Route path="breeds" element={<BreedsPage />}>
    <Route path=":id" element={<BreedDrawerView />} />
  </Route>
  
  {/* Top-level routes для full page views */}
  <Route path=":breedId" element={<BreedDetailPage />} />
</Routes>
```

### Best Practices
1. **Завжди використовуйте hash для табів** - забезпечує консистентність між views
2. **Outlet для вкладених роутів** - дозволяє рендерити drawer/modal контент
3. **Збереження контексту** - при переході між drawer та full page зберігайте активний таб
4. **URL як джерело істини** - стан UI визначається URL параметрами

## 🏗️ Page Assembly Architecture (Архітектура збору сторінки)

### Концепція та походження
Архітектура базується на Angular проекті `/Users/annaglova/projects/org`, де використовується система **outlets** для композиції сторінок entity. Замість створення окремих компонентів для кожної сутності, використовується універсальний шаблон з динамічними компонентами.

### Основні компоненти системи

#### 1. PageTemplateV3 (`/components/template/PageTemplateV3.tsx`)
Головний шаблон сторінки, який визначає структуру та розміщення outlets:
```typescript
<PageTemplateV3>
  <NameContainerOutlet>      // Sticky контейнер для назви
    <BreedNameComponent />    // Компонент назви конкретної entity
  </NameContainerOutlet>
  
  <AvatarOutlet />           // Outlet для аватара
  <PageAchievementsOutlet /> // Outlet для досягнень
  <PageDetailsOutlet />      // Outlet для табів і контенту
</PageTemplateV3>
```

#### 2. Outlet Components
Контейнери для різних частин сторінки:
- **NameContainerOutlet** - sticky контейнер для назви entity
- **AvatarOutlet** - відображення аватара/зображення
- **PageAchievementsOutlet** - секція досягнень
- **PageDetailsOutlet** - таби та їх контент

#### 3. Domain Components (`/domain/[entity]/`)
Специфічні компоненти для кожної entity:
```
/domain/breed/
  ├── BreedNameComponent.tsx       // Компонент назви породи
  ├── BreedAchievementsComponent.tsx // Досягнення породи
  └── tabs/
      ├── BreedPatronsComponent.tsx
      ├── BreedTopPetsComponent.tsx
      └── BreedTopKennelsComponent.tsx
```

### Принцип збору сторінки

#### 1. Routing визначає структуру
```typescript
<Route path=":id" element={<PageTemplateV3 />}>
  {/* Outlets отримують компоненти через routing */}
</Route>
```

#### 2. PageTemplateV3 визначає який компонент для якої entity
```typescript
function PageTemplateV3() {
  // Визначаємо тип entity з URL або контексту
  const entityType = getEntityType();
  
  // Вибираємо відповідні компоненти
  const NameComponent = entityComponents[entityType].name;
  const AvatarComponent = entityComponents[entityType].avatar;
  
  return (
    <div>
      <NameContainerOutlet>
        <NameComponent />
      </NameContainerOutlet>
      {/* ... */}
    </div>
  );
}
```

#### 3. Конфігурація для кожної entity
```typescript
// breed.routing.ts
export const breedPageConfig = {
  entityType: 'breed',
  nameComponent: BreedNameComponent,
  avatarComponent: BreedAvatarComponent,
  achievementsComponent: BreedAchievementsComponent,
  tabs: [
    { id: 'patrons', component: BreedPatronsComponent },
    { id: 'pets', component: BreedTopPetsComponent }
  ]
};
```

### Переваги архітектури

1. **Універсальність** - один PageTemplateV3 для всіх entities
2. **Модульність** - легко додавати нові entity типи
3. **Консистентність** - однаковий layout для всіх сторінок
4. **Гнучкість** - кожна entity має свої специфічні компоненти
5. **Переиспользование** - outlets можуть використовуватись в різних режимах (drawer/full page)

### Режими відображення

#### Drawer Mode
```typescript
<PageTemplateV3 isDrawerMode={true}>
  {/* Компактна версія без деяких outlets */}
  <NameContainerOutlet />
  <PageDetailsOutlet />
</PageTemplateV3>
```

#### Full Page Mode
```typescript
<PageTemplateV3 isDrawerMode={false}>
  {/* Повна версія з усіма outlets */}
  <PageHeaderComponent />
  <AvatarOutlet />
  <NameContainerOutlet />
  <PageAchievementsOutlet />
  <PageDetailsOutlet />
</PageTemplateV3>
```

### Додавання нової entity

1. **Створити domain компоненти**:
```
/domain/pet/
  ├── PetNameComponent.tsx
  ├── PetAvatarComponent.tsx
  └── tabs/
      ├── PetHealthComponent.tsx
      └── PetPedigreeComponent.tsx
```

2. **Створити конфігурацію**:
```typescript
// pet.routing.ts
export const petPageConfig = {
  entityType: 'pet',
  nameComponent: PetNameComponent,
  tabs: [...]
};
```

3. **Зареєструвати в PageTemplateV3**:
```typescript
const entityConfigs = {
  breed: breedPageConfig,
  pet: petPageConfig,
  // ...
};
```

### Ключові відмінності від класичного підходу

| Класичний підхід | Outlet Architecture |
|-----------------|-------------------|
| BreedPage, PetPage, KennelPage | PageTemplateV3 (універсальний) |
| Дублювання layout коду | Outlets переиспользуються |
| Важко підтримувати консистентність | Автоматична консистентність |
| Кожна сторінка - окремий компонент | Композиція з маленьких компонентів |

### Поточний стан реалізації

✅ **Реалізовано**:
- PageTemplateV3 базова версія
- NameContainerOutlet
- BreedNameComponent для breed entity
- Інтеграція з SpaceComponent для drawer

⏳ **В процесі**:
- AvatarOutlet
- PageAchievementsOutlet
- PageDetailsOutlet з табами

🔜 **Заплановано**:
- Підтримка інших entities (pet, kennel, litter)
- Повна інтеграція routing
- Full page mode

## 📅 Історія змін
- **2024-01-31** - Початкова версія документу. Описано базову структуру, компоненти форм, принципи стилізації та валідації.
- **2025-08-03** - Додано UX/UI Guidelines: доступність, loading states, mobile-first, контраст кольорів. Описано реалізовані покращення Week 1.
- **2025-08-04** - Додано детальний план розробки App модуля з 6 фазами. Описано структуру публічних сторінок та mock даних.
- **2025-08-07** - Додано розділ Space Architecture. Описано адаптацію Angular архітектури для React, основні компоненти, state management та плани спрощення.
- **2025-08-07** - Додано розділ Routing та Navigation. Описано систему роутингу, drawer behavior, responsive modes та кастомні breakpoints.
- **2025-08-10** - Додано розділ Page Assembly Architecture. Описано принцип збору сторінок entity через outlets, як в Angular проекті.
\ No newline at end of file
