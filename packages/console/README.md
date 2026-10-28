# @repo/console

The screens' shared parts for the two staff-facing apps, `apps/manage` and
`apps/connect`: cards, page headers, tables, skeletons, form errors, the
action-form hook and its states, and the fields the vehicle and driver forms
share. Source only, transpiled by each app (`transpilePackages`).

It is not `@repo/ui` because these parts read `@repo/db` (its vocabulary and
its types), and `@repo/ui` is built to `dist` with `tsc` on its own, with no
dependency on the database package.
