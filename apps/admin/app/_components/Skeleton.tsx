import { cx } from "@repo/ui/cx";
import { Suspense, type ReactNode } from "react";
import { Card } from "./Card";
import { Table, TBody, Td, Th, THead } from "./Table";

/**
 * How long a page is held back for data that is nearly there. React keeps a
 * skeleton it has shown on screen for about 300 ms, so one shown for data
 * that was 20 ms away would make a fast page slower.
 */
const GRACE_MS = 150;

/** Resolves when the promise settles or the time is up, whichever is first. */
function settledWithin(promise: Promise<unknown>, ms: number) {
  return new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms);
    const done = () => {
      clearTimeout(timer);
      resolve();
    };
    promise.then(done, done);
  });
}

/**
 * How a console page loads. The page checks access and renders its heading;
 * the part that waits on the database is a function given to `Streamed`,
 * with a skeleton of its shape. Data that arrives within the grace goes out
 * with the heading, as one page. Slower data leaves the heading and the
 * skeleton on screen until it arrives. The shapes below are the console's
 * own: the table, the card of rows, the detail grid and the form. See
 * docs/261005-admin-loading.md.
 */
export async function Streamed({
  fallback,
  children,
}: {
  /** The shape of what is loading, built from the skeletons below. */
  fallback: ReactNode;
  /** Reads the data and renders it. Called once, here. */
  children: () => Promise<ReactNode>;
}) {
  const content = children();
  await settledWithin(content, GRACE_MS);
  return (
    <Suspense
      fallback={
        <div
          role="status"
          aria-label="Loading"
          className="motion-safe:animate-pulse"
        >
          {fallback}
        </div>
      }
    >
      <Loaded content={content} />
    </Suspense>
  );
}

async function Loaded({ content }: { content: Promise<ReactNode> }) {
  return content;
}

/** One grey bar in place of a line of text. The class gives its size. */
export function Bone({ className }: { className: string }) {
  return <span className={cx("block rounded bg-neutral-200", className)} />;
}

/** A `PageHeader` whose title is the record's name, so it loads with it. */
export function HeaderSkeleton() {
  return (
    <div>
      <Bone className="h-8 w-56" />
      <Bone className="mt-1 h-5 w-80 max-w-full" />
    </div>
  );
}

/** The back link above a page, where it names the record. */
export function BackLinkSkeleton() {
  return <Bone className="mb-4 h-5 w-32" />;
}

const CELL_WIDTHS = ["w-16", "w-24", "w-20", "w-14", "w-12", "w-10"];

export function TableSkeleton({
  columns,
  rows = 6,
}: {
  columns: number;
  rows?: number;
}) {
  const cells = Array.from({ length: columns }, (_, i) => i);
  return (
    <Table>
      <THead>
        {cells.map((cell) => (
          <Th key={cell}>
            <Bone className="h-4 w-14" />
          </Th>
        ))}
      </THead>
      <TBody>
        {Array.from({ length: rows }, (_, row) => (
          <tr key={row}>
            {cells.map((cell) => (
              <Td key={cell}>
                <Bone
                  className={cx(
                    "my-0.5 h-4",
                    CELL_WIDTHS[(row + cell) % CELL_WIDTHS.length],
                  )}
                />
              </Td>
            ))}
          </tr>
        ))}
      </TBody>
    </Table>
  );
}

/** Label and value lines, as `Rows` lays them out. */
export function RowsSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="divide-y divide-neutral-100">
      {Array.from({ length: rows }, (_, row) => (
        <div key={row} className="flex justify-between gap-6 py-2.5">
          <Bone className="h-4 w-20" />
          <Bone className={cx("h-4", row % 2 ? "w-24" : "w-32")} />
        </div>
      ))}
    </div>
  );
}

/** A card with a title and lines. */
export function CardSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <Card>
      <Bone className="mb-3 h-6 w-28" />
      <RowsSkeleton rows={rows} />
    </Card>
  );
}

/** The detail pages' grid: the record on the left, a narrow column beside it. */
export function DetailSkeleton({
  main,
  side,
}: {
  main: ReactNode;
  side: ReactNode;
}) {
  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px] lg:items-start">
      <div className="grid gap-6">{main}</div>
      <div className="grid gap-6">{side}</div>
    </div>
  );
}

/** A form: cards of labelled fields, then its button. */
export function FormSkeleton({
  sections = 1,
  fields = 4,
}: {
  sections?: number;
  fields?: number;
}) {
  return (
    <div className="grid gap-6">
      {Array.from({ length: sections }, (_, section) => (
        <Card key={section} className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: fields }, (_, field) => (
            <div key={field}>
              <Bone className="mb-1.5 h-4 w-24" />
              <Bone className="h-10 w-full rounded-md" />
            </div>
          ))}
        </Card>
      ))}
      <Bone className="h-10 w-28 rounded-md" />
    </div>
  );
}
