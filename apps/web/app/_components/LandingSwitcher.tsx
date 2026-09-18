"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LANDINGS } from "../_lib/landings";

const itemBase =
  "flex h-9 min-w-9 shrink-0 items-center justify-center rounded-full px-3 text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

function itemClass(active: boolean) {
  return `${itemBase} ${
    active
      ? "bg-white text-neutral-900"
      : "text-neutral-300 hover:bg-white/10 hover:text-white"
  }`;
}

export function LandingSwitcher() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Landing designs"
      className="fixed bottom-4 left-1/2 z-[1000] max-w-[calc(100vw-1rem)] -translate-x-1/2 font-sans"
    >
      <div className="flex items-center gap-1 overflow-x-auto rounded-full border border-white/10 bg-neutral-900/85 p-1.5 shadow-lg backdrop-blur-md [scrollbar-width:none]">
        <Link
          href="/landing"
          className={itemClass(pathname === "/landing")}
          aria-current={pathname === "/landing" ? "page" : undefined}
        >
          All
        </Link>
        <div className="flex shrink-0 items-center gap-0.5 border-l border-white/15 pl-1.5">
          {LANDINGS.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={itemClass(active)}
                aria-current={active ? "page" : undefined}
                aria-label={`Design ${l.number}, ${l.label}`}
              >
                {l.number}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
