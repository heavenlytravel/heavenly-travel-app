import type { ReactNode } from "react";
import Image from "next/image";
import { auth } from "@clerk/nextjs/server";
import { AuthShell } from "@repo/ui/auth-shell";
import { redirect } from "next/navigation";

/**
 * The admin sign-in page: dark, the logo above "Admin portal", no sign-up.
 * Someone already signed in is sent to the console from the server, so the
 * form never flashes; `requireAdmin` there sends non-admins to /no-access.
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
      eyebrow="Admin portal"
      brand={
        <Image
          src="/brand/logo-blue.svg"
          alt="Heavenly, your travel engineer"
          width={120}
          height={28}
          priority
          // The logo is navy; drawn white on the dark green.
          className="h-9 w-auto brightness-0 invert"
        />
      }
    >
      {children}
    </AuthShell>
  );
}
