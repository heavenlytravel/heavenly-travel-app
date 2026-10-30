import type { Metadata } from "next";
import Link from "next/link";
import { SignInFlow } from "@repo/auth/SignInFlow";
import { ACCOUNT_PATH } from "../../_lib/routes";

export const metadata: Metadata = { title: "Sign in | Heavenly Travel" };

const LINK = "font-semibold text-brand underline-offset-4 hover:underline";

export default function SignInPage() {
  return (
    <SignInFlow
      portal="Heavenly Travel"
      accountPath={ACCOUNT_PATH}
      noAccount={
        <>
          Check the spelling, or{" "}
          <Link href="/sign-up" className="font-semibold underline underline-offset-2">
            create an account
          </Link>
          .
        </>
      }
      footer={
        <>
          New to Heavenly Travel?{" "}
          <Link href="/sign-up" className={LINK}>
            Create an account
          </Link>
        </>
      }
    />
  );
}
