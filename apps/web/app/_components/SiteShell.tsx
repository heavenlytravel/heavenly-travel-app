import type { ReactNode } from "react";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { fontVars } from "../_home/fonts";
import { AccountMenu } from "./AccountMenu";
import { Photo } from "./Brand";
import { focus } from "./Page";

/**
 * Every customer page after the home page: booking, account. The home page
 * type and palette, a slim header with the logo and, once signed in, the
 * account menu, then one centred column.
 */
export async function SiteShell({ children }: { children: ReactNode }) {
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
        {userId && <AccountMenu />}
      </header>
      <main className="mx-auto w-full max-w-[1100px] px-5 pt-6 pb-24 sm:px-8 sm:pt-10">
        {children}
      </main>
    </div>
  );
}
