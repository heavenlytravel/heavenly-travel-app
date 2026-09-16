# CLAUDE.md

## Project Overview

**Heavenly Travel** is an online travel booking platform in Malaysia for booking cars with driver and coach charter.

### Package Roles

- `apps/web`: Customer-facing site (landing page and customer app).
- `apps/admin`: Internal admin side for running the app.
- `packages/ui` (`@repo/ui`): Shared React component library used by both apps.
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

- `apps/web` runs on port 3000, `apps/admin` on port 3001.
- `main` is production, `staging` is the staging site. Both are protected: never commit or push to them directly.
- Start work by branching from `staging`: `feat/*`, `fix/*` or `chore/*`.
- Run `pnpm lint` and `pnpm check-types` before pushing.
- Open the PR against `staging`. It is squash-merged, so the PR title is the changelog line.
- Releases and hotfixes go through `main` with a merge commit. Follow the doc for those.
