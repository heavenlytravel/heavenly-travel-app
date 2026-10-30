import type { PageImage } from "@repo/db";
import Image from "next/image";

/**
 * The hero's right side: a photo, the page's hero image or the chauffeur's,
 * behind a phone showing Connect's home as a vendor sees it: a new offer
 * with its timer and its pay, a trip under way, one done. An example, drawn
 * here, with no one's real trip in it; hidden from screen readers, which
 * the hero's words already tell.
 */
export function PhoneShowcase({ image }: { image: PageImage | null }) {
  return (
    <div aria-hidden className="relative mx-auto w-full max-w-md lg:mr-0">
      <div className="absolute top-10 left-0 hidden h-56 w-52 overflow-hidden rounded-card shadow-overlay ring-1 ring-white/10 sm:block">
        <Image
          src={image?.url ?? "/brand/chauffeur.jpg"}
          alt=""
          width={image?.width ?? 600}
          height={image?.height ?? 600}
          className="h-full w-full object-cover"
        />
      </div>
      <div className="relative ml-auto w-64 rounded-[2.25rem] bg-ink p-2.5 shadow-overlay ring-1 ring-white/15 sm:w-72">
        <div className="overflow-hidden rounded-[1.75rem] bg-mist">
          <div className="bg-band px-4 pt-5 pb-8 text-white">
            <p className="text-[0.6rem] font-bold tracking-kicker text-azure-light uppercase">
              Good morning
            </p>
            <p className="font-serif text-lg">Langkawi Cars</p>
          </div>
          <div className="-mt-5 grid gap-2.5 px-3 pb-4">
            <div className="rounded-control bg-white p-3 shadow-card">
              <div className="flex items-center justify-between">
                <span className="text-[0.6rem] font-bold tracking-kicker text-muted uppercase">
                  New offer
                </span>
                <span className="rounded-full bg-warning-soft px-2 py-0.5 text-[0.6rem] font-semibold text-warning">
                  Answer 1:42
                </span>
              </div>
              <p className="mt-1.5 text-sm font-semibold text-ink">
                Airport → Pantai Cenang
              </p>
              <p className="text-[0.65rem] text-muted">
                Sat 7 Nov · 9:30 AM · MPV · 5 pax
              </p>
              <div className="mt-2.5 flex items-end justify-between">
                <span className="grid">
                  <span className="text-[0.6rem] text-muted">We pay</span>
                  <span className="font-serif text-xl text-ink">RM 85</span>
                </span>
                <span className="rounded-control bg-brand px-3 py-1.5 text-xs font-semibold text-white">
                  Accept
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2.5 rounded-control bg-white p-3 shadow-card">
              <span className="grid size-7 place-items-center rounded-full bg-azure-light text-[0.6rem] font-bold text-ink">
                HZ
              </span>
              <span className="grid min-w-0 flex-1">
                <span className="truncate text-xs font-semibold text-ink">
                  Hafiz · KV 5891 E
                </span>
                <span className="text-[0.6rem] text-muted">
                  Today 2:00 PM · Kuah Jetty
                </span>
              </span>
              <span className="rounded-full bg-navy/10 px-2 py-0.5 text-[0.6rem] font-semibold text-navy">
                On the way
              </span>
            </div>
            <div className="flex items-center gap-2.5 rounded-control bg-white p-3 shadow-card">
              <span className="grid size-7 place-items-center rounded-full bg-success-tint text-xs text-success">
                ✓
              </span>
              <span className="grid">
                <span className="text-xs font-semibold text-ink">
                  Datai → Airport
                </span>
                <span className="text-[0.6rem] text-muted">
                  Done · 11:05 AM
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
