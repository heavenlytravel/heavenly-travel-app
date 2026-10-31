"use client";

import { Button } from "@repo/ui/button";
import { Field, Input } from "@repo/ui/field";
import { FormError } from "@repo/ui/form-error";
import { Card, CardTitle } from "@repo/console/Card";
import { useActionForm } from "@repo/console/use-action-form";
import {
  changeUserEmailAction,
  setUserPasswordAction,
  updateUserProfileAction,
} from "../actions";

/** The names Clerk keeps and the phone we keep, as the account's own settings change them. */
export function ProfileForm({
  user,
}: {
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
  };
}) {
  const { pending, error, formProps, leaveDialog } = useActionForm(
    updateUserProfileAction,
    { done: "Profile saved.", leave: "The changes to the profile are lost." },
  );
  return (
    <Card>
      <CardTitle description="Their name in Clerk, on their bookings and in Connect, and the phone the team calls.">
        Profile
      </CardTitle>
      <form {...formProps} className="grid gap-4">
        <input type="hidden" name="userId" value={user.id} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name">
            <Input
              name="firstName"
              autoComplete="off"
              defaultValue={user.firstName ?? ""}
              required
            />
          </Field>
          <Field label="Last name">
            <Input
              name="lastName"
              autoComplete="off"
              defaultValue={user.lastName ?? ""}
            />
          </Field>
        </div>
        <Field label="Phone">
          <Input
            name="phone"
            type="tel"
            autoComplete="off"
            placeholder="+60 12-345 6789"
            defaultValue={user.phone ?? ""}
          />
        </Field>
        <div>
          <Button type="submit" pending={pending}>
            {pending ? "Saving…" : "Save profile"}
          </Button>
        </div>
        <FormError error={error} />
      </form>
      {leaveDialog}
    </Card>
  );
}

/** The email they sign in with, changed at once, as verified. */
export function EmailForm({ user }: { user: { id: string; email: string } }) {
  const { pending, error, formProps } = useActionForm(changeUserEmailAction, {
    done: "Email changed.",
  });
  return (
    <Card>
      <CardTitle description="How they sign in, and where their codes and booking emails go. It changes at once, taken as confirmed, and nothing is sent to either address: tell them.">
        Email
      </CardTitle>
      <form {...formProps} className="grid gap-4">
        <input type="hidden" name="userId" value={user.id} />
        <Field label="Email">
          <Input
            name="email"
            type="email"
            autoComplete="off"
            defaultValue={user.email}
            required
          />
        </Field>
        <div>
          <Button type="submit" pending={pending}>
            {pending ? "Changing…" : "Change email"}
          </Button>
        </div>
        <FormError error={error} />
      </form>
    </Card>
  );
}

/** A new password, which Clerk checks, and which signs them out everywhere. */
export function PasswordForm({
  user,
  minLength,
}: {
  user: { id: string };
  minLength: number;
}) {
  const { pending, error, formProps } = useActionForm(setUserPasswordAction, {
    done: "Password set. They are signed out everywhere.",
    reset: true,
  });
  return (
    <Card>
      <CardTitle description="Sets a new password and signs them out of every device, so only the new one opens the account. Nothing is sent to them: tell them the password yourself.">
        Password
      </CardTitle>
      <form {...formProps} className="grid gap-4">
        <input type="hidden" name="userId" value={user.id} />
        <Field
          label="New password"
          hint={`At least ${minLength} characters. Clerk refuses one found in a data leak.`}
        >
          <Input
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={minLength}
            required
          />
        </Field>
        <div>
          <Button type="submit" pending={pending}>
            {pending ? "Setting…" : "Set password"}
          </Button>
        </div>
        <FormError error={error} />
      </form>
    </Card>
  );
}
