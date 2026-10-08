import type { Metadata } from "next";
import { SignUp } from "@clerk/nextjs";
import { isValidEmail } from "@repo/db";

export const metadata: Metadata = {
  title: "Create an account | Heavenly Travel",
};

/**
 * Clerk's sign-up. A guest's booking emails link here with `email` set, so
 * the address they booked with is already typed; Clerk still verifies it
 * with a code, and the account then claims the booking. See
 * docs/261008-guest-booking.md, "The account offer".
 */
export default async function SignUpPage({
  searchParams,
}: PageProps<"/sign-up/[[...sign-up]]">) {
  const { email } = await searchParams;
  const emailAddress =
    typeof email === "string" && isValidEmail(email) ? email : undefined;
  return <SignUp initialValues={emailAddress ? { emailAddress } : undefined} />;
}
