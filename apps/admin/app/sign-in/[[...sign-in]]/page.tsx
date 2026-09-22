import { SignIn } from "@clerk/nextjs";
import { AuthShell } from "@repo/ui/auth-shell";
import { clerkAdminSignIn } from "@repo/ui/clerk-appearance";

// Staff access is invite-only: an existing customer is promoted by a SUPER
// admin. Nothing here offers a way to sign up.
export default function SignInPage() {
  return (
    <AuthShell tone="dark" eyebrow="Admin portal">
      <SignIn withSignUp={false} appearance={clerkAdminSignIn} />
    </AuthShell>
  );
}
