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

## 📅 Історія змін
- **2024-01-31** - Початкова версія документу. Описано базову структуру, компоненти форм, принципи стилізації та валідації.
\ No newline at end of file
