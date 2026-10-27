"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { STEP_PATHS, type Step } from "./situations";
import { ACCOUNT, resetExample, update, useExample } from "./store";
import { useHydrated } from "./ui";

const STEPS: [Step, string][] = [
  ["search", "1 Search"],
  ["vehicle", "2 Vehicle"],
  ["confirm", "3 Confirm"],
  ["received", "4 Received"],
  ["booking", "5 Your booking"],
];

/** Where each step lives on the real site. */
const REAL_PATHS: Record<Step, string> = {
  search: "/ and every destination page (the search card)",
  vehicle: "/booking/transportation/[category]?…",
  confirm: "/booking/transportation/[category]/confirm?…",
  received: "/booking/received/HT-7K3QZM",
  booking: "/account/bookings/HT-7K3QZM",
};

/**
 * The example's own controls above every step, drawn apart from the site
 * so nobody takes them for its design: the steps, the booking's trips
 * (the site header carries them in the real flow), signing in and out, the
 * list of situations and starting over.
 */
export function ExampleBar() {
  const pathname = usePathname();
  const router = useRouter();
  const state = useExample();
  const hydrated = useHydrated();
  const step = STEPS.find(([s]) => pathname === STEP_PATHS[s])?.[0];
  const count = hydrated ? state.trips.length : 0;

  function toggleSignIn() {
    update((s) =>
      s.signedIn
        ? { ...s, signedIn: false, contact: { name: "", phone: "", email: "" } }
        : { ...s, signedIn: true, contact: ACCOUNT },
    );
  }

  const pill =
    "inline-flex h-8 items-center rounded-full px-3 text-[0.82rem] font-semibold whitespace-nowrap";

  return (
    <div className="mb-8 rounded-2xl border-2 border-dashed border-orange-400 bg-orange-50/70 px-4 py-3 text-orange-950">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Link
          href="/booking-example"
          className="text-[0.78rem] font-extrabold tracking-[0.18em] text-orange-700 uppercase"
        >
          Booking example
        </Link>
        <nav aria-label="Steps" className="flex flex-wrap gap-1">
          {STEPS.map(([s, label]) => (
            <Link
              key={s}
              href={STEP_PATHS[s]}
              className={`${pill} ${
                s === step
                  ? "bg-orange-600 text-white"
                  : "text-orange-900 hover:bg-orange-100"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex flex-wrap items-center gap-1">
          <Link
            href={STEP_PATHS.confirm}
            className={`${pill} bg-white text-orange-900 ring-1 ring-orange-300`}
          >
            Trips · {count}
          </Link>
          <button
            type="button"
            onClick={toggleSignIn}
            className={`${pill} text-orange-900 hover:bg-orange-100`}
          >
            {hydrated && state.signedIn
              ? "Signed in · sign out"
              : "Signed out · sign in"}
          </button>
          <Link
            href="/booking-example"
            className={`${pill} text-orange-900 hover:bg-orange-100`}
          >
            Situations
          </Link>
          <button
            type="button"
            onClick={() => {
              resetExample();
              router.push("/booking-example");
            }}
            className={`${pill} text-orange-900 hover:bg-orange-100`}
          >
            Start over
          </button>
        </div>
      </div>
      <p className="mt-1.5 text-[0.8rem] text-orange-900/80">
        Sample trips and prices; nothing is saved.
        {step ? (
          <>
            {" "}
            On the site this step is at{" "}
            <code className="rounded bg-white px-1.5 py-0.5 text-[0.75rem]">
              {REAL_PATHS[step]}
            </code>
          </>
        ) : null}
      </p>
    </div>
  );
}
