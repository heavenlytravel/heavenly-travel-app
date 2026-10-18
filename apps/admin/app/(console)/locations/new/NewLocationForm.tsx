"use client";

import { LOCATION_LIMITS, slugify } from "@repo/db";
import { Button } from "@repo/ui/button";
import { Field, Input } from "@repo/ui/field";
import Link from "next/link";
import { useActionState, useState } from "react";
import { Card } from "../../../_components/Card";
import type { ActionState } from "../../../_lib/action-state";
import { LOCATIONS_PATH } from "../../../_lib/routes";
import { SlugField } from "../_components/SlugField";
import { StatePicker, type StateOption } from "../_components/StatePicker";
import { createLocationAction } from "../actions";

/**
 * The form for a new location: the three things only a person can say. The
 * name comes first and fills the slug until Marketing types its own; then
 * the state it lies in. A saved location opens on its page, as a draft,
 * with the rest of the setup ahead.
 */
export function NewLocationForm({ states }: { states: StateOption[] }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    createLocationAction,
    null,
  );
  // Controlled, so a refused save does not clear what was entered.
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTyped, setSlugTyped] = useState(false);
  const [stateCodes, setStateCodes] = useState<string[]>([]);

  return (
    <form action={action} className="grid gap-6">
      <Card className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name">
            <Input
              name="name"
              required
              autoFocus
              autoComplete="off"
              maxLength={LOCATION_LIMITS.name}
              placeholder="Langkawi"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                if (!slugTyped) {
                  setSlug(
                    slugify(event.target.value).slice(0, LOCATION_LIMITS.slug),
                  );
                }
              }}
            />
          </Field>
          <SlugField
            value={slug}
            onChange={(next) => {
              setSlugTyped(true);
              setSlug(next);
            }}
          />
        </div>
        <StatePicker
          states={states}
          value={stateCodes}
          onChange={setStateCodes}
        />
      </Card>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending || stateCodes.length === 0}>
          {pending ? "Adding…" : "Add location"}
        </Button>
        <Link
          href={LOCATIONS_PATH}
          className="text-sm text-neutral-600 underline-offset-4 hover:underline"
        >
          Cancel
        </Link>
        {state?.error ? (
          <p aria-live="polite" className="text-sm text-red-700">
            {state.error}
          </p>
        ) : stateCodes.length === 0 ? (
          <p className="text-sm text-neutral-500">Tick at least one state.</p>
        ) : null}
      </div>
    </form>
  );
}
