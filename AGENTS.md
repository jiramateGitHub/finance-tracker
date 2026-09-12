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

## Testing Guidelines

Tests are colocated with the utility or domain module and named `*.test.ts`, for example `src/features/trips/utils/tripUtils.test.ts`. The current suite uses lightweight local assertions rather than a test framework. Add focused cases for normal behavior, boundary values, invalid input, and regressions. When adding a new test file, also add it to the `test` script in `package.json`.

## Commit & Pull Request Guidelines

Recent history favors concise imperative messages and increasingly uses Conventional Commit scopes, such as `feat(ui): improve responsive layouts`. Prefer `type(scope): summary` (`feat`, `fix`, `refactor`, `docs`, or `test`) and keep each commit focused. Pull requests should explain the user-visible change, note verification commands, link relevant issues, and include before/after screenshots for UI or responsive-layout changes.

## Security & Configuration

Copy `.env.example` to `.env.local` and provide the required `VITE_FIREBASE_*` values. Never commit local environment files, credentials, user finance data, or generated `dist/` and `node_modules/` content.
