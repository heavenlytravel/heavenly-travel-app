import type { Metadata } from "next";
import Link from "next/link";
import { Chips } from "../_components/Chips";
import { DesignCard, DesignTable } from "../_components/DesignSummary";
import { IDEA_ENTRIES } from "../_lib/designs";
import { IDEAS } from "../_lib/ideas";

export const metadata: Metadata = {
  title: "Ideas | Heavenly Travel",
  description:
    "Four landing page ideas for Heavenly Travel by Claude Fable 5.1 that replace the usual booking-platform layout: a sentence, a headcount, a mileage chart and a day.",
};

export default function IdeasIndex() {
  return (
    <div className="min-h-screen bg-white font-sans text-neutral-900">
      <main className="mx-auto max-w-5xl px-5 pt-16 pb-32 sm:px-8">
        <div className="flex gap-4 text-sm text-neutral-500">
          <Link href="/" className="underline-offset-4 hover:underline">
            Home
          </Link>
          <Link href="/landing" className="underline-offset-4 hover:underline">
            Landing variations
          </Link>
          <Link href="/model" className="underline-offset-4 hover:underline">
            Model stats
          </Link>
        </div>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
          Ideas
        </h1>
        <p className="mt-3 max-w-2xl text-neutral-600">
          Four pages by Claude Fable 5.1. The landing variations and the
          reimagined sites all restyle the same platform layout: a header, a
          photo, a search card, rows of cards. These do not. Each is still a
          travel booking page for coach charter and cars with driver, with the
          same fleet, fares and WhatsApp hand-off, but the booking control is
          the page itself.
        </p>
        <p className="mt-3 max-w-2xl text-neutral-600">
          None of them use Overpass, the teal-and-amber palette, a map of
          Malaysia or the structure of Agoda, Airbnb or Booking.com. Each has
          its own typeface pairing, chosen for the idea rather than for fashion.
        </p>

        <ol className="mt-10 grid gap-4 sm:grid-cols-2">
          {IDEAS.map((idea) => (
            <li key={idea.href}>
              <Link
                href={idea.href}
                className="group block h-full rounded-2xl border border-neutral-200 p-5 hover:border-neutral-400 focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                <p className="text-sm text-neutral-500">
                  Idea {idea.option} · {idea.control}
                </p>
                <h2 className="mt-1 text-xl font-semibold underline-offset-4 group-hover:underline">
                  {idea.name}
                </h2>
                <p className="mt-3 text-sm text-neutral-700">{idea.concept}</p>
              </Link>
            </li>
          ))}
        </ol>

        <section className="mt-14">
          <h2 className="text-2xl font-semibold tracking-tight">
            Side by side
          </h2>
          <div className="mt-5">
            <DesignTable
              entries={IDEA_ENTRIES}
              caption="Design traits of the four ideas"
              minWidth="900px"
            />
          </div>
        </section>

        <section className="mt-14">
          <h2 className="text-2xl font-semibold tracking-tight">
            Each idea in detail
          </h2>
          <div className="mt-5 space-y-6">
            {IDEA_ENTRIES.map((entry) => {
              const idea = IDEAS.find((i) => i.href === entry.href);
              return (
                <DesignCard key={entry.id} entry={entry}>
                  {idea && (
                    <div className="mt-4">
                      <p className="mb-3 text-sm text-neutral-700">
                        {idea.concept}
                      </p>
                      <Chips items={idea.replaces} />
                    </div>
                  )}
                </DesignCard>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
