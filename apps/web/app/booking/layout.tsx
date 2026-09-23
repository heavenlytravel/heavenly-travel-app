import type { ReactNode } from "react";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { Photo } from "../_components/Brand";
import { fontVars } from "../_home/fonts";

const focus =
  "focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-[#caa243]";

/**
 * The booking pages: options, confirm and the success page. The home page
 * type and palette, a slim header with the logo and, once signed in, the
 * account menu, then one centred column.
 */
export default async function BookingLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { userId } = await auth();
  return (
    <div
      className={`${fontVars} min-h-screen bg-[#fbfcfa] font-(family-name:--font-body) leading-normal text-[#102825] antialiased`}
    >
      <header className="flex h-[66px] items-center justify-between px-5 sm:h-[76px] sm:px-[clamp(20px,5vw,76px)]">
        <Link href="/" aria-label="Heavenly Travel home" className={focus}>
          <Photo
            src="/brand/logo-blue.svg"
            alt="Heavenly, your travel engineer"
            className="h-8 w-auto sm:h-10"
            loading="eager"
          />
        </Link>
        {userId && <UserButton />}
      </header>
      <main className="mx-auto w-full max-w-[1100px] px-5 pt-6 pb-24 sm:px-8 sm:pt-10">
        {children}
      </main>
    </div>
  );
}
