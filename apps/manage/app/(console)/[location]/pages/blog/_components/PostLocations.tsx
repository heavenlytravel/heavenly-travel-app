"use client";

import { Card, CardTitle } from "@repo/console/Card";
import { useActionForm } from "@repo/console/use-action-form";
import { Button } from "@repo/ui/button";
import { Checkbox } from "@repo/ui/field";
import { FormError } from "@repo/ui/form-error";
import { InfoTip } from "@repo/ui/info-tip";
import { useState } from "react";
import { setBlogPostLocationsAction } from "../actions";

/** A location as the tags offer it. */
export type TagOption = { id: string; name: string };

/**
 * The locations a post is tagged with, under its editor: a tick for each
 * location, each ticked one listing the post on its blog page. Saved with
 * its own button, at once, apart from the post's draft; a refusal shows at
 * the ticks and keeps them as they were ticked.
 */
export function PostLocations({
  postId,
  locations,
  tagged,
}: {
  postId: string;
  /** Every location, by name. */
  locations: readonly TagOption[];
  /** The ids of the locations it is tagged with. */
  tagged: readonly string[];
}) {
  const [ticked, setTicked] = useState<string[]>([...tagged]);
  const { pending, error, formProps } = useActionForm(
    setBlogPostLocationsAction,
    { done: "Locations saved." },
  );
  const unchanged =
    ticked.length === tagged.length &&
    ticked.every((id) => tagged.includes(id));

  return (
    <Card>
      <CardTitle description="Each location ticked lists the post on its blog page and its main page. Saved at once, apart from the draft.">
        Locations
      </CardTitle>
      <form {...formProps} className="grid gap-4">
        <input type="hidden" name="postId" value={postId} />
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium text-body">
            <span className="inline-flex items-center gap-1.5">
              Tagged with
              <InfoTip text="A post with no location is on the blog alone." />
            </span>
          </legend>
          {locations.length === 0 ? (
            <p className="text-sm text-muted">No location yet.</p>
          ) : (
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
              {locations.map((location) => (
                <label
                  key={location.id}
                  className="flex items-center gap-2 text-sm"
                >
                  <Checkbox
                    name="locationIds"
                    value={location.id}
                    checked={ticked.includes(location.id)}
                    onChange={(event) =>
                      setTicked(
                        event.target.checked
                          ? [...ticked, location.id]
                          : ticked.filter((id) => id !== location.id),
                      )
                    }
                  />
                  {location.name}
                </label>
              ))}
            </div>
          )}
        </fieldset>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="submit"
            variant="secondary"
            disabled={unchanged}
            pending={pending}
          >
            {pending ? "Saving…" : "Save Locations"}
          </Button>
          <FormError error={error} />
        </div>
      </form>
    </Card>
  );
}
