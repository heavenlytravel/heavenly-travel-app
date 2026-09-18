"use client";

import { useState } from "react";
import Link from "next/link";
import { ASTRA_HOME } from "../_lib/destinations";

export type NavLink = { href: string; label: string };

const focus =
  "focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-[#caa243]";

/**
 * The header floats over the hero. `tone` is the colour of its text: ink on the
 * pale home hero, white on the dark destination heroes. Below the desktop
 * width the links fold into a card opened by the menu button.
 */
export function SiteHeader({
  tone,
  links,
  cta,
}: {
  tone: "ink" | "white";
  links: NavLink[];
  cta: NavLink;
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const link = `text-[0.92rem] font-semibold ${focus}`;

  return (
    <header
      className={`absolute inset-x-0 top-0 z-10 flex h-[66px] items-center justify-between px-5 sm:h-[76px] sm:px-[clamp(20px,5vw,76px)] ${
        tone === "ink" ? "text-[#082f2b]" : "text-white"
      }`}
    >
      <Link
        href={ASTRA_HOME}
        aria-label="Heavenly Travel home"
        className={`flex items-center gap-2.5 font-bold tracking-[0.1em] sm:tracking-[0.16em] ${focus}`}
      >
        <span>HEAVENLY</span>
        <small className="hidden border-l border-current pl-2.5 text-[0.68rem] tracking-[0.3em] sm:block">
          TRAVEL
        </small>
      </Link>

      <button
        type="button"
        aria-expanded={open}
        aria-controls="astra-nav"
        aria-label="Menu"
        onClick={() => setOpen((o) => !o)}
        className={`p-2.5 lg:hidden ${focus}`}
      >
        <span className="m-[5px] block h-0.5 w-[23px] bg-current" />
        <span className="m-[5px] block h-0.5 w-[23px] bg-current" />
      </button>

      <nav
        id="astra-nav"
        aria-label="Main navigation"
        className={`absolute top-[68px] right-[18px] left-[18px] flex-col items-stretch gap-7 rounded-2xl bg-white p-5 text-[#082f2b] shadow-[0_22px_55px_rgba(9,43,39,0.16)] lg:static lg:flex lg:flex-row lg:items-center lg:rounded-none lg:bg-transparent lg:p-0 lg:text-inherit lg:shadow-none ${
          open ? "flex" : "hidden"
        }`}
      >
        {links.map((l) => (
          <Link key={l.label} href={l.href} onClick={close} className={link}>
            {l.label}
          </Link>
        ))}
        <Link
          href={cta.href}
          onClick={close}
          className={`${link} rounded-full border border-current/35 px-[17px] py-2.5 text-center`}
        >
          {cta.label}
        </Link>
      </nav>
    </header>
  );
}
