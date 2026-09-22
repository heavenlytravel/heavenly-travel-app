import type { Metadata } from "next";
import { SignIn } from "@clerk/nextjs";
import { AuthPage } from "../../_components/AuthPage";

export const metadata: Metadata = { title: "Sign in | Heavenly Travel" };

export default function SignInPage() {
  return (
    <AuthPage>
      <SignIn />
    </AuthPage>
  );
}
