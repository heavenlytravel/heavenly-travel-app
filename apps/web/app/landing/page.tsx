import type { Metadata } from "next";
import Link from "next/link";
import { LANDINGS } from "../_lib/landings";

export const metadata: Metadata = {
  title: "Landing page designs | Heavenly Travel",
  description: "Alternative landing page designs for Heavenly Travel.",
};

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/design-cta", label: "Search box designs" },
];

export default function LandingIndex() {
  return (
    <div className="min-h-screen bg-white font-sans text-neutral-900">
      <main className="mx-auto max-w-3xl px-5 pt-16 pb-32 sm:px-8">
        <div className="flex gap-4 text-sm text-neutral-500">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="underline-offset-4 hover:underline"
            >
              {l.label}
            </Link>
          ))}
        </div>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
          Landing page designs
        </h1>

        <ol className="mt-10 divide-y divide-neutral-200 border-y border-neutral-200">
          {LANDINGS.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className="flex items-baseline justify-between gap-4 py-4 font-medium hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                <span>
                  <span className="mr-2 text-neutral-400">{l.number}.</span>
                  {l.label}
                </span>
                <code className="text-sm font-normal text-neutral-500">
                  {l.href}
                </code>
              </Link>
            </li>
          ))}
        </ol>
      </main>
    </div>
  );
}
