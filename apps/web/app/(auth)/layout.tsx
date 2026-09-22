import type { ReactNode } from "react";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { AuthShell } from "@repo/ui/auth-shell";
import { redirect } from "next/navigation";
import { Photo } from "../_components/Brand";
import { fontVars } from "../_home/fonts";

const focus =
  "focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-[#caa243]";

/**
 * The customer site's sign-in and sign-up pages: the home page fonts, the
 * logo above the form, the Langkawi hero on the left from `lg` up. Someone
 * already signed in is sent on from the server, so the form never flashes.
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
    <div
      className={`${fontVars} font-(family-name:--font-body) leading-normal antialiased`}
    >
      <AuthShell
        brand={
          <Link href="/" aria-label="Heavenly Travel home" className={focus}>
            <Photo
              src="/brand/logo-blue.svg"
              alt="Heavenly, your travel engineer"
              className="h-10 w-auto"
              loading="eager"
            />
          </Link>
        }
        aside={<HeroPanel />}
        footer={
          <Link
            href="/"
            className={`underline-offset-4 hover:underline ${focus}`}
          >
            Back to Heavenly Travel
          </Link>
        }
      >
        {children}
      </AuthShell>
    </div>
  );
}

/** The hero photo under a deep green wash, with the home page headline. */
function HeroPanel() {
  return (
    <>
      <Photo
        src="/brand/hero-langkawi.jpg"
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-center"
        loading="eager"
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,60,54,0.2)_0%,rgba(7,60,54,0.55)_55%,rgba(2,27,25,0.9)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 p-[clamp(32px,5vw,72px)] text-white">
        <p className="origin-left -rotate-3 font-(family-name:--font-script) text-[3.4rem] leading-[0.75] text-[#f3dfa2]">
          Travel
        </p>
        <p className="mt-2 font-(family-name:--font-display) text-[3.6rem] leading-[0.9]">
          made simple.
        </p>
        <p className="mt-5 max-w-[26rem] text-[1.08rem] text-white/85">
          Cars, drivers, coaches, stays and experiences across Malaysia, in one
          place.
        </p>
      </div>
    </>
  );
}
