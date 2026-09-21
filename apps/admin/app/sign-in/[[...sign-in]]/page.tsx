import { SignIn } from "@clerk/nextjs";

// Staff access is invite-only: an existing customer is promoted by a SUPER
// admin. Nothing here offers a way to sign up.
export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <SignIn
        withSignUp={false}
        appearance={{ elements: { footerAction: { display: "none" } } }}
      />
    </main>
  );
}
