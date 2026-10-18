import { cx } from "@repo/ui/cx";
import { SidebarPanel } from "@repo/ui/sidebar";
import { Suspense, type ComponentProps, type ReactNode } from "react";
import { Card, Frame, TileGrid } from "./Card";
import { DetailColumns } from "./PageColumn";
import { WhenCollapsed, WhenExpanded } from "./PanelVisibility";
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
      <Bone className="mb-5 h-7 w-32" />
      <RowsSkeleton rows={rows} />
    </Card>
  );
}

/** A grid of tiles, each with its picture when `image`, as `TileGrid` lays them out. */
export function TileGridSkeleton({
  tiles = 3,
  image = true,
  min,
}: {
  tiles?: number;
  image?: boolean;
  min?: ComponentProps<typeof TileGrid>["min"];
}) {
  return (
    <TileGrid min={min}>
      {Array.from({ length: tiles }, (_, tile) => (
        <li key={tile}>
          <Frame className="overflow-hidden">
            {image ? (
              <Bone className="aspect-[16/9] w-full rounded-none" />
            ) : null}
            <div className="grid gap-2.5 p-4">
              <Bone className="h-5 w-28" />
              <Bone className="h-4 w-40" />
              <Bone className="h-9 w-full" />
            </div>
          </Frame>
        </li>
      ))}
    </TileGrid>
  );
}

/** The detail pages' columns: the record on the left, a narrow column beside it. */
export function DetailSkeleton({
  main,
  side,
}: {
  main: ReactNode;
  side: ReactNode;
}) {
  return <DetailColumns main={main} side={side} />;
}

/**
 * The panel beside a location's page while the location loads: its header
 * line and the two-line rows of its sections. `title` and `placement` are
 * the panel's own, so the skeleton stands exactly where it will.
 */
export function PanelSkeleton({
  title,
  placement,
}: {
  title: string;
  placement: string;
}) {
  return (
    <SidebarPanel title={title} className={placement}>
      <WhenExpanded>
        <div className="flex items-center gap-3 border-b border-neutral-200 p-4">
          <Bone className="size-8 rounded-full" />
          <div className="grid flex-1 gap-1.5">
            <Bone className="h-4 w-28" />
            <Bone className="h-3 w-16" />
          </div>
        </div>
        <div className="grid gap-3 p-4">
          {Array.from({ length: 6 }, (_, row) => (
            <div key={row} className="flex items-center gap-3">
              <Bone className="size-4 rounded-full" />
              <div className="grid flex-1 gap-1.5">
                <Bone className="h-4 w-32" />
                <Bone className="h-3 w-40" />
              </div>
            </div>
          ))}
        </div>
      </WhenExpanded>
      {/* Collapsed to a rail: the marks alone. */}
      <WhenCollapsed>
        <div className="grid justify-items-center gap-3 py-3">
          {Array.from({ length: 7 }, (_, row) => (
            <Bone
              key={row}
              className={row === 0 ? "size-8 rounded-full" : "size-4 rounded"}
            />
          ))}
        </div>
      </WhenCollapsed>
    </SidebarPanel>
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
