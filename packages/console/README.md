# @repo/console

The screens' shared parts for the two staff-facing apps, `apps/manage` and
`apps/connect`: cards, page headers, tables, skeletons, status chips, figure
tiles and the menu's pieces in the console's "Signature" look
(docs/261029-manage-signature-overhaul.md), and the action-form hook, its
states and the vehicle and driver forms both apps use. Source only,
transpiled by each app (`transpilePackages`), and scanned by its Tailwind
build (`@source` in each app's `globals.css`).

It is not `@repo/ui` because these parts read `@repo/db` (its vocabulary and
its types), and `@repo/ui` is built to `dist` with `tsc` on its own, with no
dependency on the database package. Anything the customer site shares stays
in `@repo/ui`.
