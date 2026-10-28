"use client";

import type { DeleteImpact } from "@repo/db";
import { DeleteButton, ImpactList } from "../../../_components/DeleteButton";
import { deleteLocationAction } from "../actions";

/**
 * Deletes a location. The card says what the delete takes
 * (`locationDeleteImpact`) before it is asked, then the button asks again
 * in an alert dialog. One that has been live, or that other locations
 * price routes to, asks for its slug to be typed there: a public address
 * breaks, or other locations' routes to its zones, such as Kuala Lumpur's
 * to Selangor's KLIA, go with it. A deleted location opens the list.
 */
export function DeleteLocation({
  locationId,
  name,
  slug,
  hasBeenLive,
  impact,
}: {
  locationId: string;
  name: string;
  slug: string;
  hasBeenLive: boolean;
  /** What the delete takes, as the server worked it out. */
  impact: DeleteImpact;
}) {
  return (
    <div className="grid gap-3 text-sm">
      {hasBeenLive ? (
        <div className="grid gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-red-900">
          <p>
            This location is public at /{slug}. Its ranking in search engines is
            not given back if the location is added again.
          </p>
          <p>
            To stop selling it for a while, pause it instead. Delete it only to
            remove it for good, or to put a wrong slug right by adding the
            location again.
          </p>
        </div>
      ) : (
        <p className="text-slate-600">
          This location has never been live, so nothing public is lost. To try
          something out, keep a location in draft and use Preview: a draft is
          never public.
        </p>
      )}
      <div className="grid gap-1 text-slate-700">
        <p className="font-medium text-slate-900">What the delete takes</p>
        <ImpactList impact={impact} />
      </div>
      <DeleteButton
        label="Delete location"
        title={`Delete ${name}?`}
        impact={impact}
        note="This cannot be undone."
        action={(seen, typed) => deleteLocationAction(locationId, seen, typed)}
        doneMessage={`Deleted ${name}.`}
      />
    </div>
  );
}
