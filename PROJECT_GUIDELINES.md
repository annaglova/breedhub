# BreedHub Project Guidelines

> 📌 Цей документ описує архітектуру, принципи та конвенції проекту BreedHub. Оновлюється після ключових змін.

## 📁 Структура проекту

```
breedhub/
├── apps/
│   ├── app/          # Основний додаток (React)
│   ├── landing/      # Лендінг сторінка (React + Vite)
│   └── shared/       # Спільні компоненти та утиліти
├── packages/
│   └── ui/           # UI бібліотека компонентів
├── tailwind.config.js
└── package.json
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
1. AI запитує дозвіл: "Чи можу я оновити PROJECT_GUIDELINES.md з новими змінами?"
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

## 📅 Історія змін
- **2024-01-31** - Початкова версія документу. Описано базову структуру, компоненти форм, принципи стилізації та валідації.
- **2025-08-03** - Додано UX/UI Guidelines: доступність, loading states, mobile-first, контраст кольорів. Описано реалізовані покращення Week 1.
- **2025-08-04** - Додано детальний план розробки App модуля з 6 фазами. Описано структуру публічних сторінок та mock даних.
\ No newline at end of file
