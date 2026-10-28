import { SignIn } from "@clerk/nextjs";
import { clerkAdminSignIn } from "@repo/ui/clerk-appearance";

// Drivers sign in with the email staff entered on their driver row, which
// links their account. Vendors' own sign-up comes with step 5 of
// docs/261028-fulfilment-vendors-and-connect.md.
export default function SignInPage() {
  return <SignIn withSignUp={false} appearance={clerkAdminSignIn} />;
}
