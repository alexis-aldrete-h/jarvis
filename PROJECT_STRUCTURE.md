# Project Structure

This document explains the organization of the Jarvis monorepo.

## Root Level

```
jarvis/
├── package.json          # Root workspace configuration
├── README.md            # Main project documentation
├── QUICKSTART.md        # Quick start guide
├── AI_INTEGRATION.md    # AI integration roadmap
├── .gitignore          # Git ignore rules
└── PROJECT_STRUCTURE.md # This file
```

## Apps

### `apps/web/` - Next.js Web Application

Modern web app built with Next.js 14, React, TypeScript, and Tailwind CSS.

**Key Files:**
- `src/app/page.tsx` - Main page with tab navigation
- `src/components/` - React components (TaskManager, WeekOrganizer, FinanceManager)
- `src/hooks/` - Custom React hooks (useTasks, useFinances)
- `next.config.js` - Next.js configuration
- `tailwind.config.js` - Tailwind CSS configuration

**Features:**
- Task management with priorities and due dates
- Week view with task scheduling
- Financial tracking with income/expense management
- Beautiful, modern UI with dark theme

### `apps/mobile/` - React Native Mobile Application

Cross-platform mobile app built with React Native and Expo.

**Key Files:**
- `App.tsx` - Main app with bottom tab navigation
- `src/screens/` - Screen components (TasksScreen, WeekScreen, FinancesScreen)
- `src/hooks/` - Custom hooks (useTasks, useFinances)
- `app.json` - Expo configuration
- `babel.config.js` - Babel configuration

**Features:**
- Same functionality as web app
- Native mobile UI/UX
- Touch-optimized interactions
- Works on iOS and Android

## Packages

### `packages/shared/` - Shared Types and Utilities

TypeScript package containing shared types, interfaces, and utility functions used by both web and mobile apps.

**Structure:**
```
packages/shared/
├── src/
│   ├── types/
│   │   ├── task.ts        # Task-related types
│   │   ├── finance.ts     # Finance-related types
│   │   └── week.ts        # Week organization types
│   ├── utils/
│   │   ├── date.ts        # Date utility functions
│   │   └── validation.ts  # Validation utilities
│   └── index.ts           # Main export file
├── package.json
└── tsconfig.json
```

**Usage:**
Both web and mobile apps import from `@jarvis/shared`:
```typescript
import { Task, Transaction, getWeekStart } from '@jarvis/shared'
```

## Data Storage

### Web App
- Uses `localStorage` for persistence
- Data keys: `jarvis_tasks`, `jarvis_transactions`, `jarvis_budgets`

### Mobile App
- Uses `AsyncStorage` from React Native
- Same data keys as web app
- Async/await pattern for all storage operations

## Future Package: `packages/ai/`

When AI features are added, create:
```
packages/ai/
├── src/
│   ├── services/         # AI service integrations
│   ├── hooks/            # React hooks for AI
│   └── utils/            # AI utilities
```

## Development Workflow

1. **Shared Package**: Build first when types change
   ```bash
   cd packages/shared && npm run build
   ```

2. **Web App**: Runs on port 3000
   ```bash
   npm run dev:web
   ```

3. **Mobile App**: Uses Expo development server
   ```bash
   npm run dev:mobile
   ```

## Adding New Features

1. **Add Types**: Update `packages/shared/src/types/`
2. **Build Shared**: Run `npm run build` in shared package
3. **Implement Web**: Add components in `apps/web/src/components/`
4. **Implement Mobile**: Add screens in `apps/mobile/src/screens/`
5. **Share Logic**: Use hooks in respective `src/hooks/` directories

## Code Sharing Strategy

- **Types**: Shared in `packages/shared`
- **Business Logic**: Similar hooks in each app (can be extracted later)
- **UI Components**: Separate implementations (web uses HTML/CSS, mobile uses React Native)
- **Utilities**: Shared in `packages/shared/src/utils/`

