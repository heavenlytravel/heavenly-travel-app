import type { ReactNode } from "react";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { AuthShell } from "@repo/ui/auth-shell";
import { redirect } from "next/navigation";
import { Logo, Photo } from "../_components/Brand";
import { Footer } from "../_components/Footer";
import { fontVars } from "../_home/fonts";

/**
 * The customer site's sign-in and sign-up pages: the home page fonts, the
 * logo above the form, the Langkawi hero on the left from `lg` up, and the
 * site's footer under them. Someone already signed in is sent on from the
 * server, so the form never flashes.
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
    <div className={`${fontVars} font-sans leading-normal antialiased`}>
      <AuthShell
        brand={
          <Link
            href="/"
            aria-label="Heavenly Travel home"
            className="focus-ring"
          >
            <Logo className="h-10 w-auto" loading="eager" />
          </Link>
        }
        aside={<HeroPanel />}
        footer={
          <Link
            href="/"
            className="underline-offset-4 hover:underline focus-ring"
          >
            Back to Heavenly Travel
          </Link>
        }
      >
        {children}
      </AuthShell>
      <Footer />
    </div>
  );
}

/** The hero photo under a navy wash, with the home page headline. */
function HeroPanel() {
  return (
    <>
      <Photo
        src="/brand/hero-langkawi.jpg"
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-center"
        loading="eager"
      />
      <div className="absolute inset-0 bg-linear-to-b/srgb from-navy/20 via-navy/55 via-55% to-ink/90" />
      <div className="absolute inset-x-0 bottom-0 p-[clamp(32px,5vw,72px)] text-white">
        <p className="origin-left -rotate-3 font-hand text-6xl leading-[0.75] text-azure-light">
          Travel
        </p>
        <p className="mt-2 font-serif text-6xl leading-[0.9]">made simple.</p>
        <p className="mt-5 max-w-[26rem] text-lead text-white/85">
          Cars, drivers, coaches, stays and experiences across Malaysia, in one
          place.
        </p>
      </div>
    </>
  );
}
