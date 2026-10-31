# Users, Pages by app, and Connect's footer

Status: decided with the user and built on 2026-10-31, after PR #62. Where this document
differs from `261030-sign-in-connect-onboarding-and-media.md`,
`261029-manage-signature-overhaul.md` or `261026-site-footer.md`, this one wins.

## Users (was Team)

- The menu section Team is **Users**: **Admin** (`/~/users/admin`, was Staff at `/~/team`,
  `admins.manage`) and **All Users** (`/~/users`, was Customers at `/~/team/customers`,
  `users.manage`). Old addresses are not redirected.
- All Users lists every account in the system: customers, admins, and Connect's vendor
  members and drivers. Two columns say where an account has access beyond the website:
  **Admin** (its level, from `AdminProfile`) and **Connect** (owner or staff of a vendor,
  from `VendorMember`, or a vendor's driver, from `Driver.userId`).
- Each account opens `/~/users/[id]`, in full control for SUPER:
  - its names (in Clerk) and phone (ours);
  - the email it signs in with, which Clerk takes as verified and primary, the old one
    removed, nothing sent to either address;
  - a new password, checked by Clerk, which signs the account out everywhere.
- Each change on that page is logged (`user.updated`, `user.email.changed`,
  `user.password.set`; never the password). The page also shows where the account has
  access, and its history.
- A vendor is still made and reviewed in Fleet > Vendors. Its page lists its Connect
  accounts (owner and staff), read only; the owner adds staff in Connect.
- Connect is organised by vendor, not by our teams: a vendor's owner adds and removes its
  staff at Connect's `/~/staff`. A driver is no member: they sign in with the email on their
  driver row and see their own jobs.

## Own account settings

In all three apps the account page shows the email but does not change it: our team does,
on request, in All Users. "Your profile" takes a photo, uploaded to Clerk
(`user.setProfileImage`), which the webhook mirrors into `User.imageUrl`.

## Pages by app

Pages opens into three rows: **Website** (`/~/pages/website`, its pages and its footer),
**Connect** (`/~/pages/connect`: its landing page at `/~/pages/connect/home`, its footer)
and **Locations**. Every location's pages are at `/~/pages/locations`; one location's at
`/[slug]/pages`. `/~/pages` leads to `/~/pages/locations`.

## The footer

- A registration in "Registered with" takes its name, its **Registration no** and an
  optional **certificate link**. With one, the badge opens it in a new tab. Publishing
  refuses a link that is not a web address or a path on the site, as it refuses one in the
  link columns and the copyright line; a social link must be a web address.
- **Connect's footer** is a second `SitePage` row, `connect-footer`, edited at
  `/~/pages/connect/footer`. It ends Connect's landing page. "Use same as Website footer",
  on until someone turns it off and publishes, shows the website's footer as published and
  follows it; off, Connect has its own, written and published as the website's is. On
  Connect, links to the website's pages and the marks it ships point at the customer site.
- The footer component is `SiteFooter` in `@repo/console`, drawn by both apps.
