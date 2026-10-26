"use client";

import { PAGE_STATUS_LABELS, type PageStatus } from "@repo/db";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  FilesIcon,
  PencilIcon,
  SearchIcon,
} from "@repo/ui/icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useEffectEvent,
  useId,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { flushSync } from "react-dom";
import { focus } from "../(site)/_components/Page";

/** Where a page stands, as its dot shows it: its status, or paused, a class's page while the class is off sale there. */
export type PreviewStanding = PageStatus | "paused";

/** A page the picker links to. */
export type PreviewPage = {
  href: string;
  name: string;
  standing: PreviewStanding;
  /** The page shown. */
  current: boolean;
};

/** A page in the picker with the pages under it, which it lists indented. */
export type PreviewGroup = PreviewPage & { children: PreviewPage[] };

const STANDINGS: Record<PreviewStanding, { label: string; dot: string }> = {
  published: { label: PAGE_STATUS_LABELS.published, dot: "bg-emerald-500" },
  changed: { label: PAGE_STATUS_LABELS.changed, dot: "bg-amber-500" },
  unpublished: { label: PAGE_STATUS_LABELS.unpublished, dot: "bg-slate-400" },
  paused: { label: "Paused: the class is off here", dot: "bg-orange-500" },
};

/** A button or link on the pill. */
const pillButton = `inline-flex min-h-[36px] shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3 font-semibold hover:bg-white/10 ${focus}`;

function Dot({ standing }: { standing: PreviewStanding }) {
  return (
    <span
      aria-hidden="true"
      className={`size-2 shrink-0 rounded-full ${STANDINGS[standing].dot}`}
    />
  );
}

/**
 * What a staff preview floats over the page, which is otherwise as the
 * public sees it: a dark pill at the foot of the window saying it is a
 * preview, the page shown and where it stands, "Pages", which opens the
 * pages that can be previewed with it, and "Edit", its editor in the
 * console. The pill folds down to a round button. The page ends with room
 * for it, so it never hides the footer. A location's pages and the site's
 * own pages both use it; what it links and where each page stands are
 * worked out on the server. On a phone the pill keeps to the word and the
 * dot; the page's name and standing are in the pages.
 */
export function PreviewBar({
  name,
  standing,
  editHref,
  title,
  note,
  searchLabel,
  groups,
}: {
  /** The page shown: "Sedan", "Terms and conditions". */
  name: string;
  standing: PreviewStanding;
  /** Its editor in the console. */
  editHref: string;
  /** The heading of the pages: "Pages of Langkawi". */
  title: string;
  /** Beside the heading: the location's state, "Live". */
  note?: string;
  /** What the search box says: "Find a page of Langkawi". */
  searchLabel: string;
  groups: PreviewGroup[];
}) {
  const [open, setOpen] = useState(false);
  const [folded, setFolded] = useState(false);
  const root = useRef<HTMLElement>(null);
  const pagesButton = useRef<HTMLButtonElement>(null);
  const foldButton = useRef<HTMLButtonElement>(null);
  const unfoldButton = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  const close = () => {
    setOpen(false);
    pagesButton.current?.focus();
  };
  const onEscape = useEffectEvent(close);

  // While the pages are open, Escape closes them, and so does a click
  // outside the pill and the pages, which leaves the focus where it lands.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onEscape();
    };
    const onPointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  // The button that takes the place of the one pressed keeps the focus.
  const fold = (to: boolean) => {
    flushSync(() => {
      setFolded(to);
      setOpen(false);
    });
    (to ? unfoldButton : foldButton).current?.focus();
  };

  const { label } = STANDINGS[standing];
  return (
    <>
      {/* Room at the foot of the page for the pill, continuing the footer's last band. */}
      <div aria-hidden="true" className="h-20 bg-ink" />
      <aside
        ref={root}
        aria-label="Preview"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex flex-col items-center gap-2 px-3 text-[0.85rem] text-white"
      >
        {open && (
          <PagePicker
            id={panelId}
            title={title}
            note={note}
            searchLabel={searchLabel}
            groups={groups}
            onChoose={close}
          />
        )}
        {folded ? (
          <button
            ref={unfoldButton}
            type="button"
            aria-label={`Show the preview bar: ${name}, ${label}`}
            onClick={() => fold(false)}
            className={`pointer-events-auto relative flex size-11 cursor-pointer items-center justify-center rounded-full bg-ink shadow-lg ring-1 shadow-ink/30 ring-white/15 hover:bg-navy ${focus}`}
          >
            <ChevronUpIcon className="size-5" />
            <span className="absolute top-1.5 right-1.5 flex rounded-full ring-2 ring-ink">
              <Dot standing={standing} />
            </span>
          </button>
        ) : (
          <div className="pointer-events-auto flex max-w-full items-center gap-1 rounded-full bg-ink py-1 pr-1 pl-4 shadow-lg ring-1 shadow-ink/30 ring-white/15">
            <p className="flex min-w-0 items-center gap-2.5 pr-1">
              <strong className="shrink-0 text-[0.75rem] tracking-[0.16em] uppercase">
                Preview
              </strong>
              <span className="max-w-[16rem] min-w-0 truncate font-semibold max-sm:sr-only">
                {name}
              </span>
              <span className="flex shrink-0 items-center gap-1.5 text-white/85">
                <Dot standing={standing} />
                <span className="whitespace-nowrap max-sm:sr-only">
                  {label}
                </span>
              </span>
            </p>
            <span aria-hidden="true" className="mx-1 h-5 w-px bg-white/20" />
            <button
              ref={pagesButton}
              type="button"
              aria-expanded={open}
              aria-controls={open ? panelId : undefined}
              onClick={() => setOpen(!open)}
              className={`${pillButton} aria-expanded:bg-white/15`}
            >
              <FilesIcon className="max-sm:hidden" />
              Pages
            </button>
            <a href={editHref} className={pillButton}>
              <PencilIcon className="max-sm:hidden" />
              Edit
            </a>
            <button
              ref={foldButton}
              type="button"
              aria-label="Fold the preview bar"
              onClick={() => fold(true)}
              className={`${pillButton} px-2`}
            >
              <ChevronDownIcon className="size-5" />
            </button>
          </div>
        )}
      </aside>
    </>
  );
}

/** A page's row in the picker; its outline is drawn inside, as the list clips it. */
const pickerRow =
  "flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 hover:bg-white/10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-azure-light aria-[current=page]:bg-brand aria-[current=page]:font-semibold";

/**
 * The pages that can be previewed with the one shown, above the pill,
 * nearly as wide as a phone and scrolling inside when long: a search box,
 * focused as it opens, that keeps the pages whose name holds what is
 * typed, each with the page it is under; Enter opens the first. Each page
 * has its dot, and the page shown is marked.
 */
function PagePicker({
  id,
  title,
  note,
  searchLabel,
  groups,
  onChoose,
}: {
  id: string;
  title: string;
  note?: string;
  searchLabel: string;
  groups: PreviewGroup[];
  onChoose: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const search = useRef<HTMLInputElement>(null);
  const titleId = useId();

  useEffect(() => {
    search.current?.focus();
  }, []);

  const words = query.trim().toLowerCase();
  const matches = (page: PreviewPage) =>
    page.name.toLowerCase().includes(words);
  const shown = groups.flatMap((group) => {
    const children = group.children.filter(matches);
    return matches(group) || children.length > 0
      ? [{ ...group, children }]
      : [];
  });

  const openFirst = (event: FormEvent) => {
    event.preventDefault();
    if (words === "") return;
    const first = shown
      .flatMap((group) => [group, ...group.children])
      .find(matches);
    if (!first) return;
    router.push(first.href);
    onChoose();
  };

  const row = (page: PreviewPage) => (
    <Link
      href={page.href}
      aria-current={page.current ? "page" : undefined}
      onNavigate={onChoose}
      className={pickerRow}
    >
      <span title={STANDINGS[page.standing].label} className="flex">
        <Dot standing={page.standing} />
      </span>
      <span className="min-w-0 truncate">{page.name}</span>
      <span className="sr-only">, {STANDINGS[page.standing].label}</span>
    </Link>
  );

  return (
    <div
      id={id}
      className="pointer-events-auto flex max-h-[min(34rem,calc(100dvh-6rem))] w-full max-w-[26rem] flex-col overflow-hidden rounded-2xl bg-ink shadow-2xl ring-1 shadow-ink/40 ring-white/15"
    >
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <h2 id={titleId} className="truncate text-[0.95rem] font-bold">
          {title}
        </h2>
        {note && (
          <span className="shrink-0 rounded-full bg-white/10 px-2.5 py-0.5 text-[0.75rem] font-semibold">
            {note}
          </span>
        )}
      </div>
      <form role="search" onSubmit={openFirst} className="px-3 pt-3">
        <label className="relative block">
          <span className="sr-only">{searchLabel}</span>
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-white/60" />
          <input
            ref={search}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchLabel}
            autoComplete="off"
            className="w-full rounded-xl bg-white/10 py-2 pr-3 pl-9 text-[0.9rem] text-white placeholder:text-white/55 focus-visible:outline-2 focus-visible:outline-azure-light"
          />
        </label>
      </form>
      <nav
        aria-labelledby={titleId}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2"
      >
        {shown.length > 0 ? (
          <ul className="grid gap-0.5">
            {shown.map((group) => (
              <li key={group.href}>
                {row(group)}
                {group.children.length > 0 && (
                  <ul className="mt-0.5 ml-[1.1rem] grid gap-0.5 border-l border-white/15 pl-2">
                    {group.children.map((page) => (
                      <li key={page.href}>{row(page)}</li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-2.5 py-6 text-center text-white/70">
            No page matches “{query.trim()}”.
          </p>
        )}
      </nav>
    </div>
  );
}
