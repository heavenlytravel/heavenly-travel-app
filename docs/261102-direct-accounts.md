# Accounts made directly: drivers, vendor owners, admins

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
form leaves no account behind.

| Form                                  | Who                           | The account                                    |
| ------------------------------------- | ----------------------------- | ---------------------------------------------- |
| Add driver, `manage.` and Connect     | Operation, the vendor's owner | The driver's; email optional                   |
| Add vendor, `manage.`                 | Operation                     | The owner's; optional, named after the contact |
| Set or Replace owner, the vendor page | `SUPER`                       | The owner's                                    |
| Create an account, All Users          | `SUPER`                       | Anyone's                                       |
| Add admin, Admin                      | `SUPER`                       | An admin's                                     |

## A driver's email is locked

Once saved, a driver's email cannot be changed on the driver's form.

- **A typo:** delete the driver and add them again. Deleting a driver deletes their account
  too when it was never used (`deleteAccountIfUnused`): never signed in, and holding no
  booking, note, staff access, vendor or driver. A used account always stays.
- **A real change of address:** All Users, Change email. The driver row follows the
  account's email.
- **Saved without an email:** one can be added later, once, with the same two boxes.
- **Saved with an email before this change, with no account:** the next save gives them one.

Connect now has a Delete driver card, so a vendor can fix its own typo.

## A vendor's owner

Add vendor asks for the owner's email (optional, for a vendor not on Connect). After that,
the owner is `SUPER`'s: **Set owner** on the vendor's Connect Accounts card, or **Replace
owner** when it has one. The owner replaced leaves the vendor, and their account is deleted
when never used, as one made with a typo. An account that works for another vendor cannot
own this one.

## Emails

Console emails are off until `manage.` has its email settings (PR #64), so nothing is sent
from `manage.`. A driver a vendor adds in Connect gets "added you on Heavenly Travel
Connect" with the sign-in link (`driverAddedEmails` in `packages/email`).

## Not changed

- Connect's Team, where an owner adds staff by email, still needs an account that exists.
  Its message points to a sign-up Connect does not have; it should give the account as
  Add driver does, with a name field.
