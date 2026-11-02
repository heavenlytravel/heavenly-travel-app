"use client";

import { CONFIRM_EMAIL_FIELD, PASSWORD_MIN } from "@repo/db";
import { Field, Input } from "@repo/ui/field";

/**
 * What every form that gives someone an account asks beside the email:
 * the email typed again, not pasted, so a typo is caught before the
 * account is made, since the email is locked once saved; and a password,
 * which may be left empty for a code sent to the email at each sign-in.
 * The writers read them as `confirmEmail` and `password` (@repo/db's
 * `parseSignInCheck`). See docs/261102-direct-accounts.md.
 */
export function SignInFields({
  required = true,
  placeholder,
}: {
  /** False where the email itself is optional, as a driver's is. */
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <>
      <Field
        label="Confirm email"
        hint="Type it again, to catch a typo before the account is made."
      >
        <Input
          name={CONFIRM_EMAIL_FIELD}
          type="email"
          required={required}
          autoComplete="off"
          placeholder={placeholder}
          onPaste={(event) => event.preventDefault()}
        />
      </Field>
      <Field
        label="Password"
        hint={`Optional, at least ${PASSWORD_MIN} characters. Left empty, they sign in with a code sent to the email, and can add one later.`}
      >
        <Input
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={PASSWORD_MIN}
        />
      </Field>
    </>
  );
}
