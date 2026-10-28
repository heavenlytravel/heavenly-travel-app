import type { ReactNode } from "react";
import Image from "next/image";
import { auth } from "@clerk/nextjs/server";
import { AuthShell } from "@repo/ui/auth-shell";
import { redirect } from "next/navigation";

/**
 * Connect's sign-in page: dark, the logo above "Connect", as the admin's.
 * Someone already signed in goes to their jobs from the server, so the
 * form never flashes; the page there says why if Connect is not theirs.
 */
export default async function AuthLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { userId } = await auth();
  if (userId) {
    redirect(
      process.env.NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL ?? "/",
    );
  }

  return (
    <AuthShell
      tone="dark"
      eyebrow="Connect"
      brand={
        <Image
          src="/brand/logo-blue.svg"
          alt="Heavenly, your travel engineer"
          width={120}
          height={28}
          priority
          // The logo is navy; drawn white on the navy page.
          className="h-9 w-auto brightness-0 invert"
        />
      }
    >
      {children}
    </AuthShell>
  );
}
