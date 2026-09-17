import Link from "next/link";
import type { Design, DesignEntry } from "../_lib/designs";
import { FONT_CLASS } from "./fonts";

export function EntryLink({
  entry,
  className,
  children,
}: {
  entry: DesignEntry;
  className: string;
  children: React.ReactNode;
}) {
  return entry.external ? (
    <a
      href={entry.href}
      className={className}
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  ) : (
    <Link href={entry.href} className={className}>
      {children}
    </Link>
  );
}

const ROWS: { label: string; cell: (d: Design) => React.ReactNode }[] = [
  {
    label: "Palette",
    cell: (d) => (
      <div className="flex gap-1">
        {d.palette.map((s) => (
          <span
            key={s.hex}
            title={`${s.name} ${s.hex}`}
            className="h-5 w-5 rounded-sm ring-1 ring-black/10"
            style={{ backgroundColor: s.hex }}
          />
        ))}
      </div>
    ),
  },
  {
    label: "Display font",
    cell: (d) => (
      <span className={`${FONT_CLASS[d.display.key]} text-base`}>
        {d.display.family}
      </span>
    ),
  },
  {
    label: "Body font",
    cell: (d) => (
      <span className={`${FONT_CLASS[d.body.key]} text-base`}>
        {d.body.family}
      </span>
    ),
  },
  { label: "Hero", cell: (d) => d.hero },
  { label: "Imagery", cell: (d) => d.imagery },
  { label: "Shape", cell: (d) => d.shape },
  { label: "Motion", cell: (d) => d.motion },
  { label: "Voice", cell: (d) => d.voice },
  {
    label: "Worth lifting",
    cell: (d) => <span className="font-medium">{d.lift}</span>,
  },
];

/** Side-by-side trait table; scrolls sideways when the entries do not fit. */
export function DesignTable({
  entries,
  caption,
  minWidth,
}: {
  entries: DesignEntry[];
  caption: string;
  /** Any CSS length; keeps each column readable before scrolling kicks in. */
  minWidth: string;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-200">
      <table className="w-full text-left text-sm" style={{ minWidth }}>
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-neutral-50 text-neutral-600">
          <tr>
            <th scope="col" className="w-28 px-4 py-3 font-medium">
              Trait
            </th>
            {entries.map((e) => (
              <th
                key={e.id}
                scope="col"
                className={`px-4 py-3 font-medium ${
                  e.external ? "border-l border-neutral-200" : ""
                }`}
              >
                <EntryLink
                  entry={e}
                  className="text-neutral-900 underline-offset-4 hover:underline"
                >
                  {e.title}
                </EntryLink>
                <span className="block text-xs font-normal">
                  {e.design.label}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200 align-top">
          {ROWS.map((row) => (
            <tr key={row.label}>
              <th
                scope="row"
                className="bg-neutral-50 px-4 py-3 font-medium text-neutral-600"
              >
                {row.label}
              </th>
              {entries.map((e) => (
                <td
                  key={e.id}
                  className={`px-4 py-3 text-neutral-700 ${
                    e.external ? "border-l border-neutral-200" : ""
                  }`}
                >
                  {row.cell(e.design)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DesignCard({
  entry,
  children,
}: {
  entry: DesignEntry;
  /** Optional extra content between the subtitle and the palette. */
  children?: React.ReactNode;
}) {
  const d = entry.design;
  return (
    <article className="rounded-2xl border border-neutral-200 p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h3 className="text-xl font-semibold">
          {entry.title} · {d.label}
        </h3>
        <EntryLink
          entry={entry}
          className="text-sm font-medium underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          {entry.external ? "Open site" : "Open page"}
        </EntryLink>
      </div>
      <p className="mt-1 text-sm text-neutral-500">{entry.subtitle}</p>
      {children}

      <ul className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {d.palette.map((s) => (
          <li key={s.hex} className="text-xs">
            <div
              className="h-10 rounded-md ring-1 ring-black/10"
              style={{ backgroundColor: s.hex }}
            />
            <p className="mt-1.5 font-medium">{s.name}</p>
            <p className="font-mono text-neutral-500">{s.hex}</p>
            <p className="text-neutral-600">{s.role}</p>
          </li>
        ))}
      </ul>

      <div className="mt-5 rounded-lg bg-neutral-50 p-4">
        <p
          className={`${FONT_CLASS[d.display.key]} text-2xl leading-tight tracking-tight`}
        >
          A better way to get away.
        </p>
        <p className="mt-1 text-xs text-neutral-500">
          {d.display.family}, {d.display.note}
        </p>
        <p className={`${FONT_CLASS[d.body.key]} mt-3 text-base`}>
          Coach charter and cars with driver, wherever you are in Malaysia.
        </p>
        <p className="mt-1 text-xs text-neutral-500">
          {d.body.family}, {d.body.note}
        </p>
      </div>

      <dl className="mt-5 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-[6rem_1fr]">
        <dt className="text-neutral-500">Hero</dt>
        <dd>{d.hero}</dd>
        <dt className="text-neutral-500">Imagery</dt>
        <dd>{d.imagery}</dd>
        <dt className="text-neutral-500">Shape</dt>
        <dd>{d.shape}</dd>
        <dt className="text-neutral-500">Motion</dt>
        <dd>{d.motion}</dd>
        <dt className="text-neutral-500">Voice</dt>
        <dd>{d.voice}</dd>
        <dt className="text-neutral-500">Worth lifting</dt>
        <dd className="font-medium">{d.lift}</dd>
      </dl>
    </article>
  );
}
