import { isValidEmail, normalizeEmail } from "./booking-contact";
import { refuse } from "./change";
import { textOf, type Parsed } from "./fields";
import { isValidPhone, normalizePhone } from "./phone";

/**
 * What the Users screen asks to create an account on someone's behalf,
 * and the rules it checks, pure and browser-safe. The writer in ./users
 * makes the account in Clerk and mirrors it here.
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
  const email = normalizeEmail(textOf(values.email));
  const firstName = textOf(values.firstName);
  const lastName = textOf(values.lastName);
  const typedPhone = textOf(values.phone);
  const phone = typedPhone ? normalizePhone(typedPhone) : null;

  if (!email) return refuse("Enter their email.", "email");
  if (!isValidEmail(email)) {
    return refuse("Enter an email like name@example.com.", "email");
  }
  if (!firstName) return refuse("Enter their first name.", "firstName");
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
