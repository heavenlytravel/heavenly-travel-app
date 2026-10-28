# Heavenly Travel

An online travel booking platform in Malaysia for booking cars with driver and coach
charter. A pnpm and Turborepo monorepo.

| App      | What it is                             | Production                       | Local                 |
| -------- | -------------------------------------- | -------------------------------- | --------------------- |
| `web`    | The customer site and the booking flow | https://new.heavenlytravel.my    | http://localhost:3000 |
| `manage` | The console staff run the business in  | https://manage.heavenlytravel.my | http://localhost:3001 |

The shared packages are listed in `CLAUDE.md`, "Package Roles".

## Start

Node 24 or later, and pnpm.

```sh
pnpm install
pnpm dev
```

`pnpm dev` starts every app on its own port. Each app reads its settings from
`.env.local`: copy its `.env.example` and fill it in. The Prisma commands and the
production scripts read `packages/db/.env` (see `packages/db/.env.example`).

## Docs

- `CLAUDE.md`: the commands and the rules for working here.
- `docs/260916-development-workflow.md`: branches, staging, merging and Vercel.
- `docs/260918-auth-and-database.md`: sign-in, the database and schema pushes.
- `docs/`: one file per piece of work, named by its date.
