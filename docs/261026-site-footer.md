# The site footer: written in the console, on every page

Status: decided with the user on 2026-10-26 and built on the same day, after PR #53.
Where this document differs from `261025-marketing-pages.md`, this one wins.

Until now the footer was code: `SiteFooter` in the web app read the company's details from
`COMPANY` in `contact.ts`, and every marketing page ended with a dark blue closing call
("Tell us where you want to go.") above it. The booking, account and sign-in pages had no
footer at all.

## Decisions

- **The closing call is removed** from the home page, the location pages and the site's
  documents, with its "Get my price" and "WhatsApp us". A location page keeps the room it
  left above the footer.
- **The footer is on every page of the customer site**: the home page, the location pages,
  the site's documents, booking and account (signed in or not) and sign-in and sign-up.
  Never in the console. A page the framework answers itself, such as its default 404, has
  none.
- **Its layout is design C** from the 261026 mock-ups, with these changes from the user:
  - no Services column, since each location lists its own services;
  - the social links are a "Follow us on" column, each network with its icon and name,
    not buttons under the tagline;
  - "Company" is renamed "About Heavenly Travel";
  - the payment logos sit in white tiles, as on other Malaysian travel sites. HitPay is
    the planned gateway.
- **From top to bottom** the footer has:
  - the logo and the tagline;
  - the link columns, "Follow us on" and "Get in touch";
  - "Registered with" (each body's logo, name and a line such as the member number) beside
    "Payment partners" (the logo tiles and an optional line under them);
  - the copyright line, with the registration and links such as the terms.

  A part with nothing in it is left out, and the dark strip under the old footer is gone.

- **SUPER writes all of it** in the console at `/pages/website/footer`, listed under Pages
  as the website's last row (`website.manage`). Only the logo stays in code. The footer
  works as a site page does: a draft, Preview (the home page's preview shows the saved
  draft), Publish, Compare and History. It goes live on every page at once and stays
  published once it is.
- **Before the first publish** the site shows `defaultFooterContent`. It holds today's
  company details (what `COMPANY` held, which is deleted) and the home page's top choices
  as the destinations. The editor opens on the same default.
- **A link** opens a site page, a location's main page or any address (a web address, a
  path on the site, an email or a phone link). A link to a site page that is not
  published, or to a location the public does not see, is left out of the footer until
  it is, so none leads to a 404. The editor marks such a link "Left out until …".
- **Contact us** shows the company's name, office, registration, phone, email and
  WhatsApp from the footer, public or draft, so the two never disagree.
- **The booking emails and the ops WhatsApp link** in the booking form and on a paused
  location keep `CONTACT` in code: they are the ops line, not the footer's text.
- **Images** are uploaded in the editor, like a page's. The registrations take one logo
  each; the payment logos are chosen several at once, each with its name as alt text.
  Media counts them as used by "Site · Footer", and a footer publish's old logos as past
  versions, so "delete unused" never takes one the footer shows.

## How it is built

- `packages/db/src/footer-content.ts` (browser-safe):
  - the content's shape and its reader `footerContentOf`;
  - the limits, the checks for a save (`checkFooterLimits`) and a publish
    (`footerProblems`, `checkFooterComplete`);
  - the default, the link addresses, `visibleFooterOf`, which leaves out links the public
    cannot open, and the phone and WhatsApp links for Malaysian numbers.
- `packages/db/src/site-footer.ts` (server): the footer is kept in its own `SitePage` row
  under the key `footer`, which no site page takes, so there is no schema change and no
  `db:push`. Saving and publishing share `page-writes.ts` with the pages: the version
  check, the columns and the log. A publish is logged as `site.footer.published` against
  the `site-page` entity `footer`, with the whole content before and after.
- The customer site caches the published footer under the `site-pages` tag, which a
  publish refreshes. The list of public locations its links are checked against is cached
  under `top-choices`, which every change to a location's standing already refreshes.
- The console shares the editor's publish bar (`PublishBar`) and its Ctrl+S
  (`useSaveShortcut`) with the page editor. `/pages/website/history/[entryId]` opens a
  footer publish too.

## Future work

- The 404 page has no footer: the site has no `not-found` page of its own yet.
- The footer's text is English only, as the pages are; Malay is future work.
- Text sizes across both apps are a separate task: `261026-text-sizes.md`.
