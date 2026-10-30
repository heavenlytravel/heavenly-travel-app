import type { Metadata } from "next";
import { SignInFlow } from "@repo/auth/SignInFlow";
import { ACCOUNT_HREF } from "../../_lib/routes";

export const metadata: Metadata = { title: "Sign in | Manage" };

// Staff access is invite-only: a SUPER admin makes the account or promotes
// an existing one. Nothing here offers a way to sign up.
export default function SignInPage() {
  return (
    <SignInFlow
      portal="Manage"
      accountPath={ACCOUNT_HREF}
      noAccount="Staff accounts are made by a SUPER admin: ask yours to add you with this email."
    />
  );
}
