import type { Metadata } from "next";
import { SignUp } from "@clerk/nextjs";
import { AuthPage } from "../../_components/AuthPage";

export const metadata: Metadata = {
  title: "Create an account | Heavenly Travel",
};

export default function SignUpPage() {
  return (
    <AuthPage>
      <SignUp />
    </AuthPage>
  );
}
