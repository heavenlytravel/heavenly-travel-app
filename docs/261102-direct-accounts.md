# Accounts made directly, and team access set by SUPER

Decided 2026-11-02. Everyone we add gets their account when they are added, so they sign
in without signing up. Before this, adding a driver only saved an email: a driver with no
account met "Couldn't find your account" at Connect's sign-in, and a vendor entered in
`manage.` had no owner and no way to get one.

## Who uses which app

| Who                               | App       |
| --------------------------------- | --------- |
| Our team, for our vendor ("ours") | `manage.` |
| Our drivers                       | Connect   |
| Other vendors' owners and staff   | Connect   |
| Other vendors' drivers            | Connect   |

Ours has no Connect accounts: Operation accepts its jobs in `manage.`.

## The rule

Every form that gives someone an account asks the **email twice** (the second box takes no
paste) and an **optional password**. Left empty, they sign in with a code sent to the
email, and can add a password later on their account page. The account is made in Clerk
with the email verified and mirrored here at once (`withAccount` in
`packages/db/src/accounts.ts`). An email that has an account already is linked, its
password left alone: typing one for it is refused.

A new account is made before the change it is for, since Clerk is outside the database
transaction, and is **undone in Clerk and here when the change is refused**, so a refused
form leaves no account behind. Clerk's webhook mirrors a user only while Clerk still holds
it (`upsertUserFromWebhook`), so an undone account does not come back as a row.

| Form                                  | Who                           | The account                                    |
| ------------------------------------- | ----------------------------- | ---------------------------------------------- |
| Add driver, `manage.` and Connect     | Operation, the vendor's owner | The driver's; email optional                   |
| Add vendor, `manage.`                 | Operation                     | The owner's; optional, named after the contact |
| Set or Replace owner, the vendor page | `SUPER`                       | The owner's                                    |
| Add staff, the vendor page            | `SUPER`                       | A vendor staff member's                        |
| Add to the team, Connect's Team       | The vendor's owner            | A vendor staff member's                        |
| Create an account, All Users          | `SUPER`                       | Anyone's                                       |
| Add admin, Admin                      | `SUPER`                       | An admin's                                     |

## A driver's email is locked

Once saved, a driver's email cannot be changed on the driver's form.

- **A typo:** delete the driver and add them again. Deleting a driver deletes their account
  too when it was made for that driver and never used (`deleteAccountIfUnused`): made in
  Clerk by Add driver for this very driver (its creation entry in Activity keeps
  `madeFor`), never signed in, and holding no booking, note, staff access, vendor or
  driver. An account the person had before always stays, used or not.
- **A real change of address:** All Users, Change email. The driver row follows the
  account's email.
- **Saved without an email:** one can be added later, once, with the same two boxes.
- **Saved with an email before this change, with no account:** the next save gives them one.

Connect now has a Delete driver card, so a vendor can fix its own typo.

## A vendor's owner and staff

Add vendor asks for the owner's email (optional, for a vendor not on Connect). After that,
the owner is `SUPER`'s: **Set owner** on the vendor's Connect Accounts card, or **Replace
owner** when it has one. The owner replaced leaves the vendor, and their account is deleted
when never used, as one made with a typo. An account that works for another vendor cannot
own or join this one.

Staff are added by the owner on Connect's Team, or by `SUPER` with **Add staff** on the
vendor's page, once it has an owner. Removing a staff member, in either place, deletes
their account when never used, as deleting a driver does.

## Signing in

Checked on the development Clerk instance on 2026-11-02: an account made this way has its
email verified, and Connect's sign-in offers it an email code, or its password and a code
when one was set. An email no one added still gets "Couldn't find your account". Check that the
production instance has email code sign-in on too before relying on it there.

## Emails

**Off since 2026-11-02**, until the emails are worked on again: `EMAILS_ON` in
`packages/db/src/email-switch.ts` is false, so `@repo/email` logs each email's key and
sends none, from the website, the console and Connect alike. The screens that said "we
emailed you" read the same switch: the website's booking received page says we will
contact them, and Connect's registration says we WhatsApp the vendor once approved. Clerk's
own sign-in codes are not ours and still go out. When emails are on, a driver a vendor
adds in Connect gets "added you on Heavenly Travel Connect" (`driverAddedEmails`).

## Team access

Which teams hold each permission was code only, so a change needed a deployment. Now:

- **The code keeps the list of permissions and the default teams** of each
  (`packages/db/src/permissions.ts`), and the words Admin names each one with
  (`PERMISSION_LABELS`, typed by `Permission`, so a new permission cannot ship without
  its row on Admin).
- **SUPER changes the teams of a team rule** on Admin, What each team can do: rows grouped
  by the part of Manage they open (`PERMISSION_GROUPS`), the view-only ones marked; tick
  the teams, Save. A box away from its default shows amber; fixed rows show disabled
  boxes. Reset to defaults puts every rule back. Each change is in Activity with the
  teams before and after.
- **Only what differs from the defaults is stored**, in `AppSetting.accessRules` (JSON,
  read by `ruleOverridesOf`, which drops what the code does not know). A rule set back to
  its default stores nothing, so a later change of that default in code reaches it, and a
  new permission works with its defaults on deployment, with no data script.
- **Fixed rows:** the `SUPER`-only permissions (Admin, All Users, the wall, vendor review
  and Connect accounts, adding and activating a location) and the every-admin ones (a
  location, Activity) cannot be given to a team. Settings opens for whoever holds one of
  its cards, so it follows the cards.
- **Cost:** none per request. The wall was already read from `AppSetting` once per
  request (`getAccessPolicy`, a React `cache`); the rules come in the same query.
