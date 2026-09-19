"use client";

import { useState } from "react";
import { Photo } from "../_components/Brand";

const focus =
  "focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-[#caa243]";

const LINKS = [
  { href: "#destinations", label: "Destinations" },
  { href: "#why-us", label: "Why Heavenly" },
  { href: "#contact", label: "Contact" },
];

/**
 * The header floats over the pale side of the hero. Below the desktop width
 * the links fold into a card opened by the menu button.
 */
export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const link = `text-[0.92rem] font-semibold ${focus}`;

  return (
    <header className="absolute inset-x-0 top-0 z-10 flex h-[66px] items-center justify-between px-5 text-[#082f2b] sm:h-[76px] sm:px-[clamp(20px,5vw,76px)]">
      <a href="#top" aria-label="Heavenly Travel home" className={focus}>
        <Photo
          src="/brand/logo-blue.svg"
          alt="Heavenly, your travel engineer"
          className="h-8 w-auto sm:h-10"
          loading="eager"
        />
      </a>

      <button
        type="button"
        aria-expanded={open}
        aria-controls="site-nav"
        aria-label="Menu"
        onClick={() => setOpen((o) => !o)}
        className={`p-2.5 lg:hidden ${focus}`}
      >
        <span className="m-[5px] block h-0.5 w-[23px] bg-current" />
        <span className="m-[5px] block h-0.5 w-[23px] bg-current" />
      </button>

      <nav
        id="site-nav"
        aria-label="Main navigation"
        className={`absolute top-[68px] right-[18px] left-[18px] flex-col items-stretch gap-7 rounded-2xl bg-white p-5 shadow-[0_22px_55px_rgba(9,43,39,0.16)] lg:static lg:flex lg:flex-row lg:items-center lg:rounded-none lg:bg-transparent lg:p-0 lg:shadow-none ${
          open ? "flex" : "hidden"
        }`}
      >
        {LINKS.map((l) => (
          <a key={l.href} href={l.href} onClick={close} className={link}>
            {l.label}
          </a>
        ))}
        <a
          href="#booking"
          onClick={close}
          className={`${link} rounded-full border border-current/35 px-[17px] py-2.5 text-center`}
        >
          Plan your trip
        </a>
      </nav>
    </header>
  );
}
