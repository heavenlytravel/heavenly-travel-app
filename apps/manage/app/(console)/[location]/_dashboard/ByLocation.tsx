import Link from "next/link";
import {
  LOCATION_STATE_LABELS,
  locationStateOf,
  plural,
  setupProgress,
  setupSteps,
} from "@repo/db";
import type { LocationOverview } from "@repo/db/server";
import { CARD_LINK, Card, CardRows, CardTitle } from "@repo/console/Card";
import { LocationMark } from "@repo/console/LocationMark";
import { NEW_LOCATION_PATH, dashboardHref } from "../../../_lib/routes";
import { SetupBar } from "../settings/SetupBar";
import { ActionRow } from "./ActionRow";

/** Every location in the scope, a row each with its state and its day, opening its own dashboard. */
export function ByLocation({
  overviews,
  mayAdd,
}: {
  overviews: readonly LocationOverview[];
  /** The admin adds locations: an empty list offers it. */
  mayAdd: boolean;
}) {
  return (
    <Card flush className="overflow-hidden">
      <CardTitle inset>By location</CardTitle>
      {overviews.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-muted">
          No locations yet.{" "}
          {mayAdd ? (
            <Link href={NEW_LOCATION_PATH} className={CARD_LINK}>
              Add the first one
            </Link>
          ) : null}
        </p>
      ) : (
        <CardRows>
          {overviews.map((overview) => (
            <LocationRow key={overview.id} overview={overview} />
          ))}
        </CardRows>
      )}
    </Card>
  );
}

/** One location: its mark and name, its state and size, and its day, or how far a draft's setup has come. */
function LocationRow({ overview }: { overview: LocationOverview }) {
  const state = locationStateOf(overview.state);
  const progress =
    state === "draft"
      ? setupProgress(setupSteps(overview.pages, overview))
      : null;
  return (
    <ActionRow
      href={dashboardHref(overview.slug)}
      mark={<LocationMark name={overview.name} state={state} size="lg" />}
      title={overview.name}
      line={[
        LOCATION_STATE_LABELS[state],
        progress
          ? progress.next
            ? `Next: ${progress.next.title}`
            : "Ready to go live"
          : null,
        progress ? null : plural(overview.zones, "zone"),
        progress ? null : plural(overview.vehicles, "vehicle"),
      ]
        .filter((part) => part !== null)
        .join(" · ")}
      end={
        progress ? (
          <span className="grid shrink-0 justify-items-end gap-1.5 text-[12.5px] text-muted tabular-nums">
            {progress.done} of {progress.total} set up
            <SetupBar
              done={progress.done}
              total={progress.total}
              className="w-20"
            />
          </span>
        ) : (
          <span className="shrink-0 text-right tabular-nums">
            <span className="block text-sm font-semibold text-ink">
              {overview.pickupsToday} today
            </span>
            <span className="block text-[12.5px] whitespace-nowrap text-muted max-sm:hidden">
              {overview.awaitingConfirmation} received ·{" "}
              {overview.awaitingDriver} awaiting a driver
            </span>
          </span>
        )
      }
    />
  );
}
