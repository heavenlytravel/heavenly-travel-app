"use client";

import { LOCATION_LIMITS } from "@repo/db";
import { Button } from "@repo/ui/button";
import { Field, Input } from "@repo/ui/field";
import { InfoTip } from "@repo/ui/info-tip";
import { useActionState, useState } from "react";
import type { ActionState } from "../../../_lib/action-state";
import { LocationPlaceField } from "../_components/LocationPlaceField";
import { SlugField } from "../_components/SlugField";
import { updateLocationAction } from "../actions";

/**
 * The name, the slug, the tagline and the place of one location, saved
 * together. The slug is read-only once the location has been live. Picking
 * another place moves the pin and its district with it.
 */
export function LocationDetailsForm({
  location,
  hasGoogle,
}: {
  location: {
    id: string;
    name: string;
    slug: string;
    tagline: string | null;
    slugLocked: boolean;
    /** Null when the stored place cannot be read. */
    place: { placeId: string; label: string } | null;
  };
  hasGoogle: boolean;
}) {
  const [saved, setSaved] = useState(false);
  const [state, action, pending] = useActionState<ActionState, FormData>(
    async (previous, formData) => {
      const result = await updateLocationAction(previous, formData);
      setSaved(result === null);
      return result;
    },
    null,
  );
  // Controlled, so a refused save does not put the stored values back.
  const [name, setName] = useState(location.name);
  const [slug, setSlug] = useState(location.slug);
  const [tagline, setTagline] = useState(location.tagline ?? "");

  return (
    <form
      action={action}
      className="grid gap-4"
      onChange={() => setSaved(false)}
    >
      <input type="hidden" name="id" value={location.id} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name">
          <Input
            name="name"
            required
            autoComplete="off"
            maxLength={LOCATION_LIMITS.name}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </Field>
        <SlugField
          value={slug}
          onChange={setSlug}
          locked={location.slugLocked}
        />
      </div>
      <Field
        label={
          <span className="inline-flex items-center gap-1.5">
            Tagline
            <InfoTip text="The short line under the name on a home page card." />
          </span>
        }
      >
        <Input
          name="tagline"
          autoComplete="off"
          maxLength={LOCATION_LIMITS.tagline}
          value={tagline}
          onChange={(event) => setTagline(event.target.value)}
        />
      </Field>
      <LocationPlaceField
        key={location.place?.placeId}
        current={location.place ?? undefined}
        hasGoogle={hasGoogle}
      />

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
        {state?.error ? (
          <p aria-live="polite" className="text-sm text-red-700">
            {state.error}
          </p>
        ) : saved ? (
          <p aria-live="polite" className="text-sm text-emerald-700">
            Saved.
          </p>
        ) : null}
      </div>
    </form>
  );
}
