import type { Metadata } from "next";
import Link from "next/link";
import { SignInFlow } from "@repo/auth/SignInFlow";
import { ACCOUNT_PATH } from "../../_ui/nav";

export const metadata: Metadata = { title: "Sign in | Connect" };

// A vendor's owner signs up by registering the business; a driver signs in
// with the email their vendor or Operation entered on their driver row,
// which links their account. See docs/261028-fulfilment-vendors-and-connect.md,
// "Signing up".
export default function SignInPage() {
  return (
    <SignInFlow
      portal="Connect"
      accountPath={ACCOUNT_PATH}
      noAccount="Driving for a vendor? Ask them to add you with this email. Running one? Register your business below."
      footer={
        <>
          New to Connect?{" "}
          <Link
            href="/register"
            className="font-semibold text-brand underline-offset-4 hover:underline"
          >
            Register your business
          </Link>
        </>
      }
    />
  );
}
