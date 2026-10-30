import { SignIn } from "@clerk/nextjs";
import { clerkAdminSignIn } from "@repo/ui/clerk-appearance";

// Sign-in only, with no link to sign up: drivers sign in with the email
// their vendor or Operation entered on their driver row, which links their
// account, and vendors are entered by staff for now. See
// docs/261028-fulfilment-vendors-and-connect.md, "Signing up".
export default function SignInPage() {
  return <SignIn appearance={clerkAdminSignIn} withSignUp={false} />;
}
