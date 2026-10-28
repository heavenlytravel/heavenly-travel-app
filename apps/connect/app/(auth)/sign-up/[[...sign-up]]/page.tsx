import { SignUp } from "@clerk/nextjs";
import { clerkAdminSignIn } from "@repo/ui/clerk-appearance";

// A vendor signs up with Clerk first, an email code proving the address
// is theirs, then fills in the registration form. Someone who already has
// an account, a customer's for one, signs in instead. See
// docs/261028-fulfilment-vendors-and-connect.md, "Signing up".
export default function SignUpPage() {
  return (
    <SignUp
      appearance={clerkAdminSignIn}
      signInUrl="/sign-in"
      forceRedirectUrl="/register"
    />
  );
}
