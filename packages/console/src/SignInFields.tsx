"use client";

import {
  CONFIRM_EMAIL_FIELD,
  CONFIRM_PASSWORD_FIELD,
  PASSWORD_MIN,
} from "@repo/db";
import { Field, Input } from "@repo/ui/field";
import { PasswordInput } from "@repo/ui/secret";

/** The email typed again, not pasted, read as `confirmEmail` (@repo/db's `checkEmailConfirmed`). */
export function ConfirmEmailField({
  required,
  placeholder,
  hint,
}: {
  required: boolean;
  placeholder?: string;
  hint: string;
}) {
  return (
    <Field label="Confirm email" hint={hint}>
      <Input
        name={CONFIRM_EMAIL_FIELD}
        type="email"
        required={required}
        autoComplete="off"
        placeholder={placeholder}
        onPaste={(event) => event.preventDefault()}
      />
    </Field>
  );
}

/**
 * What every form that gives someone an account asks beside the email:
 * the email typed again, not pasted, so a typo is caught before the
 * account is made, since the email is locked once saved; and a password,
 * typed twice, which may be left empty for a code sent to the email at
 * each sign-in. The writers read them as `confirmEmail`, `password` and
 * `confirmPassword` (@repo/db's `parseSignInCheck`). See docs/261102-direct-accounts.md.
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
      <ConfirmEmailField
        required={required}
        placeholder={placeholder}
        hint="Type it again, to catch a typo before the account is made."
      />
      <Field
        label="Password"
        hint={`Optional, at least ${PASSWORD_MIN} characters. Left empty, they sign in with a code sent to the email, and can add one later.`}
      >
        <PasswordInput
          name="password"
          autoComplete="new-password"
          minLength={PASSWORD_MIN}
        />
      </Field>
      <Field label="Confirm password" hint="Only when a password is set above.">
        <PasswordInput
          name={CONFIRM_PASSWORD_FIELD}
          autoComplete="new-password"
        />
      </Field>
    </>
  );
}
