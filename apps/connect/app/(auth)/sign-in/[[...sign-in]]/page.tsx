import { SignIn } from "@clerk/nextjs";
import { clerkAdminSignIn } from "@repo/ui/clerk-appearance";

// Drivers sign in with the email their vendor or Operation entered on
// their driver row, which links their account. A new vendor signs up
// (/sign-up), then registers. See
// docs/261028-fulfilment-vendors-and-connect.md, "Signing up".
export default function SignInPage() {
  return <SignIn appearance={clerkAdminSignIn} signUpUrl="/sign-up" />;
}
