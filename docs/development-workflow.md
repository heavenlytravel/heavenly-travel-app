# Development environments and workflow

## Environments

| Environment | web                                         | admin                                    | Git branch          | Vercel environment         |
| ----------- | ------------------------------------------- | ---------------------------------------- | ------------------- | -------------------------- |
| Production  | https://new.heavenlytravel.my               | https://manage.heavenlytravel.my         | `main`              | Production                 |
| Staging     | https://staging.heavenlytravel.my           | https://staging-manage.heavenlytravel.my | `staging` (pointer) | Preview (branch `staging`) |
| PR previews | Vercel preview URL per PR                   | Vercel preview URL per PR                | `feat/*`, `fix/*`   | Preview                    |
| Local       | first free port from 3000, printed on start | same                                     | any                 | —                          |

`web` and `admin` are two Vercel projects on the same repository. Deploys are automatic.
Vercel builds every push in both projects; pushes to `main` go to production, pushes to
`staging` go to the staging domains, and every other branch gets a preview URL per
project posted on its PR.

### Opening a dev server from another machine

Clerk's session cookies are `Secure`, so a browser only keeps them on `https://` or on
`http://localhost`. Over plain `http://<machine>:<port>` the sign-in succeeds in the
browser but the server never sees it, and the page flickers between `/` and `/sign-in`.
Use the Tailscale HTTPS addresses instead, and pin the ports they proxy to:

| App   | Start with                            | Open                                        |
| ----- | ------------------------------------- | ------------------------------------------- |
| web   | `pnpm --filter web dev --port 3000`   | https://akieez-h510m.tail4436c5.ts.net      |
| admin | `pnpm --filter admin dev --port 3001` | https://akieez-h510m.tail4436c5.ts.net:8443 |

## Branch model

```
feat/xyz ──PR, squash──▶ main ──▶ new.heavenlytravel.my + manage.heavenlytravel.my
   │
   └──force push──▶ staging ──▶ staging.heavenlytravel.my + staging-manage.heavenlytravel.my
```

- `main`: what is live. Only changes through squash-merged PRs. Protected by a ruleset.
- `feat/<name>`, `fix/<name>`, `chore/<name>`: short-lived work branches, always cut from `main`.
- `staging`: **a review pointer, not a branch you work on.** It is force-pushed to whatever
  branch the team should look at on the staging domains. Nothing is ever merged into it or out
  of it, and no PR is ever opened from it.

The staging domains exist so reviewers can see a feature on a fixed URL without a Vercel
account. Per-PR preview URLs also work, but they require a Vercel login.

## Day-to-day

### 1. Start work

```sh
git checkout main
git pull
git checkout -b feat/short-description
```

### 2. Commit

Commit as often as you like on the work branch. Use conventional prefixes
(`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`). The branch history gets squashed, so
the PR title is what matters.

Before pushing:

```sh
pnpm lint
pnpm check-types
```

### 3. Open a PR into `main`

```sh
git push -u origin feat/short-description
gh pr create --base main --fill
```

### 4. Show it on staging (optional, repeatable)

When the team should review the feature live:

```sh
pnpm staging
```

This pushes the current branch to its own remote ref and then force-pushes it onto
`staging`. Both Vercel projects rebuild, and a minute later the branch is live on
https://staging.heavenlytravel.my (web) and https://staging-manage.heavenlytravel.my
(admin). One push covers both apps; there is no separate admin command. Run it again
after every review fix. Pushing a different branch replaces what is there.

The domains show one branch at a time. To review two features together, build a throwaway
branch and stage that:

```sh
git checkout -b review/a-and-b main
git merge feat/a feat/b
git push origin review/a-and-b:staging --force
git checkout main && git branch -D review/a-and-b
```

### 5. Merge

Use **Squash and merge**. The squash commit message should read like a changelog line,
e.g. `feat(web): add landing page search bar`. GitHub deletes the remote branch on merge.

Then clean up locally:

```sh
git checkout main
git pull
git branch -D feat/short-description
```

Leave `staging` alone. It still points at the pre-squash commits, so `main...staging`
reports a few commits ahead and behind. The files are identical to `main` and the number
means nothing. It gets overwritten by the next `pnpm staging`.

## Hotfixes

A hotfix is just another PR into `main`, from a `fix/*` branch cut from `main`. Stage it
first if you want a second pair of eyes on the staging domain. There is no sync step
afterwards, because `staging` never accumulates anything.

## Guard rails (GitHub rulesets and settings)

Configured under **Settings → Rules → Rulesets** and **Settings → General**:

| Ruleset             | Branch    | Rules                                                |
| ------------------- | --------- | ---------------------------------------------------- |
| `main (production)` | `main`    | PR required, squash only, no force push, no deletion |
| _(none)_            | `staging` | Unprotected on purpose so it can be force-pushed     |

Repo settings: squash merge is the only merge method offered, and head branches are deleted
automatically after merge.

No approvals are required, so a solo developer can merge their own PRs. Raise
`required_approving_review_count` when the team grows.

## Vercel configuration

Both Vercel projects (`web` with root directory `apps/web`, `admin` with root directory
`apps/admin`) need:

1. **Settings → Git → Production Branch**: `main`.
2. **Settings → Domains**:
   - `web`: `new.heavenlytravel.my` → Production (no Git branch);
     `staging.heavenlytravel.my` → Preview, Git branch `staging`.
   - `admin`: `manage.heavenlytravel.my` → Production (no Git branch);
     `staging-manage.heavenlytravel.my` → Preview, Git branch `staging`.
3. **DNS** (at the `heavenlytravel.my` DNS provider): `CNAME` records for `new`,
   `staging`, `manage` and `staging-manage` pointing at the value Vercel shows (usually
   `cname.vercel-dns.com`).
4. **Settings → Deployment Protection**: Vercel Authentication **Disabled**, so reviewers
   do not need a Vercel account to open the staging domain. Access control for staging
   belongs in the app instead (see below).
5. **Settings → Environment Variables**:
   - Production values scoped to **Production**.
   - Staging-only values (for example the review gate and its auth keys) scoped to
     **Preview**, branch `staging`.

After changing environment variables, redeploy the branch for them to take effect.
Which Clerk instance and Neon branch each scope uses is in `docs/auth-and-database.md`.

## Gating the staging site

Because Vercel Authentication is off, the web staging domain is public until the app gates
it. The admin app already gates itself: every page requires an admin session.
The plan is a Clerk sign-in in `apps/web/proxy.ts`, enabled only when a staging-scoped
environment variable is set, with Clerk sign-ups restricted to internal accounts.
Production never has that variable, so the gate never appears on the live site.

## One-time migration note

Before 2026-09-16 `staging` was an integration branch that released into `main` through
merge-commit PRs. The last three PRs on it (#1, #2, #3) were fast-forwarded onto `main`
on that date, and the `staging` ruleset was removed. Nothing about that model applies
any more.

## Optional next steps

- GitHub Actions workflow running `pnpm lint`, `pnpm check-types` and `pnpm build` on PRs
  into `main`, then add it as a required status check in the `main` ruleset.
- Release tags on `main` (e.g. `v2026.09.15`) for an easy rollback reference.
