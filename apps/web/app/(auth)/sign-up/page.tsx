import type { Metadata } from "next";
import Link from "next/link";
import { SignUpFlow } from "@repo/auth/SignUpFlow";

export const metadata: Metadata = {
  title: "Create an account | Heavenly Travel",
};

/**
 * Our sign-up (@repo/auth). A guest's booking emails link here with `email`
 * set, so the address they booked with is already typed; the code still
 * confirms it, and the account then claims the booking. See
 * docs/261008-guest-booking.md, "The account offer".
 */
export default function SignUpPage() {
  return (
    <SignUpFlow
      portal="Heavenly Travel"
      signInPath="/sign-in"
      footer={
        <>
          Already have an account?{" "}
          <Link
            href="/sign-in"
            className="font-semibold text-brand underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </>
      }
    />
  );
}
