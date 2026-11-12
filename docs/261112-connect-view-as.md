# Connect: view as a vendor or driver

2026-11-12. Built on `feat/connect-view-as`.

The team wants to see Connect as Vendor A or Driver C sees it, to answer their questions
and check what a screen shows them. A SUPER admin can view Connect as a vendor's member or a
driver, read only, until they exit or sign out. The other options are kept below so the choice can be made
again.

## Options

|                                     | For                                                                                      | Against                                                                                                                                                                                                                                                              |
| ----------------------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A. Clerk impersonation**          | Exactly what they see, little code (Clerk actor tokens).                                 | Full write power unless the code refuses on the `act` claim; the log names the vendor unless it reads `act`. 5 impersonations a month free, unlimited on Clerk's Administration add-on (US$100 a month). Starting one signs the admin out of Manage in that browser. |
| **B. Read-only view as** (picked)   | Never acts for anyone. No cap, no cost, same browser. Admin stays themself in every log. | Our own code: a cookie, the gate, the banner, the confirm page.                                                                                                                                                                                                      |
| **C. Preview inside Manage**        | Nothing to sign in to.                                                                   | Connect's screens copied into Manage; two places to keep alike.                                                                                                                                                                                                      |
| **D. SUPER in Connect as themself** | Simple to say.                                                                           | Not what a vendor sees, which is the point.                                                                                                                                                                                                                          |

A started as the simplest; its monthly cap and the sign-out turned the choice to B.

## How it works

1. **Entry.** A SUPER has "View as" in Connect's places (the sidebar, and the tabs on a
   phone when they are a vendor's member), leading to `/~/view-as`. One with no vendor or
   driver account of their own lands there from Connect's home. It lists everyone with a
   Connect account, by vendor (owner, staff, and drivers with an account), with a search. A
   row's View starts the view at once, a POST. A driver's page in Manage also has "View in
   Connect", opening `/~/view-as/<userId>` in a new tab with Start. Anyone not SUPER is
   told they cannot view. Any account but one's own may be viewed, an admin's too: the view
   is read only, and Connect grants nothing for being an admin (staff often test with their
   own admin accounts).
2. **The cookie.** Start sets `connect.view-as`: HttpOnly, Secure in production,
   SameSite=Lax, Connect's host only, with no expiry, so it goes when the browser closes. It
   holds the account's id and the admin's Clerk session id, `<userId>.<sessionId>`
   (`packages/db/src/view-as.ts`). It grants nothing: on every request `getConnectAccess`
   checks the signed-in person is SUPER, in the same sign-in, and the account is viewable;
   otherwise it is ignored. Signing out ends the view, and a new sign-in never takes it up.
3. **Access.** `getConnectAccess` then answers the viewed account's access, the same rows and
   screens it would see, with `viewAs: { adminId, adminName, label }`. Viewing a
   staff member shows the staff's screens; viewing a suspended vendor's owner shows the
   suspended screen.
4. **Writes refuse, in one place.** `getDriverAccess`, `getMemberAccess` and
   `getRegistrantAccess` in `apps/connect/app/_lib/access.ts` answer null while `viewAs` is
   set, so every action and the upload route refuse, with "Viewing as someone is read only."
   Buttons stay, so the screen is what they see. `view-as-gate.test.ts` checks every
   `"use server"` export and API route asks one of them.
5. **Reads that write.** Opening a job with the customer's details logs
   `booking.contact.viewed` against the admin, with `viewAs: <name>`, so PDPA's log says who
   saw it. The account page hides the sign-in settings while viewing: they are always the
   signed-in admin's own.
6. **The pill.** Every screen (`Screen`) has a dark pill floating at the foot of the window,
   as the site's staff preview bar, above a phone's tabs: "Viewing as Vendor A · read only",
   with Switch, back to the list, and Exit, which clears the cookie and returns to the list.
   It takes no room, so the screen is laid out as the account sees it. It is the site's
   preview pill, `FloatingPill` in `@repo/ui`: it folds into a round button with a dot and
   widens back, animated, and stays folded from page to page in that tab.
7. **The log.** `connect.view-as.started` and `.ended` on the account's history, area
   Team, which only SUPERs see; vendors and drivers see no history in Connect. A view ended
   by closing the browser or signing out has no `.ended`.

## Safety and privacy

- **No data beyond Manage's.** A SUPER already sees all of it in Manage.
- **Never acts as anyone.** No session of theirs is made. Writes fail closed in the gates;
  the test keeps new actions on them.
- **No escalation through the cookie.** It names an account and nothing else. Without a
  SUPER's own session it does nothing.
- **Accountability.** Start, end and each customer's details seen are logged under the
  admin's name.
- **PDPA.** Viewing vendors' and drivers' data for support is within why it was collected.
  The team checks the privacy policy covers support access.

## Kept for later

- **Who may view.** SUPER only. Later a team permission, such as `connect.view-as`.
- **Acting for a vendor.** Stays Manage's job.
- **Hiding the customer's details while viewing**, rather than logging them.
- **A time limit** on a view: dropped for now, as it is read only and tied to the sign-in.
