# Repository Guidelines

## Project Structure & Module Organization

This is a Vite, React 19, and TypeScript finance tracker. Keep domain work in `src/features/<feature>/`, with pages at the feature root, reusable feature UI in `components/`, and pure helpers in `utils/`. Shared UI belongs in `src/components/ui`; layout is in `src/components/layout`. Cross-feature types, state, hooks, services, and utilities use their corresponding top-level `src/` directories. Static files belong in `public/`, project notes in `docs/`, and generated output in `dist/`.

## Build, Test, and Development Commands

- `npm ci`: install exact dependency versions from `package-lock.json` for clean environments and CI.
- `npm run dev`: start the Vite development server with hot reload.
- `npm run build`: type-check with project references, then create the production bundle in `dist/`.
- `npm run preview`: serve the production bundle locally for a final check.
- `npm run lint`: run ESLint across TypeScript and React sources.
- `npm test`: execute all assertion-based `*.test.ts` files through `tsx`.

Run `npm run lint`, `npm test`, and `npm run build` before opening a pull request.

## Coding Style & Naming Conventions

Follow the existing TypeScript style: two-space indentation, single quotes, no semicolons, and trailing commas in multiline structures. ESLint covers JavaScript, TypeScript, React Hooks, and Vite refresh rules; TypeScript rejects unused locals and parameters. Use `PascalCase` for components and files (`TripDetail.tsx`) and `camelCase` for functions and variables. Prefer typed props, pure calculations, and shared UI primitives.

## Design System & Master Colors Rule

All color and styling decisions MUST adhere to the Master Color System defined in `src/constants/theme.ts` and `tailwind.config.ts`. Never introduce arbitrary hex codes or unstandardized color shades into components.

- **Single Source of Truth**:
  - `src/constants/theme.ts`: Defines `MASTER_COLORS`, `CATEGORY_CHART_COLORS`, and `SEMANTIC_TONE_CLASSES`.
  - `tailwind.config.ts`: Configures `colors.finance` (`primary`, `income`, `expense`, `warning`, `neutral`, `line`, `bg`, `card`).
- **Semantic Roles**:
  - **Primary / Active** (`blue-600`): Primary actions, active navigation tabs, active filters, selected cards, and focus rings.
  - **Income / Success** (`emerald-600`, `text-emerald-700`): Income amounts, positive cash flow, paid status, and safe budget states.
  - **Expense / Danger** (`rose-600`, `text-rose-700`): Expense amounts, destructive buttons, overdue warnings, and over-budget states.
  - **Warning / Due** (`amber-600`, `text-amber-700`): Pending/unpaid expenses, due-soon items, near-limit alerts, and sync conflicts.
  - **Neutral / Surface** (`slate-900` text, `slate-600` secondary, `slate-200` border, `slate-50` subtle background): Content text, card borders, and secondary controls.
- **Shared Primitives**:
  - Always use `<Badge tone="...">` (`neutral`, `income`, `expense`, `warning`, `active`, `primary`) instead of writing ad-hoc inline `<span>` status pills.
  - Visual charts (Donut, SVG, Canvas) and dynamic categories MUST consume colors from `CATEGORY_CHART_COLORS` or `MASTER_COLORS` in `src/constants/theme.ts`.

## Testing Guidelines

Tests are colocated with the utility or domain module and named `*.test.ts`, for example `src/features/trips/utils/tripUtils.test.ts`. The current suite uses lightweight local assertions rather than a test framework. Add focused cases for normal behavior, boundary values, invalid input, and regressions. When adding a new test file, also add it to the `test` script in `package.json`.

## Commit & Pull Request Guidelines

Recent history favors concise imperative messages and increasingly uses Conventional Commit scopes, such as `feat(ui): improve responsive layouts`. Prefer `type(scope): summary` (`feat`, `fix`, `refactor`, `docs`, or `test`) and keep each commit focused. Pull requests should explain the user-visible change, note verification commands, link relevant issues, and include before/after screenshots for UI or responsive-layout changes.

## Security & Configuration

Copy `.env.example` to `.env.local` and provide the required `VITE_FIREBASE_*` values. Never commit local environment files, credentials, user finance data, or generated `dist/` and `node_modules/` content.
