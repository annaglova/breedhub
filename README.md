# BreedHub

Breeding management platform built with a local-first architecture. Data is cached locally via RxDB and synced with Supabase, so the app works offline and responds instantly.

## Tech Stack

- **Frontend:** React, TypeScript, Vite
- **State:** Preact Signals, RxDB (local cache)
- **Backend:** Supabase (PostgreSQL)
- **UI:** Tailwind CSS, Radix UI, TanStack Table
- **PWA:** Service Worker, offline support

## Project Structure

```
breedhub/
├── apps/
│   ├── app/            # Main application
│   ├── landing/        # Landing page
│   └── shared/         # Shared assets (icons, styles)
├── packages/
│   ├── rxdb-store/     # RxDB stores, hooks, sync logic
│   └── ui/             # Shared UI component library
└── supabase/           # Database config
```

## Setup

### Prerequisites

- Node.js 18+
- pnpm 10+

### Install and run

```bash
pnpm install
cp .env.example .env    # fill in your Supabase credentials
pnpm dev                # start the app (port 5174)
```

### Other commands

```bash
pnpm dev:landing        # landing page (port 5173)
pnpm build              # production build (app + landing)
pnpm typecheck          # type checking
pnpm lint               # linting
```

## License

MIT
