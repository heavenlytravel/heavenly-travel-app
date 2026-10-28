"use client";

import { Button } from "@repo/ui/button";
import { FormError } from "@repo/console/FormError";
import { useActionForm } from "@repo/console/use-action-form";
import { VendorFieldsSection } from "@repo/console/VendorFieldsSection";
import { registerVendorAction } from "./actions";

/**
 * Connect's registration: the vendor's fields as the admin's form has
 * them, the email fixed to the account's. Sent, the vendor waits for
 * approval.
 */
export function RegisterForm({
  email,
  locations,
}: {
  email: string;
  /** The locations live on the website. */
  locations: { id: string; name: string }[];
}) {
  const { pending, error, formProps, leaveDialog } = useActionForm(
    registerVendorAction,
    {
      done: "Sent. We check every vendor and email you once Connect opens.",
      leave: "Your registration is not sent.",
    },
  );
  return (
    <form {...formProps} className="grid gap-6">
      <VendorFieldsSection locations={locations} emailFixed={email} />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Sending…" : "Send for approval"}
        </Button>
        <FormError error={error} />
      </div>
      {leaveDialog}
    </form>
  );
}
