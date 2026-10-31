import { USER_LIMITS } from "@repo/db";
import { Field, Input } from "@repo/ui/field";

/**
 * The email and the names of an account, in the panels that make one:
 * Create an account on All Users, and Add admin on Admin, where the names
 * are needed only for an email with no account yet. The server action
 * reads them as `email`, `firstName` and `lastName`.
 */
export function AccountFields({
  firstNameRequired,
  emailPlaceholder,
}: {
  firstNameRequired: boolean;
  emailPlaceholder: string;
}) {
  return (
    <>
      <Field label="Email">
        <Input
          name="email"
          type="email"
          required
          autoComplete="off"
          placeholder={emailPlaceholder}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="First name"
          hint={
            firstNameRequired ? undefined : "For an email with no account yet."
          }
        >
          <Input
            name="firstName"
            required={firstNameRequired}
            autoComplete="off"
            maxLength={USER_LIMITS.name}
          />
        </Field>
        <Field label="Last name">
          <Input
            name="lastName"
            autoComplete="off"
            maxLength={USER_LIMITS.name}
          />
        </Field>
      </div>
    </>
  );
}

/** Under a panel that makes an account: how its person signs in, since no one sets a password for them. */
export function NoPasswordNote() {
  return (
    <p className="text-xs text-muted">
      An account made here has no password. They sign in with a code sent to
      that email, and can add a password from their account.
    </p>
  );
}
