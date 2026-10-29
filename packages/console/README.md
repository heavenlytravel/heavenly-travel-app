# @repo/console

The console's own parts, for `apps/manage`: cards, page headers, tables,
skeletons, status chips, figure tiles, form errors and the menu's pieces,
in the console's "Signature" look (docs/261029-manage-signature-overhaul.md).
Source only, transpiled by the app (`transpilePackages`), and scanned by its
Tailwind build (`@source` in `apps/manage/app/globals.css`).

It is not `@repo/ui` because these parts read `@repo/db` (its vocabulary and
its types), and `@repo/ui` is built to `dist` with `tsc` on its own, with no
dependency on the database package. Anything the customer site shares stays
in `@repo/ui`.
