import type { Metadata } from "next";
import { SignIn } from "@clerk/nextjs";
import { clerkAuthCard } from "@repo/ui/clerk-appearance";

export const metadata: Metadata = { title: "Sign in | Heavenly Travel" };

export default function SignInPage() {
  return <SignIn appearance={clerkAuthCard} />;
}
