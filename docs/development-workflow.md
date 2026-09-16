# Development environments and workflow

## Environments

| Environment | URL                           | Git branch | Vercel environment         |
| ----------- | ----------------------------- | ---------- | -------------------------- |
| Production  | https://new.heavenlytravel.my | `main`     | Production                 |
| Staging     | https://staging.heavenlytravel.my | `staging`  | Preview (branch `staging`) |
| PR previews | Vercel preview URL per PR     | `feat/*`, `fix/*` | Preview              |
| Local       | http://localhost:3000 (web)   | any        | —                          |

Deploys are automatic. Vercel builds every push; pushes to `main` go to production,
pushes to `staging` go to the staging domain, and every other branch gets a preview URL
posted on its PR.

## Branch model

```
feat/xyz ──PR, squash──▶ staging ──PR, merge commit──▶ main
                           │                             │
             staging.heavenlytravel.my       new.heavenlytravel.my
```

- `main`: what is live. Only changes through a release PR from `staging` (or a hotfix PR).
- `staging`: what is being tested. Feature PRs are squash-merged here.
- `feat/<name>`, `fix/<name>`, `chore/<name>`: short-lived work branches, always cut from `staging`.

## Day-to-day

### 1. Start work

```sh
git checkout staging
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

### 3. Open a PR into `staging`

```sh
git push -u origin feat/short-description
gh pr create --base staging --fill
```

Check the Vercel preview URL on the PR.

### 4. Merge into `staging`

Use **Squash and merge**. The squash commit message should read like a changelog line,
e.g. `feat(web): add landing page search bar`.

Then verify on https://staging.heavenlytravel.my and clean up:

```sh
git checkout staging
git pull
git branch -D feat/short-description
git push origin --delete feat/short-description   # if GitHub didn't delete it
```

### 5. Release to production

When staging is good, open a release PR from `staging` into `main`:

```sh
gh pr create --base main --head staging --title "release: YYYY-MM-DD"
```

Merge it with **Create a merge commit**. Never squash this PR (the ruleset on `main`
only allows merge commits, so GitHub won't offer squash).

> **Why not squash here?** Squashing `staging` into `main` creates a new commit on `main`
> that `staging` doesn't have. The branches drift apart, and every later release PR
> re-lists old commits and shows fake conflicts. A merge commit keeps them in sync.

## Hotfixes

For an urgent production bug that can't wait for the next release:

```sh
git checkout main
git pull
git checkout -b fix/short-description
# fix, commit, push
gh pr create --base main --fill
```

1. Merge the PR into `main` with a merge commit.
2. Bring the fix back into staging so it isn't lost on the next release:

   ```sh
   gh pr create --base staging --head main --title "chore: sync main into staging"
   ```

   Merge this one with **Create a merge commit** too (not squash).

## Merge method cheat sheet

| PR                    | Merge method       |
| --------------------- | ------------------ |
| `feat/*` → `staging`  | Squash and merge   |
| `staging` → `main`    | Create a merge commit |
| `fix/*` → `main`      | Create a merge commit |
| `main` → `staging`    | Create a merge commit |

## Guard rails (GitHub rulesets)

Configured under **Settings → Rules → Rulesets**:

| Ruleset             | Branch    | Rules                                                              |
| ------------------- | --------- | ------------------------------------------------------------------ |
| `main (production)` | `main`    | PR required, merge commit only, no force push, no deletion         |
| `staging`           | `staging` | PR required, squash or merge commit, no force push, no deletion    |

No approvals are required, so a solo developer can merge their own PRs. Raise
`required_approving_review_count` when the team grows.

## Vercel configuration

Each Vercel project (`web`, and `admin` if deployed separately) needs:

1. **Settings → Git → Production Branch**: `main`.
2. **Settings → Domains**:
   - `new.heavenlytravel.my` → Production (no Git branch).
   - `staging.heavenlytravel.my` → Git branch `staging`.
3. **DNS** (at the `heavenlytravel.my` DNS provider): `CNAME` records for `new` and
   `staging` pointing at the value Vercel shows (usually `cname.vercel-dns.com`).
4. **Settings → Environment Variables**:
   - Production values scoped to **Production**.
   - Staging values scoped to **Preview**, branch `staging`.
   - Optionally, generic preview values scoped to **Preview** (all branches) for PR previews.
5. Optional: **Settings → Deployment Protection** to password-protect staging and previews.

After changing environment variables, redeploy the branch for them to take effect.

## Optional next steps

- GitHub Actions workflow running `pnpm lint`, `pnpm check-types` and `pnpm build` on PRs
  into `staging` and `main`, then add it as a required status check in both rulesets.
- Release tags on `main` (e.g. `v2026.09.15`) for an easy rollback reference.
