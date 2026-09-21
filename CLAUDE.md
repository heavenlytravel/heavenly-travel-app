# CLAUDE.md

## Project Overview

**Heavenly Travel** is an online travel booking platform in Malaysia for booking cars with driver and coach charter.

### Package Roles

- `apps/web`: Customer-facing site (landing page and customer app).
- `apps/admin`: Internal admin side for running the app.
- `packages/ui` (`@repo/ui`): Shared React component library used by both apps.
- `packages/db` (`@repo/db`): Prisma schema, Neon client and the `getAccess` session/role helper. See `docs/auth-and-database.md`.
- `packages/tailwind-config`: Shared Tailwind theme (`shared-styles.css`) and PostCSS config. Single source of truth for design tokens.
- `packages/eslint-config`: Shared ESLint flat configs (`base`, `next-js`, `react-internal`).
- `packages/typescript-config`: Shared `tsconfig.json` bases.

## Commands

Package manager is pnpm (Node >= 24).

- `pnpm dev`: run all apps
- `pnpm lint`: ESLint, zero warnings allowed
- `pnpm check-types`: TypeScript check
- `pnpm build`: production build
- `pnpm format`: Prettier
- `pnpm db:push`: push the Prisma schema to the development database (no migrations)
- `pnpm db:push:prod`: same against production, after a typed confirmation. Only the developer runs this

## Priorities

- Lint and typecheck must pass before considering task completed
- Focus on performance and reliability first
- Correctness is preferred over short-term solution, if there is a tradeoff

## Maintainability

Long term maintainability is a core priority. If you add new functionality, first check if there is shared logic that can be extracted to a separate module. Duplicate logic across multiple files is a code smell and should be avoided. Don't be afraid to change existing code. Don't take shortcuts by just adding local logic to solve a problem.

## Git Commits - Use Conventional Commits

- Format: `<type>(<scope>): <subject>`
- Types: `feat` | `fix` | `docs` | `style` | `refactor` | `test` | `chore` | `perf`
- Scopes: `web` | `admin` | `ui` | `config` | `deps` (omit for repo-wide changes)
- Subject: <= 50 chars, imperative mood, no period
- Small changes: one-line commit
- Complex changes: add body (wrap at 72 chars) explaining what/why; reference issues
- Keep commits atomic and self-explanatory; split by concern

## Development Workflow

Full details in `docs/development-workflow.md`.

- Dev ports are not pinned. Each app takes the first free port from 3000 and prints it;
  pass `--port` (e.g. `pnpm --filter admin dev --port 3001`) when a fixed port matters.
- `main` is production. It is protected: never commit or push to it directly.
- Start work by branching from `main`: `feat/*`, `fix/*` or `chore/*`.
- Run `pnpm lint` and `pnpm check-types` before pushing.
- Open the PR against `main`. It is squash-merged, so the PR title is the changelog line.
- `staging` is a review pointer, not a branch to work on. `pnpm staging` force-pushes the
  current branch onto it so the team can review at https://staging.heavenlytravel.my.
  Never merge into or from `staging`, never open a PR from it, and ignore how far it
  is ahead of or behind `main`.
