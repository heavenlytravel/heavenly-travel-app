import { USER_LIMITS } from "@repo/db";
import { Field, Input } from "@repo/ui/field";
import { SignInFields } from "@repo/console/SignInFields";

/**
 * The email and the names of an account, in the panels that make one:
 * Create an account on All Users, Add admin on Admin, and a vendor's Set
 * owner, where the names are needed only for an email with no account
 * yet. The email is typed twice and a password may be set
 * (`SignInFields`). The server action reads them as `email`,
 * `confirmEmail`, `password`, `firstName` and `lastName`.
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
      <SignInFields placeholder={emailPlaceholder} />
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
