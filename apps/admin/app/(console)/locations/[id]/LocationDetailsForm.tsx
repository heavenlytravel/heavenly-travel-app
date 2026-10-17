"use client";

import { LOCATION_LIMITS } from "@repo/db";
import { Button } from "@repo/ui/button";
import { Field, Input } from "@repo/ui/field";
import { useActionState, useState } from "react";
import type { ActionState } from "../../../_lib/action-state";
import { SlugField } from "../_components/SlugField";
import { StatePicker, type StateOption } from "../_components/StatePicker";
import { updateLocationAction } from "../actions";

/**
 * The name, the slug and the states of one location, saved together. The
 * slug is read-only once the location has been live.
 */
export function LocationDetailsForm({
  location,
  states,
}: {
  location: {
    id: string;
    name: string;
    slug: string;
    stateCodes: string[];
    slugLocked: boolean;
  };
  states: StateOption[];
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
  const [stateCodes, setStateCodes] = useState(location.stateCodes);

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
      <StatePicker
        states={states}
        value={stateCodes}
        onChange={setStateCodes}
      />

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending || stateCodes.length === 0}>
          {pending ? "Saving…" : "Save"}
        </Button>
        {state?.error ? (
          <p aria-live="polite" className="text-sm text-red-700">
            {state.error}
          </p>
        ) : stateCodes.length === 0 ? (
          <p className="text-sm text-neutral-500">Tick at least one state.</p>
        ) : saved ? (
          <p aria-live="polite" className="text-sm text-emerald-700">
            Saved.
          </p>
        ) : null}
      </div>
    </form>
  );
}
