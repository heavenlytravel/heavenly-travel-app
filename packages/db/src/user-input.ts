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
 * browser-safe. The writers in ./accounts make and change the account in
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
};

/** The create form's values, read and checked. The email and first name are required. */
export function parseNewUser(
  values: Record<string, unknown>,
): Parsed<NewUserFields> {
  return readUser(values, true);
}

/**
 * Add staff's account fields, read as `parseNewUser` reads them, but a
 * blank first name passes: an email with an account keeps its names, and
 * only one without needs them, which `addStaff` knows.
 */
export function parseNewStaff(
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
  return profile.ok
    ? { ok: true, value: { email, ...profile.value } }
    : profile;
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
