import { CONTACT, paragraphsOf, type PageContent } from "@repo/db";
import type { VendorOpening } from "@repo/db/server";
import { Button } from "@repo/ui/button";
import { cx } from "@repo/ui/cx";
import { Markdown } from "@repo/ui/markdown";
import { ArrowRight, Check, MessageCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { PhoneShowcase } from "./PhoneShowcase";

/** The width every part of the page keeps to. */
const COLUMN = "mx-auto w-full max-w-6xl px-5 sm:px-8";
const KICKER = "text-xs font-bold tracking-kicker text-brand uppercase";
const TITLE = "font-serif text-3xl leading-display text-ink sm:text-4xl";

/**
 * Connect's landing page, for a visitor signed out: what Connect is, where
 * it takes vendors now, how one job runs, who it is for, what to have at
 * hand and what each side owes, the questions, and the way to register.
 * Its words are the page Marketing publishes in the console (a site page
 * of the kind "connect"), or the words it was built with; the board, the
 * steps and the two kinds of vendor are drawn here. `ribbon` is the staff
 * preview's bar. See docs/261030-sign-in-connect-onboarding-and-media.md,
 * "Connect".
 */
export function Landing({
  content,
  openings,
  ribbon,
  terms,
}: {
  content: PageContent;
  openings: VendorOpening[];
  ribbon?: ReactNode;
  /** The customer site's terms and privacy policy, linked in the footer. */
  terms: { termsHref: string; privacyHref: string };
}) {
  return (
    <div className="min-h-dvh bg-canvas text-body">
      {ribbon}
      <Hero content={content} />
      <OpenNow openings={openings} />
      <HowAJobRuns />
      <WhoItsFor intro={content.intro} />
      <BodyCards body={content.body} />
      <Questions faqs={content.faqs} />
      <Closing />
      <footer className="bg-ink text-white/75">
        <div
          className={cx(
            COLUMN,
            "flex flex-wrap items-center justify-between gap-3 py-5 text-xs",
          )}
        >
          <span>Heavenly Travel Sdn Bhd · heavenlytravel.my</span>
          <span className="flex gap-4">
            <a href={terms.termsHref} className="hover:text-white focus-ring">
              Terms
            </a>
            <a href={terms.privacyHref} className="hover:text-white focus-ring">
              Privacy
            </a>
          </span>
        </div>
      </footer>
    </div>
  );
}

function Hero({ content }: { content: PageContent }) {
  return (
    <header className="bg-band text-white">
      <nav
        aria-label="Connect"
        className={cx(COLUMN, "flex items-center gap-6 py-5")}
      >
        <Link href="/" className="flex items-center gap-2.5 focus-ring">
          <Image
            src="/brand/logo-blue.svg"
            alt="Heavenly Travel"
            width={120}
            height={28}
            priority
            // The logo is navy; drawn white on the band.
            className="h-7 w-auto brightness-0 invert"
          />
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[0.65rem] font-bold tracking-[0.18em] text-azure-light uppercase ring-1 ring-white/15">
            Connect
          </span>
        </Link>
        <ul className="hidden items-center gap-6 text-sm text-white/80 md:flex">
          <li>
            <a href="#how" className="hover:text-white focus-ring">
              How a job runs
            </a>
          </li>
          <li>
            <a href="#who" className="hover:text-white focus-ring">
              Who it&rsquo;s for
            </a>
          </li>
          <li>
            <a href="#questions" className="hover:text-white focus-ring">
              Questions
            </a>
          </li>
        </ul>
        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/sign-in"
            className="rounded-control px-3 py-2 text-sm font-semibold text-white hover:bg-white/10 focus-ring"
          >
            Sign in
          </Link>
          <Button asChild variant="secondary" size="sm">
            <Link href="/register">Register</Link>
          </Button>
        </div>
      </nav>

      <div
        className={cx(
          COLUMN,
          "grid items-center gap-10 pt-8 pb-14 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:pt-14 lg:pb-20",
        )}
      >
        <div>
          {content.tagline ? (
            <p className="text-xs font-bold tracking-kicker text-azure-light uppercase">
              {content.tagline}
            </p>
          ) : null}
          <h1 className="mt-4 font-serif text-5xl leading-[1.02] text-balance sm:text-6xl">
            {content.heroHeadline}
          </h1>
          <p className="mt-6 max-w-[34rem] text-lead text-pretty text-white/85">
            {content.heroSubheadline}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
            <Button asChild variant="secondary" size="lg">
              <Link href="/register">
                Register your business
                <ArrowRight aria-hidden className="size-4" />
              </Link>
            </Button>
            <Link
              href="/sign-in"
              className="text-sm font-semibold text-azure-light underline underline-offset-4 hover:text-white focus-ring"
            >
              Drive for a vendor already? Sign in
            </Link>
          </div>
        </div>
        <PhoneShowcase image={content.heroImage} />
      </div>
    </header>
  );
}

function OpenNow({ openings }: { openings: VendorOpening[] }) {
  return (
    <section
      aria-labelledby="open-now"
      className={cx(COLUMN, "py-16 sm:py-20")}
    >
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-end">
        <div>
          <p className={KICKER}>Open now</p>
          <h2 id="open-now" className={cx(TITLE, "mt-3")}>
            Where we&rsquo;re taking vendors
          </h2>
        </div>
        <p className="text-sm text-muted md:pb-1">
          We offer jobs by class, where your vehicles are based. More places and
          services are coming: register now and tell us what you run.
        </p>
      </div>
      <div className="mt-8 overflow-hidden rounded-card border border-card-edge bg-white shadow-card">
        {openings.length === 0 ? (
          <p className="px-5 py-6 text-sm text-muted">
            We&rsquo;re opening our first locations to vendors. Register now,
            and we&rsquo;ll reach you as soon as yours opens.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-mist text-xs font-semibold tracking-kicker text-muted uppercase">
              <tr>
                <th scope="col" className="px-5 py-3">
                  Location
                </th>
                <th scope="col" className="px-5 py-3">
                  Service
                </th>
                <th scope="col" className="hidden px-5 py-3 sm:table-cell">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {openings.map((opening) => (
                <tr key={`${opening.location}-${opening.category}`}>
                  <td className="px-5 py-3.5 font-semibold text-ink">
                    {opening.location}
                  </td>
                  <td className="px-5 py-3.5 text-body">
                    {opening.categoryLabel}
                    <span className="text-muted">
                      {" "}
                      · {opening.classes.join(", ")}
                    </span>
                  </td>
                  <td className="hidden px-5 py-3.5 sm:table-cell">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-success-tint px-2.5 py-0.5 text-xs font-semibold text-success">
                      <span
                        aria-hidden
                        className="size-1.5 rounded-full bg-success-dot"
                      />
                      Taking vendors
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

/** The four steps of one job, as Connect runs it: the product, not written in the console. */
const STEPS: { title: string; text: string; shows: ReactNode }[] = [
  {
    title: "The offer comes in",
    text: "The trip, the class and what we pay. Accept it before its timer runs out, or let it pass.",
    shows: (
      <div className="flex items-center justify-between gap-3">
        <span className="grid">
          <span className="text-xs font-semibold text-ink">
            KLIA2 → Georgetown
          </span>
          <span className="text-[0.7rem] text-muted">
            Van · 9 pax · Answer 3:10
          </span>
        </span>
        <span className="font-serif text-lg text-ink">RM 260</span>
      </div>
    ),
  },
  {
    title: "You name the driver",
    text: "Pick one of your drivers and vehicles. Connect warns you of a clash with another job.",
    shows: (
      <div className="flex items-center gap-2.5">
        <span className="grid size-7 place-items-center rounded-full bg-azure-light text-[0.65rem] font-bold text-ink">
          AR
        </span>
        <span className="text-xs font-semibold text-ink">Azman · PNG 4410</span>
        <Check aria-hidden className="ml-auto size-4 text-success" />
      </div>
    ),
  },
  {
    title: "The driver taps through it",
    text: "On the way, arrived, passenger on board, dropped off. Operation sees each step as it happens.",
    shows: (
      <div className="grid gap-1.5 text-center">
        <span className="rounded-control bg-brand py-2 text-xs font-semibold text-white">
          I&rsquo;ve arrived
        </span>
        <span className="text-[0.7rem] text-muted">
          Slide to confirm, on the phone
        </span>
      </div>
    ),
  },
  {
    title: "Done, and on record",
    text: "The trip is logged against the offer you accepted, so what we owe you is never in doubt.",
    shows: (
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-success-tint px-2 py-0.5 text-[0.7rem] font-semibold text-success">
          <span aria-hidden className="size-1.5 rounded-full bg-success-dot" />
          Done
        </span>
        <span className="text-[0.7rem] text-muted">Dropped off 11:05 AM</span>
      </div>
    ),
  },
];

function HowAJobRuns() {
  return (
    <section
      id="how"
      aria-labelledby="how-title"
      className="scroll-mt-6 bg-white py-16 sm:py-20"
    >
      <div className={COLUMN}>
        <p className={KICKER}>How a job runs</p>
        <h2 id="how-title" className={cx(TITLE, "mt-3")}>
          One job, from the offer to the drop-off
        </h2>
        <ol className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {STEPS.map((step, index) => {
            const last = index === STEPS.length - 1;
            return (
              <li key={step.title} className="grid content-start gap-3">
                <div className="flex items-center gap-3">
                  <span
                    className={cx(
                      "grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold text-white",
                      last ? "bg-success" : "bg-ink",
                    )}
                  >
                    {last ? (
                      <Check aria-hidden className="size-4" />
                    ) : (
                      index + 1
                    )}
                  </span>
                  <span
                    aria-hidden
                    className="hidden h-px flex-1 border-t border-dashed border-azure lg:block"
                  />
                </div>
                <h3 className="text-base font-semibold text-ink">
                  {step.title}
                </h3>
                <p className="text-sm text-muted">{step.text}</p>
                <div className="rounded-control border border-card-edge bg-white px-3 py-2.5 shadow-card">
                  {step.shows}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

/** The two kinds of vendor, with the photo of each: drawn here, as the registration's two kinds. */
const KINDS = [
  {
    title: "A company with a fleet",
    photo: "/brand/coach.jpg",
    points: [
      "Register with your SSM number",
      "Add your office staff to answer offers",
      "Each driver signs in on their own phone",
    ],
  },
  {
    title: "One person, one car",
    photo: "/brand/mpv.jpg",
    points: [
      "Register with your IC",
      "You are the vendor and its driver, in one account",
      "Take the jobs that fit your day",
    ],
  },
];

function WhoItsFor({ intro }: { intro: string }) {
  return (
    <section
      id="who"
      aria-labelledby="who-title"
      className={cx(COLUMN, "scroll-mt-6 py-16 sm:py-20")}
    >
      <p className={KICKER}>Who it&rsquo;s for</p>
      <h2 id="who-title" className={cx(TITLE, "mt-3")}>
        A fleet of forty, or one good car
      </h2>
      <div className="mt-5 grid max-w-3xl gap-4 text-base text-pretty text-body">
        {paragraphsOf(intro).map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
      <div className="mt-10 grid gap-5 md:grid-cols-2">
        {KINDS.map((kind) => (
          <article
            key={kind.title}
            className="overflow-hidden rounded-card border border-card-edge bg-white shadow-card"
          >
            <Image
              src={kind.photo}
              alt=""
              width={800}
              height={320}
              className="h-44 w-full object-cover sm:h-52"
            />
            <div className="p-5">
              <h3 className="text-base font-semibold text-ink">{kind.title}</h3>
              <ul className="mt-3 grid gap-2 text-sm text-body">
                {kind.points.map((point) => (
                  <li key={point} className="flex items-start gap-2">
                    <Check
                      aria-hidden
                      className="mt-0.5 size-4 shrink-0 text-brand"
                    />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

/** The text's `##` parts, each its heading and the Markdown under it. */
function bodyPartsOf(body: string): { title: string; text: string }[] {
  const parts: { title: string; text: string }[] = [];
  for (const line of body.split("\n")) {
    const heading = /^##\s+(.+)$/.exec(line);
    if (heading?.[1]) parts.push({ title: heading[1].trim(), text: "" });
    else if (parts.length > 0) parts[parts.length - 1]!.text += `${line}\n`;
  }
  return parts;
}

/**
 * The Markdown inside a card: paragraphs muted, a list of points, a task
 * list as ticked and open boxes, drawn in the brand's blue rather than as
 * the browser's greyed-out boxes (a task list's are disabled).
 */
const CARD_TEXT =
  "grid gap-3 text-sm text-body [&_p]:text-muted [&_ul]:grid [&_ul]:gap-2.5 [&_ul:not(.contains-task-list)]:list-disc [&_ul:not(.contains-task-list)]:pl-5 [&_li]:marker:text-azure [&_.task-list-item]:flex [&_.task-list-item]:items-start [&_.task-list-item]:gap-2.5 [&_.task-list-item]:border-b [&_.task-list-item]:border-hairline [&_.task-list-item]:pb-2.5 [&_.task-list-item:last-child]:border-0 [&_input]:mt-0.5 [&_input]:size-4 [&_input]:shrink-0 [&_input]:appearance-none [&_input]:rounded-sm [&_input]:border [&_input]:border-edge-strong [&_input]:bg-white [&_input]:bg-center [&_input]:bg-no-repeat [&_input:checked]:border-brand [&_input:checked]:bg-brand [&_input:checked]:bg-[url('data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20viewBox=%220%200%2016%2016%22%20fill=%22none%22%20stroke=%22white%22%20stroke-width=%222.5%22%3E%3Cpath%20d=%22M3.5%208.5l3%203%206-6.5%22/%3E%3C/svg%3E')]";

function BodyCards({ body }: { body: string }) {
  const parts = bodyPartsOf(body);
  if (parts.length === 0) return null;
  const [first, ...rest] = parts;
  const card = (part: { title: string; text: string }, lead: boolean) => (
    <article
      key={part.title}
      className="rounded-card border border-card-edge bg-white p-6 shadow-card"
    >
      <h3
        className={
          lead
            ? "font-serif text-2xl leading-display text-ink"
            : "text-base font-semibold text-ink"
        }
      >
        {part.title}
      </h3>
      <Markdown text={part.text} className={cx(CARD_TEXT, "mt-3")} />
    </article>
  );
  return (
    <section aria-label="Before you start" className="bg-mist py-16 sm:py-20">
      <div
        className={cx(
          COLUMN,
          "grid gap-5",
          rest.length > 0 && "lg:grid-cols-2 lg:items-start",
        )}
      >
        {first ? card(first, true) : null}
        {rest.length > 0 ? (
          <div className="grid gap-5">
            {rest.map((part) => card(part, false))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function Questions({ faqs }: { faqs: PageContent["faqs"] }) {
  if (faqs.length === 0) return null;
  return (
    <section
      id="questions"
      aria-labelledby="questions-title"
      className="scroll-mt-6 py-16 sm:py-20"
    >
      <div className="mx-auto w-full max-w-3xl px-5 sm:px-8">
        <h2 id="questions-title" className={TITLE}>
          Questions
        </h2>
        <div className="mt-6 divide-y divide-card-edge border-y border-card-edge">
          {faqs.map((faq, index) => (
            <details key={faq.question} open={index === 0} className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-base font-semibold text-ink focus-ring [&::-webkit-details-marker]:hidden">
                {faq.question}
                <span
                  aria-hidden
                  className="text-xl leading-none font-normal text-muted group-open:rotate-45 motion-safe:transition-transform"
                >
                  +
                </span>
              </summary>
              <div className="grid gap-3 pb-5 text-sm text-pretty text-muted">
                {paragraphsOf(faq.answer).map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function Closing() {
  return (
    <section className="relative isolate overflow-hidden bg-navy text-white">
      <Image
        src="/brand/hero-langkawi.jpg"
        alt=""
        fill
        sizes="100vw"
        className="-z-10 object-cover opacity-25"
      />
      <div
        className={cx(
          COLUMN,
          "flex flex-wrap items-center justify-between gap-6 py-14",
        )}
      >
        <div>
          <h2 className="font-serif text-3xl leading-display sm:text-4xl">
            Bring your fleet to Connect.
          </h2>
          <p className="mt-2 text-sm text-white/80">
            Questions first? WhatsApp Operation at {CONTACT.whatsappNumber}.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="secondary" size="lg">
            <Link href="/register">Register your business</Link>
          </Button>
          <a
            href={CONTACT.whatsappHref}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-12 items-center gap-2 rounded-control border border-white/30 px-5 text-base font-semibold text-white hover:bg-white/10 focus-ring"
          >
            <MessageCircle aria-hidden className="size-4" />
            WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
}
