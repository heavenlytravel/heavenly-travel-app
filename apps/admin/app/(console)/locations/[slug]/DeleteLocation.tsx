"use client";

import { andList, deleteAsksSlug, plural } from "@repo/db";
import type { RoutesIn } from "@repo/db/server";
import { answerOf } from "@repo/ui/action-answer";
import { useConfirm } from "@repo/ui/alert-dialog";
import { Button } from "@repo/ui/button";
import { Field, Input } from "@repo/ui/field";
import { toast } from "@repo/ui/toast";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FormError } from "../../../_components/FormError";
import { errorOf } from "../../../_lib/action-state";
import { deleteLocationAction } from "../actions";

/**
 * What a delete takes from other locations, for the card: "Kuala Lumpur
 * prices 2 routes to its zones", "Kuala Lumpur and Penang price 3 routes
 * to its zones"; and for the dialog: "Kuala Lumpur's 2 routes to them".
 */
function routesInLines(routesIn: RoutesIn, routes: number) {
  const names = routesIn.map((entry) => entry.name);
  return {
    card: `${andList(names)} ${names.length === 1 ? "prices" : "price"} ${plural(routes, "route")} to its zones`,
    dialog: `${andList(names.map((name) => `${name}'s`))} ${plural(routes, "route")} to them`,
  };
}

/**
 * Deletes a location. What goes is said on the card, then asked again in
 * an alert dialog before anything is deleted. One that has never been
 * live, and that no other location prices routes to, needs nothing more:
 * nothing of it was public and nothing beyond it changes. Otherwise the
 * button works only once the admin has typed the location's slug: a
 * public address breaks, or other locations' routes to its zones, such as
 * Kuala Lumpur's to Selangor's KLIA, go with it. The server refuses a
 * delete that would take routes from a location the card did not name. A
 * deleted location opens the list.
 */
export function DeleteLocation({
  locationId,
  name,
  slug,
  hasBeenLive,
  routesIn,
}: {
  locationId: string;
  name: string;
  slug: string;
  hasBeenLive: boolean;
  /** The other locations that price routes to its zones. */
  routesIn: RoutesIn;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [dialog, confirm] = useConfirm();
  const routes = routesIn.reduce((sum, entry) => sum + entry.routes, 0);
  const asksSlug = deleteAsksSlug(hasBeenLive, routes);
  const elsewhere =
    routesIn.length > 0 ? routesInLines(routesIn, routes) : null;

  async function remove() {
    const goes = elsewhere
      ? `Its pages, saved addresses, zones and rates are deleted with it, and ${elsewhere.dialog}.`
      : "Its pages, saved addresses, zones and rates are deleted with it.";
    if (
      !(await confirm({
        title: `Delete ${name}?`,
        description: `${goes} This cannot be undone.`,
        action: "Delete location",
        danger: true,
      }))
    ) {
      return;
    }
    startTransition(async () => {
      const answer = await answerOf(
        deleteLocationAction(
          locationId,
          asksSlug ? typed : null,
          routesIn.map((entry) => entry.locationId),
        ),
      );
      const refused = errorOf(answer);
      setError(refused);
      if (refused) {
        // Another location may have priced a route here since: the card
        // reads what the delete takes again, and keeps what was typed.
        router.refresh();
        return;
      }
      toast.success(`Deleted ${name}.`);
      if (answer && "href" in answer) router.push(answer.href);
    });
  }

  return (
    <div className="grid gap-3">
      {hasBeenLive ? (
        <div className="grid gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-900">
          <p>
            This location is public at /{slug}. Deleting it turns that address
            into “page not found”: every link to it breaks, search engines drop
            it, and its ranking is not given back if the location is added
            again.
          </p>
          <p>
            To stop selling it for a while, pause it instead. Delete it only to
            remove it for good, or to put a wrong slug right by adding the
            location again. Its pages, saved addresses, zones and rates are
            deleted with it, and this cannot be undone.
          </p>
        </div>
      ) : (
        <p className="text-sm text-neutral-600">
          This location has never been live, so nothing public is lost. Its
          pages, saved addresses, zones and rates are deleted with it. To try
          something out, keep a location in draft and use Preview: a draft is
          never public.
        </p>
      )}
      {elsewhere ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-900">
          <p>
            {elsewhere.card}. Those routes go too:{" "}
            {routesIn.length === 1 ? "its rate grid" : "their rate grids"} lose
            them, and{" "}
            {routesIn.length === 1
              ? "it no longer sells"
              : "they no longer sell"}{" "}
            those trips.
          </p>
        </div>
      ) : null}
      {asksSlug ? (
        <Field label={`Type ${slug} to confirm`} className="max-w-xs">
          <Input
            aria-label="Slug of the location to delete"
            autoComplete="off"
            spellCheck={false}
            value={typed}
            onChange={(event) => {
              setTyped(event.target.value);
              setError(null);
            }}
          />
        </Field>
      ) : null}
      <div>
        <Button
          variant="danger"
          size="sm"
          disabled={pending || (asksSlug && typed !== slug)}
          onClick={remove}
        >
          {pending ? "Deleting…" : "Delete location"}
        </Button>
      </div>
      <FormError error={error} size="xs" />
      {dialog}
    </div>
  );
}
