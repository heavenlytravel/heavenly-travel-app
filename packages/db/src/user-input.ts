import { isValidEmail, normalizeEmail } from "./booking-contact";
import { refuse } from "./change";
import { textOf, type Parsed } from "./fields";
import { isValidPhone, normalizePhone } from "./phone";
import {
  adminTeamsOf,
  isAdminLevel,
  needsTeam,
  type AdminLevel,
  type AdminTeam,
} from "./roles";

/**
 * What All Users asks to create an account on someone's behalf or change
 * one, and Admin to add a member, and the rules they check, pure and
 * browser-safe. The email is typed twice and a password may be set, as on
 * every form that gives someone an account. The writers in ./accounts make and change the account in
 * Clerk and mirror it here; ./admins gives it its level and teams.
 */

export const USER_LIMITS = { name: 80 } as const;

export type NewUserFields = {
  /** In lower case, as Clerk stores it. */
  email: string;
  firstName: string;
  /** "" for none. */
  lastName: string;
  /** As ./phone keeps it; null for none. */
  phone: string | null;
  /** Set on a new account; null, they sign in with a code sent to the email. */
  password: string | null;
};

/**
 * The second email box of every form that gives someone an account,
 * typed again so a typo is caught before the account is made: the email
 * is locked once saved. See docs/261102-direct-accounts.md.
 */
export const CONFIRM_EMAIL_FIELD = "confirmEmail";

/** The email typed twice, the same both times; both empty passes, for a form where it is optional. */
export function checkEmailConfirmed(
  values: Record<string, unknown>,
  email: string | null,
): Parsed<null> {
  const again = normalizeEmail(textOf(values[CONFIRM_EMAIL_FIELD]));
  if ((email ?? "") === again) return { ok: true, value: null };
  return refuse(
    again
      ? "The two emails differ. Type the same email in both."
      : "Type the email again to confirm it.",
    CONFIRM_EMAIL_FIELD,
  );
}

/**
 * The second password box of every form that sets one, typed again so a
 * typo is caught before it locks them out. Checked here, on the server, as
 * the email typed again is.
 */
export const CONFIRM_PASSWORD_FIELD = "confirmPassword";

/** A new password, long enough and typed the same twice. */
export function parseConfirmedPassword(
  values: Record<string, unknown>,
): Parsed<string> {
  const password = parseNewPassword(values.password);
  if (!password.ok) return password;
  if (values[CONFIRM_PASSWORD_FIELD] === password.value) return password;
  return refuse(
    values[CONFIRM_PASSWORD_FIELD]
      ? "The two passwords differ. Type the same password in both."
      : "Type the password again to confirm it.",
    CONFIRM_PASSWORD_FIELD,
  );
}

/** The password a form may set on a new account: none when left empty. */
function parseOptionalPassword(
  values: Record<string, unknown>,
): Parsed<string | null> {
  if (typeof values.password !== "string" || values.password === "") {
    return { ok: true, value: null };
  }
  return parseConfirmedPassword(values);
}

/**
 * What a form that gives someone an account asks besides the email: the
 * email again, and a password if one is set, typed twice. Left empty, they sign in
 * with a code sent to the email.
 */
export function parseSignInCheck(
  values: Record<string, unknown>,
  email: string | null,
): Parsed<string | null> {
  const confirmed = checkEmailConfirmed(values, email);
  if (!confirmed.ok) return confirmed;
  return parseOptionalPassword(values);
}

/** The create form's values, read and checked. The email and first name are required. */
export function parseNewUser(
  values: Record<string, unknown>,
): Parsed<NewUserFields> {
  return readUser(values, true);
}

/**
 * The account fields of a form that gives an email its account, or the
 * one it has (Add admin, a vendor's Set owner), read as `parseNewUser`
 * reads them, but a blank first name passes: an email with an account
 * keeps its names, and only one without needs them, which ./accounts
 * knows.
 */
export function parseAccountFor(
  values: Record<string, unknown>,
): Parsed<NewUserFields> {
  return readUser(values, false);
}

function readUser(
  values: Record<string, unknown>,
  firstNameRequired: boolean,
): Parsed<NewUserFields> {
  const email = normalizeEmail(textOf(values.email));
  if (!email) return refuse("Enter their email.", "email");
  if (!isValidEmail(email)) {
    return refuse("Enter an email like name@example.com.", "email");
  }
  const profile = readProfile(values, firstNameRequired);
  if (!profile.ok) return profile;
  const password = parseSignInCheck(values, email);
  if (!password.ok) return password;
  return {
    ok: true,
    value: { email, ...profile.value, password: password.value },
  };
}

/** The names and the phone a form typed, checked. */
function readProfile(
  values: Record<string, unknown>,
  firstNameRequired: boolean,
): Parsed<UserProfileFields> {
  const firstName = textOf(values.firstName);
  const lastName = textOf(values.lastName);
  const typedPhone = textOf(values.phone);
  const phone = typedPhone ? normalizePhone(typedPhone) : null;

  if (!firstName && firstNameRequired) {
    return refuse("Enter their first name.", "firstName");
  }
  for (const [key, value] of [
    ["firstName", firstName],
    ["lastName", lastName],
  ] as const) {
    if (value.length > USER_LIMITS.name) {
      return refuse(`A name is at most ${USER_LIMITS.name} characters.`, key);
    }
  }
  if (phone !== null && !isValidPhone(phone)) {
    return refuse("Enter a phone number the team can call.", "phone");
  }
  return { ok: true, value: { firstName, lastName, phone } };
}

/** What All Users edits on an account's profile; the email and password have forms of their own. */
export type UserProfileFields = {
  firstName: string;
  /** "" for none. */
  lastName: string;
  /** As ./phone keeps it; null for none. */
  phone: string | null;
};

export const USER_PROFILE_FIELDS = ["firstName", "lastName", "phone"] as const;

export const USER_PROFILE_LABELS: Record<
  (typeof USER_PROFILE_FIELDS)[number],
  string
> = { firstName: "first name", lastName: "last name", phone: "phone" };

/** The profile form's values, read and checked. The first name is required. */
export function parseUserProfile(
  values: Record<string, unknown>,
): Parsed<UserProfileFields> {
  return readProfile(values, true);
}

/** An email typed for an account, in lower case, checked. */
export function parseUserEmail(value: unknown): Parsed<string> {
  const email = normalizeEmail(textOf(value));
  if (!email) return refuse("Enter the new email.", "email");
  if (!isValidEmail(email)) {
    return refuse("Enter an email like name@example.com.", "email");
  }
  return { ok: true, value: email };
}

/** Clerk's shortest password; Clerk checks the rest, such as a leaked one. */
export const PASSWORD_MIN = 8;

/** A password staff type for an account, checked as far as we can before Clerk. */
export function parseNewPassword(value: unknown): Parsed<string> {
  const password = typeof value === "string" ? value : "";
  if (password.length < PASSWORD_MIN) {
    return refuse(
      `A password is at least ${PASSWORD_MIN} characters.`,
      "password",
    );
  }
  return { ok: true, value: password };
}

export type StaffAccess = { level: AdminLevel; teams: AdminTeam[] };

export const NO_TEAM_ERROR =
  "A REGULAR admin needs at least one team. Tick one.";

/**
 * The level and the teams a staff form asks, read and checked: SUPER, or
 * REGULAR with at least one team. A team this code does not know is
 * dropped. `teams` is every value the form posts under the name.
 */
export function parseStaffAccess(
  level: unknown,
  teams: readonly unknown[],
): Parsed<StaffAccess> {
  if (!isAdminLevel(level)) return refuse("Choose a level.", "level");
  const access = { level, teams: adminTeamsOf(teams) };
  if (needsTeam(access)) return refuse(NO_TEAM_ERROR, "teams");
  return { ok: true, value: access };
}
