import type { ReactNode } from "react";
import { auth } from "@clerk/nextjs/server";
import { AuthShell } from "@repo/ui/auth-shell";
import { redirect } from "next/navigation";
import { ConsoleLogo } from "../_components/PortalCard";

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
    <AuthShell tone="dark" eyebrow="Admin portal" brand={<ConsoleLogo />}>
      {children}
    </AuthShell>
  );
}
