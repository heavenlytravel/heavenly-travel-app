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
 * What Customers asks to create an account on someone's behalf, and Staff
 * to add a member, and the rules they check, pure and browser-safe. The
 * writer in ./accounts makes the account in Clerk and mirrors it here;
 * ./admins gives it its level and teams.
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
  const firstName = textOf(values.firstName);
  const lastName = textOf(values.lastName);
  const typedPhone = textOf(values.phone);
  const phone = typedPhone ? normalizePhone(typedPhone) : null;

  if (!email) return refuse("Enter their email.", "email");
  if (!isValidEmail(email)) {
    return refuse("Enter an email like name@example.com.", "email");
  }
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
  return { ok: true, value: { email, firstName, lastName, phone } };
}

/** What a member of staff is given: a level, and the teams whose work is theirs. */
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
