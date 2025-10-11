# BreedHub Setup Guide

## Prerequisites
- Node.js 18+
- pnpm 10.11.0+

## Setup Steps

### 1. Clone Repository
```bash
git clone <your-repo-url>
cd breedhub
```

### 2. Install Dependencies
```bash
pnpm install
```

### 3. Configure Environment Variables
Створи файл `.env` в корені проекту (скопіюй з `.env.example`):

```bash
cp .env.example .env
```

Заповни значення в `.env` файлі:
```env
# Supabase Configuration
VITE_SUPABASE_URL=http://dev.dogarray.com:8020
VITE_SUPABASE_ANON_KEY=<твій ключ>
VITE_SUPABASE_SERVICE_KEY=<твій ключ>

# Creatio API Configuration
VITE_CREATIO_BASE_URL=https://dev.dogarray.com

# AI Configuration (optional)
OPENAI_API_KEY=<твій ключ якщо потрібно>
```

**⚠️ ВАЖЛИВО:** Ніколи не комітуй файл `.env` в git!

### 4. Run Applications

**Main App** (port 5174):
```bash
pnpm dev:app
```

**Landing** (port 5173):
```bash
pnpm dev:landing
```

**Config Admin** (port 5176):
```bash
pnpm dev:config
```

## Project Structure
```
breedhub/
├── apps/
│   ├── app/              # Main application
│   ├── landing/          # Landing page
│   └── config-admin/     # Admin configuration tool
├── packages/
│   ├── rxdb-store/       # RxDB state management
│   └── ui/               # Shared UI components
└── .env                  # Environment variables (NOT in git)
```

## Troubleshooting

### Missing environment variables error
Переконайся що файл `.env` існує в корені проекту і містить всі необхідні змінні.

### Port already in use
Якщо порт зайнятий, закрий процес:
```bash
lsof -ti:5174 | xargs kill -9  # для app
lsof -ti:5173 | xargs kill -9  # для landing
lsof -ti:5176 | xargs kill -9  # для config-admin
```

### Module resolution errors
Спробуй видалити node_modules і перевстановити:
```bash
rm -rf node_modules
pnpm install
```
