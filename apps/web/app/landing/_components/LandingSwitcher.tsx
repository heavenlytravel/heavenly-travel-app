"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { REIMAGINED } from "../../_lib/reimagined";
import { MODELS, VARIATIONS, type ModelKey } from "../../_lib/variations";

const GROUPS: ModelKey[] = ["opus", "fable"];

const itemBase =
  "flex h-9 min-w-9 items-center justify-center rounded-full px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

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
      aria-label="Landing page variations"
      className="fixed bottom-4 left-1/2 z-[1000] -translate-x-1/2 font-sans"
    >
      <div className="flex items-center gap-1 rounded-full border border-white/10 bg-neutral-900/85 p-1.5 shadow-lg backdrop-blur-md">
        <Link
          href="/landing"
          className={itemClass(pathname === "/landing")}
          aria-current={pathname === "/landing" ? "page" : undefined}
        >
          All
        </Link>
        {GROUPS.map((model) => (
          <div
            key={model}
            role="group"
            aria-label={MODELS[model].name}
            className="flex items-center gap-0.5 border-l border-white/15 pl-1.5"
          >
            <span className="px-1.5 text-xs text-neutral-400" aria-hidden>
              {model === "opus" ? "Opus" : "Fable"}
            </span>
            {VARIATIONS.filter((v) => v.model === model).map((v) => {
              const active = pathname === v.href;
              return (
                <Link
                  key={v.href}
                  href={v.href}
                  className={itemClass(active)}
                  aria-current={active ? "page" : undefined}
                  aria-label={`${MODELS[model].name}, option ${v.option}`}
                >
                  {v.option}
                </Link>
              );
            })}
          </div>
        ))}
        <div
          role="group"
          aria-label="Reimagined sites by Claude Fable 5.1"
          className="flex items-center gap-0.5 border-l border-white/15 pl-1.5"
        >
          <Link
            href="/landing/fable/reimagined"
            className={`px-1.5 text-xs ${
              pathname === "/landing/fable/reimagined"
                ? "text-white underline underline-offset-4"
                : "text-neutral-400 hover:text-white"
            }`}
            aria-current={
              pathname === "/landing/fable/reimagined" ? "page" : undefined
            }
          >
            Reimagined
          </Link>
          {REIMAGINED.map((r) => {
            const active = pathname === r.href;
            return (
              <Link
                key={r.href}
                href={r.href}
                className={itemClass(active)}
                aria-current={active ? "page" : undefined}
                aria-label={`Reimagined from ${r.name}`}
              >
                {r.short}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
