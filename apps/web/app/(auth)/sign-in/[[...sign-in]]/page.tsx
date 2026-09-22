import type { Metadata } from "next";
import { SignIn } from "@clerk/nextjs";

export const metadata: Metadata = { title: "Sign in | Heavenly Travel" };

export default function SignInPage() {
  return <SignIn />;
}
