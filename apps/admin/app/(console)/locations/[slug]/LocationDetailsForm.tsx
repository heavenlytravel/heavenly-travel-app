"use client";

import { LOCATION_LIMITS } from "@repo/db";
import { Button } from "@repo/ui/button";
import { Field, Input } from "@repo/ui/field";
import { useState } from "react";
import { FormError } from "../../../_components/FormError";
import { useActionForm } from "../../../_lib/use-action-form";
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
  const { pending, error, formProps } = useActionForm(updateLocationAction, {
    done: "Details saved.",
  });
  const [name, setName] = useState(location.name);
  const [slug, setSlug] = useState(location.slug);
  const [stateCodes, setStateCodes] = useState(location.stateCodes);

  return (
    <form {...formProps} className="grid gap-4">
      <input type="hidden" name="id" value={location.id} />
      <input type="hidden" name="previousSlug" value={location.slug} />
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
        {error ? (
          <FormError error={error} />
        ) : stateCodes.length === 0 ? (
          <p className="text-sm text-slate-500">Tick at least one state.</p>
        ) : null}
      </div>
    </form>
  );
}
