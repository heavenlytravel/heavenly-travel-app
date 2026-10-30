"use client";

import { FormError } from "@repo/ui/form-error";
import { useActionForm } from "@repo/console/use-action-form";
import { VendorFieldsSection } from "@repo/console/VendorFieldsSection";
import { Send } from "lucide-react";
import { buttonClass } from "../_ui/button";
import { FormFrame } from "../_ui/FormFrame";
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
      <FormFrame>
        <VendorFieldsSection locations={locations} emailFixed={email} />
      </FormFrame>
      <div className="grid gap-3">
        <button
          type="submit"
          disabled={pending}
          className={buttonClass({ size: "lg", className: "w-full" })}
        >
          <Send aria-hidden className="size-5" />
          {pending ? "Sending…" : "Send for approval"}
        </button>
        <FormError error={error} />
      </div>
      {leaveDialog}
    </form>
  );
}
