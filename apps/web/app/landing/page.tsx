import type { Metadata } from "next";
import Link from "next/link";
import { Chips } from "../_components/Chips";
import { LANDINGS } from "../_lib/landings";

export const metadata: Metadata = {
  title: "Landing page designs | Heavenly Travel",
  description:
    "Landing page designs for Heavenly Travel by Claude Fable 5.1, each inspired by the structure of a reference site: Agoda, Blacklane and Grab Limo.",
};

export default function LandingIndex() {
  return (
    <div className="min-h-screen bg-white font-sans text-neutral-900">
      <main className="mx-auto max-w-4xl px-5 pt-16 pb-32 sm:px-8">
        <div className="flex gap-4 text-sm text-neutral-500">
          <Link href="/" className="underline-offset-4 hover:underline">
            Home
          </Link>
          <Link
            href="/design-cta"
            className="underline-offset-4 hover:underline"
          >
            Search box designs
          </Link>
        </div>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
          Landing page designs
        </h1>
        <p className="mt-3 max-w-2xl text-neutral-600">
          Full pages by Claude Fable 5.1. Each is inspired by the structure of a
          reference site and rebuilt for coach charter and cars with driver, in
          Overpass with the teal-and-amber palette and the photography from
          heavenlytravel.my.
        </p>

        <ol className="mt-10 space-y-5">
          {LANDINGS.map((l, i) => (
            <li
              key={l.slug}
              className="rounded-2xl border border-neutral-200 p-5 sm:p-6"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h2 className="text-xl font-semibold">
                  <span className="mr-2 text-neutral-400">{i + 1}.</span>
                  {l.name} · {l.label}
                </h2>
                <div className="flex gap-4 text-sm font-medium">
                  <a
                    href={l.sourceHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-neutral-500 underline-offset-4 hover:underline"
                  >
                    Source
                  </a>
                  <Link
                    href={l.href}
                    className="underline-offset-4 hover:underline"
                  >
                    Open page
                  </Link>
                </div>
              </div>
              <p className="mt-1 text-sm text-neutral-500">{l.source}</p>
              <p className="mt-4 mb-4 text-neutral-700">{l.concept}</p>
              <Chips items={l.borrowed} />
            </li>
          ))}
        </ol>
      </main>
    </div>
  );
}
