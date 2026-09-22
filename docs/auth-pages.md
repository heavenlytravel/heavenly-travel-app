# Auth pages: sign in and sign up

The plan for the sign-in and sign-up pages on both apps, and what is deferred.
Read `auth-and-database.md` first for how sessions and access work.

## Routes and methods

| App   | Route      | Sign up           | Method     |
| ----- | ---------- | ----------------- | ---------- |
| web   | `/sign-in` | link to sign-up   | email code |
| web   | `/sign-up` | yes               | email code |
| admin | `/sign-in` | none, invite-only | email code |

Email code (OTP) is the only method turned on in the Clerk dashboard. There is no
password and no social login yet. Both apps share one Clerk instance, so an admin signs
in with the same account they use as a customer (see `auth-and-database.md`).

## PR 1: branded pages on Clerk's prebuilt components (this PR)

Clerk's `<SignIn />` and `<SignUp />` stay. They already handle the email code flow,
resend, errors and the return URL. What changes is everything around and inside them:

- **`AuthShell` in `packages/ui`** owns the page layout for both apps: an optional
  photo panel on the left from `lg` up, the form column with a brand slot at the top,
  an eyebrow line above the form and a footer link. Light and dark tones.
- **`clerkAppearance` in `packages/ui`** is the one Clerk theme: the home page palette
  (deep green `#073c36`, ink `#082f2b`, gold `#caa243`), the card radius and shadow,
  and `fontFamily: inherit` so the card takes the fonts of the page it sits on. Both
  apps pass it to `ClerkProvider`, so `UserButton` and every other Clerk component
  match too.
- **Web** wraps both pages in `AuthPage` (`apps/web/app/_components/AuthPage.tsx`):
  the home page fonts, the logo linking home, the Langkawi hero photo with the
  "Travel made simple." headline on the left, and a "Back to Heavenly Travel" link.
  On mobile the photo panel is hidden and the logo sits above the form.
- **Admin** uses the dark tone with the eyebrow "Admin portal", the logo inside the
  card, no sign-up link and no footer. The `/no-access` page uses the same shell so a
  signed-in customer who is not staff sees the same page family, not an error page.

Not in scope: changing anything in `getAccess`, `requireAdmin` or the Clerk dashboard.

## PR 2 (future): custom UI and flow for authentication

Only if the themed pages are not enough. Two options, in order of preference:

1. **Clerk Elements.** Unstyled primitives; Clerk still runs the sign-in state machine
   (start, verify code, resend, errors) and we own the markup. Check its release
   status first; it was labelled beta.
2. **`useSignIn` / `useSignUp` hooks.** Full control, and full responsibility: every
   step, every error string, every loading state written by hand.

Either way the swap happens inside `AuthShell`'s children only. The shell, the
palette and the page copy from PR 1 stay. Things a custom flow must keep:

- Email code as the only first factor, with resend and an "edit email" step.
- The return URL (`redirect_url`) so a customer lands back where they started.
- The second-factor step, if MFA is later required for admins.
- Sign-up on the web only; admin stays invite-only.
- Bot protection (Clerk's prebuilt components include it; a custom form must add it).
